import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './CronForm.css';

type ScheduleStatus = 'ACTIVE' | 'PAUSED';

type ScheduleItem = {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string | null;
  description: string | null;
  status: ScheduleStatus;
  isActive: boolean;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScheduleForm = {
  name: string;
  description: string;
  timezone: string;
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
};

const API_BASE_URL = 'http://localhost:3003/scheduler';
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const initialForm: ScheduleForm = {
  name: '',
  description: '',
  timezone: DEFAULT_TIMEZONE,
  minute: '*',
  hour: '*',
  day: '*',
  month: '*',
  weekday: '*',
};

function CronForm() {
  const [form, setForm] = useState<ScheduleForm>(initialForm);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextRunAt, setNextRunAt] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    void loadSchedules();
  }, []);

  const normalizeCronField = (value: string) => {
    const trimmedValue = value.trim();
    const stepMatch = trimmedValue.match(/^\*(\d+)$/);

    return stepMatch ? `*/${stepMatch[1]}` : trimmedValue || '*';
  };

  const cronExpression = [
    form.minute,
    form.hour,
    form.day,
    form.month,
    form.weekday,
  ]
    .map(normalizeCronField)
    .join(' ');

  const isEditing = selectedId !== null;

  function setFormField<Key extends keyof ScheduleForm>(key: Key, value: ScheduleForm[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFeedback() {
    setError('');
    setSuccessMessage('');
  }

  function resetForm() {
    setForm(initialForm);
    setSelectedId(null);
    setNextRunAt('');
    resetFeedback();
  }

  function fillForm(schedule: ScheduleItem) {
    const [minute = '*', hour = '*', day = '*', month = '*', weekday = '*'] = schedule.cronExpression.split(/\s+/);

    setForm({
      name: schedule.name,
      description: schedule.description ?? '',
      timezone: schedule.timezone ?? DEFAULT_TIMEZONE,
      minute,
      hour,
      day,
      month,
      weekday,
    });
    setSelectedId(schedule.id);
    setNextRunAt(schedule.nextRunAt ?? '');
    setError('');
    setSuccessMessage(`Dang chinh sua lich "${schedule.name}"`);
  }

  async function request<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    let data: T | { message?: string } | null = null;

    try {
      data = (await response.json()) as T | { message?: string };
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data && typeof data === 'object' && 'message' in data
          ? Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Co loi xay ra'
          : 'Co loi xay ra';

      throw new Error(message);
    }

    return data as T;
  }

  async function loadSchedules() {
    try {
      setListLoading(true);
      const data = await request<ScheduleItem[]>(API_BASE_URL);
      setSchedules(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Khong the tai danh sach lich',
      );
    } finally {
      setListLoading(false);
    }
  }

  async function handleCheckCron() {
    try {
      setLoading(true);
      resetFeedback();

      const data = await request<{ valid: boolean; nextRunAt?: string; message?: string; timezone?: string }>(
        `${API_BASE_URL}/validate-cron`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cronExpression,
            timezone: form.timezone,
          }),
        },
      );

      if (data.valid && data.nextRunAt) {
        setNextRunAt(data.nextRunAt);
        setSuccessMessage(`Hop le theo mui gio ${data.timezone ?? form.timezone}`);
      } else {
        setNextRunAt('');
        setError(data.message ?? 'Cron expression khong hop le');
      }
    } catch (checkError) {
      setNextRunAt('');
      setError(
        checkError instanceof Error
          ? checkError.message
          : 'Khong the kiem tra cron expression',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      resetFeedback();

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        timezone: form.timezone.trim() || DEFAULT_TIMEZONE,
        cronExpression,
      };

      const url = selectedId ? `${API_BASE_URL}/${selectedId}` : API_BASE_URL;
      const method = selectedId ? 'PATCH' : 'POST';

      const schedule = await request<ScheduleItem>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setSuccessMessage(selectedId ? 'Cap nhat lich thanh cong' : 'Tao lich thanh cong');
      setNextRunAt(schedule.nextRunAt ?? '');
      resetForm();
      await loadSchedules();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Khong the luu lich',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusAction(id: string, action: 'pause' | 'resume') {
    try {
      setActionId(id);
      resetFeedback();
      await request<ScheduleItem>(`${API_BASE_URL}/${id}/${action}`, {
        method: 'PATCH',
      });
      setSuccessMessage(action === 'pause' ? 'Da pause lich' : 'Da resume lich');
      await loadSchedules();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Khong the cap nhat trang thai lich',
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      setActionId(id);
      resetFeedback();
      await request(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      if (selectedId === id) {
        resetForm();
      }
      setSuccessMessage('Da xoa lich');
      await loadSchedules();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Khong the xoa lich',
      );
    } finally {
      setActionId(null);
    }
  }

  function formatDateTime(dateString: string | null) {
    if (!dateString) {
      return '-';
    }

    return new Date(dateString).toLocaleString('vi-VN', {
      timeZone: form.timezone || DEFAULT_TIMEZONE,
    });
  }

  return (
    <div className="cron-page">
      <div className="page-shell">
        <section className="hero-panel">
          <p className="eyebrow">Scheduler Dashboard</p>
          <h1>Quan ly cron schedule tren Neon va NestJS</h1>
          <p className="hero-copy">
            Kiem tra cron, tao lich, sua nhanh, pause or resume va theo doi lan chay tiep theo trong cung mot man hinh.
          </p>
          <div className="hero-metrics">
            <div>
              <span>{schedules.length}</span>
              <p>Tong lich</p>
            </div>
            <div>
              <span>{schedules.filter((item) => item.status === 'ACTIVE').length}</span>
              <p>Dang active</p>
            </div>
            <div>
              <span>{schedules.filter((item) => item.status === 'PAUSED').length}</span>
              <p>Dang pause</p>
            </div>
          </div>
        </section>

        <div className="workspace-grid">
          <section className="editor-card">
            <div className="card-head">
              <div>
                <p className="card-kicker">Schedule Editor</p>
                <h2>{isEditing ? 'Cap nhat lich' : 'Tao lich moi'}</h2>
              </div>
              {isEditing ? (
                <button className="ghost-button" type="button" onClick={resetForm}>
                  Tao moi
                </button>
              ) : null}
            </div>

            <form className="schedule-form" onSubmit={handleSubmit}>
              <div className="form-row full-width">
                <label htmlFor="name">Ten lich</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => setFormField('name', event.target.value)}
                  placeholder="Vi du: Gui bao cao sang"
                  required
                />
              </div>

              <div className="form-row full-width">
                <label htmlFor="description">Mo ta</label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setFormField('description', event.target.value)}
                  placeholder="Mo ta ngan ve muc dich cua lich"
                  rows={3}
                />
              </div>

              <div className="form-row full-width">
                <label htmlFor="timezone">Timezone</label>
                <input
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => setFormField('timezone', event.target.value)}
                  placeholder="Asia/Ho_Chi_Minh"
                />
              </div>

              <div className="cron-fields">
                <div className="cron-field">
                  <label>Phut</label>
                  <span>0 - 59</span>
                  <input value={form.minute} onChange={(event) => setFormField('minute', event.target.value)} />
                </div>
                <div className="cron-field">
                  <label>Gio</label>
                  <span>0 - 23</span>
                  <input value={form.hour} onChange={(event) => setFormField('hour', event.target.value)} />
                </div>
                <div className="cron-field">
                  <label>Ngay</label>
                  <span>1 - 31</span>
                  <input value={form.day} onChange={(event) => setFormField('day', event.target.value)} />
                </div>
                <div className="cron-field">
                  <label>Thang</label>
                  <span>1 - 12</span>
                  <input value={form.month} onChange={(event) => setFormField('month', event.target.value)} />
                </div>
                <div className="cron-field">
                  <label>Thu</label>
                  <span>0 - 7</span>
                  <input value={form.weekday} onChange={(event) => setFormField('weekday', event.target.value)} />
                </div>
              </div>

              <div className="cron-preview">
                <div>
                  <strong>Cron hien tai</strong>
                  <code>{cronExpression}</code>
                </div>
                <div>
                  <strong>Lan chay tiep theo</strong>
                  <span>{formatDateTime(nextRunAt || null)}</span>
                </div>
              </div>

              {(error || successMessage) ? (
                <div className="feedback-stack">
                  {successMessage ? <div className="feedback success">{successMessage}</div> : null}
                  {error ? <div className="feedback error">{error}</div> : null}
                </div>
              ) : null}

              <div className="action-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleCheckCron}
                  disabled={loading}
                >
                  {loading ? 'Dang kiem tra...' : 'Validate cron'}
                </button>
                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? 'Dang luu...' : isEditing ? 'Cap nhat lich' : 'Tao lich'}
                </button>
              </div>
            </form>
          </section>

          <section className="list-card">
            <div className="card-head">
              <div>
                <p className="card-kicker">Saved Schedules</p>
                <h2>Danh sach lich</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => void loadSchedules()}>
                Refresh
              </button>
            </div>

            {listLoading ? (
              <div className="empty-state">Dang tai danh sach lich...</div>
            ) : schedules.length === 0 ? (
              <div className="empty-state">Chua co lich nao. Tao lich dau tien o khung ben trai.</div>
            ) : (
              <div className="schedule-list">
                {schedules.map((schedule) => {
                  const isBusy = actionId === schedule.id;

                  return (
                    <article className="schedule-item" key={schedule.id}>
                      <div className="schedule-top">
                        <div>
                          <div className="title-row">
                            <h3>{schedule.name}</h3>
                            <span className={`status-pill ${schedule.status.toLowerCase()}`}>
                              {schedule.status}
                            </span>
                          </div>
                          <p className="schedule-id">ID: {schedule.id}</p>
                        </div>
                        <button className="mini-button" type="button" onClick={() => fillForm(schedule)}>
                          Sua
                        </button>
                      </div>

                      <dl className="detail-grid">
                        <div>
                          <dt>Cron</dt>
                          <dd>{schedule.cronExpression}</dd>
                        </div>
                        <div>
                          <dt>Timezone</dt>
                          <dd>{schedule.timezone ?? DEFAULT_TIMEZONE}</dd>
                        </div>
                        <div>
                          <dt>Next run</dt>
                          <dd>{formatDateTime(schedule.nextRunAt)}</dd>
                        </div>
                        <div>
                          <dt>Mo ta</dt>
                          <dd>{schedule.description || '-'}</dd>
                        </div>
                      </dl>

                      <div className="item-actions">
                        {schedule.status === 'ACTIVE' ? (
                          <button
                            className="warn-button"
                            type="button"
                            onClick={() => void handleStatusAction(schedule.id, 'pause')}
                            disabled={isBusy}
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            className="success-button"
                            type="button"
                            onClick={() => void handleStatusAction(schedule.id, 'resume')}
                            disabled={isBusy}
                          >
                            Resume
                          </button>
                        )}
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => void handleDelete(schedule.id)}
                          disabled={isBusy}
                        >
                          Xoa
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CronForm;
