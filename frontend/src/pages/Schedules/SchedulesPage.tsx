import type React from 'react';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ScheduleItem } from '../../types/schedule';
import {
  Play,
  Pause,
  Trash2,
  Calendar,
  AlertCircle,
  Plus,
  Upload,
  Download,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Toast, useToast } from '../../components/Toast/Toast';
import { SearchFilterBar } from '../../components/SearchFilterBar/SearchFilterBar';
import { ScheduleCard } from '../../components/ScheduleCard/ScheduleCard';
import './SchedulesPage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED';

interface SchedulesPageProps {
  schedules: ScheduleItem[];
  loading: boolean;
  error: string;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onPauseAll?: () => Promise<void>;
  onResumeAll?: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteAll?: () => Promise<void>;
  onRefresh?: () => void;
  recentlyFiredId?: string | null;
}

export const SchedulesPage: React.FC<SchedulesPageProps> = ({
  schedules,
  loading,
  error,
  onPause,
  onResume,
  onPauseAll,
  onResumeAll,
  onDelete,
  onDeleteAll,
  onRefresh,
  recentlyFiredId,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast } = useToast();

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filteredSchedules = schedules.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Card action handlers ──────────────────────────────────────────────────
  const handlePause = async (id: string) => {
    setActionId(id);
    try { await onPause(id); } finally { setActionId(null); }
  };

  const handleResume = async (id: string) => {
    setActionId(id);
    try { await onResume(id); } finally { setActionId(null); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lịch "${name}" không?`)) return;
    setActionId(id);
    try { await onDelete(id); } finally { setActionId(null); }
  };

  // ── Bulk action handlers ──────────────────────────────────────────────────
  const handlePauseAll = async () => {
    if (!window.confirm(`Tạm dừng tất cả ${schedules.length} lịch?`)) return;
    try {
      await onPauseAll?.();
      showToast('success', 'Đã tạm dừng tất cả lịch!');
    } catch (err) {
      showToast('error', `Lỗi: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const handleResumeAll = async () => {
    if (!window.confirm(`Kích hoạt lại tất cả ${schedules.length} lịch?`)) return;
    try {
      await onResumeAll?.();
      showToast('success', 'Đã kích hoạt lại tất cả lịch!');
    } catch (err) {
      showToast('error', `Lỗi: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        `CẢNH BÁO: Xóa TẤT CẢ ${schedules.length} lịch? Hành động không thể hoàn tác!`,
      )
    ) return;
    try {
      await onDeleteAll?.();
      showToast('success', 'Đã xóa tất cả lịch!');
    } catch (err) {
      showToast('error', `Lỗi: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/excel/export`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Server lỗi khi xuất file');
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : 'schedules.xlsx';
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', `Xuất file "${filename}" thành công!`);
    } catch (err) {
      showToast('error', `Lỗi xuất file: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import Excel ──────────────────────────────────────────────────────────
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/excel/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
        const total = res.headers.get('X-Import-Total') || '?';
        const success = res.headers.get('X-Import-Success') || '0';
        const failed = res.headers.get('X-Import-Failed') || '?';
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_errors.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        showToast('error', `Import xong: ✅ ${success}/${total} thành công, ❌ ${failed} lỗi (đã tải file lỗi).`);
        onRefresh?.();
        return;
      }
      const data = await res.json();
      showToast('success', data.message || `Import thành công ${data.success}/${data.total} dòng!`);
      onRefresh?.();
    } catch (err) {
      showToast('error', `Lỗi import: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="schedules-page">
      {/* Toast thông báo */}
      <Toast toast={toast} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Danh sách Lịch tự động</h1>
          <p className="page-description">
            Quản lý, tìm kiếm và thay đổi trạng thái các lịch Cron trong hệ thống.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="header-actions">
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                className="btn-secondary"
                onClick={handleImportClick}
                disabled={isImporting}
                title="Import từ file Excel (.xlsx)"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Đang import...' : 'Import Excel'}</span>
              </button>
            </>
          )}

          <button
            className="btn-secondary"
            onClick={handleExport}
            disabled={isExporting}
            title="Xuất toàn bộ danh sách ra Excel"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Đang xuất...' : 'Export Excel'}</span>
          </button>

          {isAdmin && (
            <>
              <button
                className="btn-secondary"
                onClick={handlePauseAll}
                disabled={schedules.length === 0}
              >
                <Pause className="w-4 h-4 text-amber-500" />
                <span>Dừng tất cả</span>
              </button>

              <button
                className="btn-secondary"
                onClick={handleResumeAll}
                disabled={schedules.length === 0}
              >
                <Play className="w-4 h-4 text-emerald-500" />
                <span>Bật tất cả</span>
              </button>

              <button
                className="btn-danger"
                onClick={handleDeleteAll}
                disabled={schedules.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa tất cả ({schedules.length})</span>
              </button>

              <Link to="/create" className="btn-primary">
                <Plus className="w-4 h-4" />
                <span>Tạo lịch mới</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert-banner error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        schedules={schedules}
      />

      {/* Schedule Cards List */}
      {loading ? (
        <div className="loading-box">Đang tải danh sách lịch...</div>
      ) : filteredSchedules.length === 0 ? (
        <div className="empty-box">
          <Calendar className="w-12 h-12 text-slate-500 mb-3" />
          <h3>Không tìm thấy lịch nào</h3>
          <p>Thử thay đổi từ khóa tìm kiếm hoặc tạo lịch mới.</p>
        </div>
      ) : (
        <div className="schedule-cards-grid">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              isBusy={actionId === schedule.id}
              isFired={recentlyFiredId === schedule.id}
              isAdmin={isAdmin}
              onPause={handlePause}
              onResume={handleResume}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
