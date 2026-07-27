import type React from 'react';
import { Search, Filter } from 'lucide-react';
import type { ScheduleItem } from '../../types/schedule';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED';

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  schedules: ScheduleItem[];
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  schedules,
}) => {
  const activeCount = schedules.filter((s) => s.status === 'ACTIVE').length;
  const pausedCount = schedules.filter((s) => s.status === 'PAUSED').length;

  return (
    <div className="toolbar">
      <div className="search-box">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên lịch hoặc mô tả..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        <Filter className="w-4 h-4 text-slate-400 mr-1" />
        <button
          className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('ALL')}
        >
          Tất cả ({schedules.length})
        </button>
        <button
          className={`filter-tab ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('ACTIVE')}
        >
          Đang hoạt động ({activeCount})
        </button>
        <button
          className={`filter-tab ${statusFilter === 'PAUSED' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('PAUSED')}
        >
          Đang tạm dừng ({pausedCount})
        </button>
      </div>
    </div>
  );
};
