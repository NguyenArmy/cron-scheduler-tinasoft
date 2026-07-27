import type React from 'react';
import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import type { ScheduleItem } from '../../types/schedule';
import {
  fetchHealthCheckApi,
  type HealthCheckResponse,
} from '../../services/api';
import {
  Activity,
  PlayCircle,
  PauseCircle,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Database,
  HardDrive,
  Server,
} from 'lucide-react';
import './DashboardPage.css';

interface DashboardPageProps {
  schedules: ScheduleItem[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  schedules,
  loading,
  error,
  onRefresh,
}) => {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadHealth = async () => {
    setHealthLoading(true);
    const data = await fetchHealthCheckApi();
    setHealthData(data);
    setHealthLoading(false);
  };

  useEffect(() => {
    void loadHealth();
  }, []);
  const activeCount = schedules.filter((s) => s.status === 'ACTIVE').length;
  const pausedCount = schedules.filter((s) => s.status === 'PAUSED').length;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa từng chạy';
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const recentlyExecuted = [...schedules]
    .filter((s) => s.lastRunAt)
    .sort((a, b) => new Date(b.lastRunAt!).getTime() - new Date(a.lastRunAt!).getTime())
    .slice(0, 5);

  const upcomingRuns = [...schedules]
    .filter((s) => s.status === 'ACTIVE' && s.nextRunAt)
    .sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime())
    .slice(0, 5);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan hệ thống Lịch tự động</h1>
          <p className="page-description">
            Theo dõi trạng thái các Cron Job, xem thời gian thực thi gần nhất và lịch trình sắp tới.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <Link to="/create" className="btn-primary">
            <Zap className="w-4 h-4" />
            <span>Tạo lịch mới</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-banner error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card gradient-blue">
          <div className="metric-icon">
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="metric-value">{schedules.length}</span>
            <p className="metric-label">Tổng số lịch</p>
          </div>
        </div>

        <div className="metric-card gradient-emerald">
          <div className="metric-icon">
            <PlayCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="metric-value">{activeCount}</span>
            <p className="metric-label">Đang hoạt động </p>
          </div>
        </div>

        <div className="metric-card gradient-amber">
          <div className="metric-icon">
            <PauseCircle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="metric-value">{pausedCount}</span>
            <p className="metric-label">Đang tạm dừng </p>
          </div>
        </div>
      </div>

      {/* System Health Check Widget */}
      <div className="health-widget-card">
        <div className="health-header">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">Trạng thái sức khỏe hệ thống (Health Check)</h2>
          </div>
          <button
            className="btn-refresh-health"
            onClick={loadHealth}
            disabled={healthLoading}
            title="Kiểm tra lại sức khỏe hệ thống"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            <span>Check</span>
          </button>
        </div>

        <div className="health-services-grid">
          {/* Service 1: PostgreSQL */}
          <div className="health-item">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-slate-200">PostgreSQL DB</span>
            </div>
            <div className="status-badge-wrap">
              {healthData?.details?.postgres_db?.status === 'up' ? (
                <span className="health-badge up">🟢 Hoạt động</span>
              ) : (
                <span className="health-badge down">🔴 Mất kết nối</span>
              )}
            </div>
          </div>

          {/* Service 2: MariaDB */}
          <div className="health-item">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-200">MariaDB (Sync DB)</span>
            </div>
            <div className="status-badge-wrap">
              {healthData?.details?.mariadb_db?.status === 'up' ? (
                <span className="health-badge up">🟢 Hoạt động</span>
              ) : (
                <span className="health-badge down">🔴 Mất kết nối</span>
              )}
            </div>
          </div>

          {/* Service 3: MinIO Storage */}
          <div className="health-item">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-slate-200">MinIO Storage</span>
            </div>
            <div className="status-badge-wrap">
              {healthData?.details?.minio_storage?.status === 'up' ? (
                <span className="health-badge up">🟢 Hoạt động</span>
              ) : (
                <span className="health-badge down">🔴 Mất kết nối</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="dashboard-sections">
        {/* Section 1: Upcoming Runs */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2>Lịch sắp diễn ra tiếp theo</h2>
            </div>
            <Link to="/schedules" className="card-link">
              <span>Xem tất cả</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {upcomingRuns.length === 0 ? (
            <div className="empty-box">
              <Activity className="w-8 h-8 text-slate-500 mb-2" />
              <p>Chưa có lịch nào đang chạy hoặc sẵn sàng.</p>
            </div>
          ) : (
            <div className="schedule-mini-list">
              {upcomingRuns.map((schedule) => (
                <div key={schedule.id} className="mini-item">
                  <div className="mini-info">
                    <span className="mini-title">{schedule.name}</span>
                    <span className="mini-cron"><code>{schedule.cronExpression}</code></span>
                  </div>
                  <div className="mini-time">
                    <span className="label">Chạy kế:</span>
                    <span className="time-highlight">{formatTime(schedule.nextRunAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Recently Executed */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2>Vừa thực thi gần đây (lastRunAt)</h2>
            </div>
          </div>

          {recentlyExecuted.length === 0 ? (
            <div className="empty-box">
              <Clock className="w-8 h-8 text-slate-500 mb-2" />
              <p>Chưa có lịch nào vừa được kích hoạt.</p>
            </div>
          ) : (
            <div className="schedule-mini-list">
              {recentlyExecuted.map((schedule) => (
                <div key={schedule.id} className="mini-item">
                  <div className="mini-info">
                    <span className="mini-title">{schedule.name}</span>
                    <span className="mini-cron"><code>{schedule.cronExpression}</code></span>
                  </div>
                  <div className="mini-time text-emerald">
                    <span className="label">Chạy gần nhất:</span>
                    <span>{formatTime(schedule.lastRunAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
