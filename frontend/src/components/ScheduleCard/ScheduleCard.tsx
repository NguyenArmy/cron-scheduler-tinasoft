import type React from 'react';
import { Clock, Globe, Play, Pause, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleItem } from '../../types/schedule';

interface ScheduleCardProps {
  schedule: ScheduleItem;
  isBusy: boolean;
  isFired: boolean;
  isAdmin: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

function formatDateTime(dateStr: string | null, timezone?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('vi-VN', {
      timeZone: timezone || 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return new Date(dateStr).toLocaleString('vi-VN');
  }
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  isBusy,
  isFired,
  isAdmin,
  onPause,
  onResume,
  onDelete,
}) => {
  const navigate = useNavigate();

  return (
    <div className={`schedule-card${isFired ? ' just-fired' : ''}`}>
      {/* Header card: Tên + Status badge + Action buttons */}
      <div className="card-top">
        <div className="title-area">
          <div className="flex items-center gap-2">
            <h3 className="schedule-name">{schedule.name}</h3>
            <span className={`status-pill ${schedule.status.toLowerCase()}`}>
              {schedule.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </div>
          <p className="schedule-id">ID: {schedule.id}</p>
        </div>

        {isAdmin && (
          <div className="card-actions">
            <button
              className="icon-btn edit"
              title="Chỉnh sửa lịch"
              onClick={() => navigate(`/edit/${schedule.id}`)}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              className="icon-btn delete"
              title="Xóa lịch"
              onClick={() => onDelete(schedule.id, schedule.name)}
              disabled={isBusy}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mô tả */}
      {schedule.description && (
        <p className="schedule-desc">{schedule.description}</p>
      )}

      {/* Chi tiết cron / timezone / thời gian chạy */}
      <div className="card-details">
        <div className="detail-item">
          <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="label">Cron:</span>
          <code className="cron-tag">{schedule.cronExpression}</code>
        </div>

        <div className="detail-item">
          <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="label">Múi giờ:</span>
          <span className="value">{schedule.timezone || 'Asia/Ho_Chi_Minh'}</span>
        </div>

        <div className="detail-item">
          <span className="label">Lần chạy gần nhất:</span>
          <span className={`value text-emerald${isFired ? ' live-update' : ''}`}>
            {formatDateTime(schedule.lastRunAt, schedule.timezone)}
            {isFired && <span className="fired-badge">🔴 Vừa chạy</span>}
          </span>
        </div>

        <div className="detail-item">
          <span className="label">Lần chạy tiếp theo:</span>
          <span className="value text-indigo">
            {formatDateTime(schedule.nextRunAt, schedule.timezone)}
          </span>
        </div>
      </div>

      {/* Footer với nút Tạm dừng / Tiếp tục — chỉ ADMIN */}
      {isAdmin && (
        <div className="card-footer">
          {schedule.status === 'ACTIVE' ? (
            <button
              className="btn-status pause"
              onClick={() => onPause(schedule.id)}
              disabled={isBusy}
            >
              <Pause className="w-4 h-4" />
              <span>{isBusy ? 'Đang xử lý...' : 'Tạm dừng lịch'}</span>
            </button>
          ) : (
            <button
              className="btn-status resume"
              onClick={() => onResume(schedule.id)}
              disabled={isBusy}
            >
              <Play className="w-4 h-4" />
              <span>{isBusy ? 'Đang xử lý...' : 'Tiếp tục lịch'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
