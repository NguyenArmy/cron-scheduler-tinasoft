import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ScheduleFormState, ScheduleItem } from '../../types/schedule';
import {
  validateCronExpression,
  createScheduleApi,
  updateScheduleApi,
  fetchScheduleById,
} from '../../services/api';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Sparkles,
  Check,
} from 'lucide-react';
import './ScheduleFormPage.css';

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const initialFormState: ScheduleFormState = {
  name: '',
  description: '',
  timezone: DEFAULT_TIMEZONE,
  minute: '0',
  hour: '0',
  day: '0',
  month: '0',
  weekday: '0',
};

interface ScheduleFormPageProps {
  onSuccess: () => void;
}

export const ScheduleFormPage: React.FC<ScheduleFormPageProps> = ({ onSuccess }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<ScheduleFormState>(initialFormState);
  const [nextRunAt, setNextRunAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (id) {
      void loadScheduleData(id);
    } else {
      setForm(initialFormState);
      setNextRunAt('');
      setError('');
      setSuccessMessage('');
    }
  }, [id]);

  const loadScheduleData = async (scheduleId: string) => {
    try {
      setLoading(true);
      const data: ScheduleItem = await fetchScheduleById(scheduleId);
      const parts = data.cronExpression.split(/\s+/);
      setForm({
        name: data.name,
        description: data.description || '',
        timezone: data.timezone || DEFAULT_TIMEZONE,
        minute: parts[0] || '0',
        hour: parts[1] || '0',
        day: parts[2] || '0',
        month: parts[3] || '0',
        weekday: parts[4] || '0',
      });
      setNextRunAt(data.nextRunAt || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin lịch');
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof ScheduleFormState>(
    field: K,
    value: ScheduleFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeCronField = (val: string) => {
    const trimmed = val.trim();
    const stepMatch = trimmed.match(/^\*(\d+)$/);
    return stepMatch ? `*/${stepMatch[1]}` : trimmed || '*';
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

  const handleValidate = async () => {
    try {
      setValidating(true);
      setError('');
      setSuccessMessage('');

      const res = await validateCronExpression(cronExpression, form.timezone);
      if (res.valid && res.nextRunAt) {
        setNextRunAt(res.nextRunAt);
        setSuccessMessage(`Cron hợp lệ! Lần chạy tiếp theo: ${formatPreviewTime(res.nextRunAt)}`);
      } else {
        setNextRunAt('');
        setError(res.message || 'Cú pháp Cron expression không hợp lệ.');
      }
    } catch (err) {
      setNextRunAt('');
      setError(err instanceof Error ? err.message : 'Lỗi khi kiểm tra Cron');
    } finally {
      setValidating(false);
    }
  };

  const applyPreset = (minute: string, hour: string, day = '*', month = '*', weekday = '*') => {
    setForm((prev) => ({
      ...prev,
      minute,
      hour,
      day,
      month,
      weekday,
    }));
    setError('');
    setSuccessMessage('Đã áp dụng mẫu Cron chọn nhanh.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Vui lòng nhập tên lịch.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        timezone: form.timezone.trim() || DEFAULT_TIMEZONE,
        cronExpression,
      };

      if (id) {
        await updateScheduleApi(id, payload);
        setSuccessMessage('Cập nhật lịch thành công!');
      } else {
        await createScheduleApi(payload);
        setSuccessMessage('Tạo lịch mới thành công!');
      }

      onSuccess();
      setTimeout(() => {
        navigate('/schedules');
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu lịch.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPreviewTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <div className="loading-box">Đang tải dữ liệu lịch...</div>;
  }

  return (
    <div className="schedule-form-page light-theme">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/schedules')}>
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
          <h1 className="page-title">
            {isEditing ? `Chỉnh sửa lịch: "${form.name}"` : 'Tạo lịch Cron mới'}
          </h1>
          <p className="page-description">
            Thiết lập tên lịch, biểu thức Cron và múi giờ để hệ thống chạy tự động.
          </p>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form-card">
          {error && (
            <div className="alert-banner error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert-banner success">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">
              Tên lịch <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Ví dụ: Gửi báo cáo doanh thu mỗi ngày"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Mô tả lịch</label>
            <textarea
              id="description"
              placeholder="Mô tả chi tiết mục đích của lịch chạy tự động..."
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Múi giờ (Timezone)</label>
            <input
              id="timezone"
              type="text"
              placeholder="Asia/Ho_Chi_Minh"
              value={form.timezone}
              onChange={(e) => setField('timezone', e.target.value)}
            />
          </div>

          {/* Quick Presets */}
          <div className="presets-section">
            <div className="preset-label">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Chọn nhanh mẫu Cron thông dụng:</span>
            </div>
            <div className="preset-buttons">
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset('*', '*')}
              >
                ⏱️ Mỗi 1 phút
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset('*/5', '*')}
              >
                ☕ Mỗi 5 phút
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset('*/15', '*')}
              >
                🔔 Mỗi 15 phút
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset('0', '8')}
              >
                🌅 8:00 Sáng mỗi ngày
              </button>
            </div>
          </div>

          {/* Cron Specification Card matching Reference Design */}
          <div className="cron-spec-card">
            <div className="cron-spec-title">
              Chu kỳ <span className="required">*</span> <span className="spec-sub">(Theo quy tắc Cron expression syntax)</span>
            </div>

            <div className="cron-spec-box">
              {/* Header Columns */}
              <div className="cron-spec-grid-header">
                <div className="spec-col">
                  <div className="spec-name">PHÚT <span className="required">*</span></div>
                  <div className="spec-range">(0-59)</div>
                </div>
                <div className="spec-col">
                  <div className="spec-name">GIỜ <span className="required">*</span></div>
                  <div className="spec-range">(0-23)</div>
                </div>
                <div className="spec-col">
                  <div className="spec-name">NGÀY <span className="required">*</span></div>
                  <div className="spec-range">(1-31)</div>
                </div>
                <div className="spec-col">
                  <div className="spec-name">THÁNG <span className="required">*</span></div>
                  <div className="spec-range">(1-12)</div>
                </div>
                <div className="spec-col last">
                  <div className="spec-name">THỨ TRONG TUẦN <span className="required">*</span></div>
                  <div className="spec-range">(0-7)</div>
                </div>
              </div>

              {/* Input Row */}
              <div className="cron-spec-grid-inputs">
                <div className="spec-input-wrapper">
                  <input
                    type="text"
                    value={form.minute}
                    onChange={(e) => setField('minute', e.target.value)}
                  />
                </div>
                <div className="spec-input-wrapper">
                  <input
                    type="text"
                    value={form.hour}
                    onChange={(e) => setField('hour', e.target.value)}
                  />
                </div>
                <div className="spec-input-wrapper">
                  <input
                    type="text"
                    value={form.day}
                    onChange={(e) => setField('day', e.target.value)}
                  />
                </div>
                <div className="spec-input-wrapper">
                  <input
                    type="text"
                    value={form.month}
                    onChange={(e) => setField('month', e.target.value)}
                  />
                </div>
                <div className="spec-input-wrapper">
                  <input
                    type="text"
                    value={form.weekday}
                    onChange={(e) => setField('weekday', e.target.value)}
                  />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="cron-spec-footer">
                <button
                  type="button"
                  className="btn-check-next"
                  onClick={handleValidate}
                  disabled={validating}
                >
                  <Check className="w-4 h-4" />
                  <span>{validating ? 'Đang kiểm tra...' : 'Kiểm tra lần chạy tiếp theo'}</span>
                </button>

                <div className="cron-spec-results">
                  <div className="result-line">
                    <span className="result-label">Lần chạy tiếp theo: </span>
                    <span className="result-value">
                      {nextRunAt ? formatPreviewTime(nextRunAt) : '—'}
                    </span>
                  </div>
                  {error && (
                    <div className="result-line error">
                      <span className="result-label">Lỗi: </span>
                      <span className="result-value">{error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo lịch ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
