import type { CronValidationResult, ScheduleItem } from '../types/schedule';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003'}/scheduler`;

// ───── SSE: lắng nghe sự kiện schedule chạy real-time ─────
export interface ScheduleExecutedPayload {
  id: string;
  name: string;
  lastRunAt: string;
  nextRunAt: string | null;
  executedAt: string;
}

export function subscribeToScheduleEvents(
  onEvent: (payload: ScheduleExecutedPayload) => void,
  onError?: (err: Event) => void,
): () => void {
  const es = new EventSource(`${API_BASE_URL}/events`, { withCredentials: true });

  es.addEventListener('schedule.executed', (e: MessageEvent) => {
    try {
      const payload: ScheduleExecutedPayload =
        typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      onEvent(payload);
    } catch {
      // ignore parse errors
    }
  });

  if (onError) {
    es.onerror = onError;
  }

  // Trả về hàm cleanup để đóng kết nối khi component unmount
  return () => es.close();
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'Đã xảy ra lỗi hệ thống'
        : 'Đã xảy ra lỗi hệ thống';
    throw new Error(message);
  }

  return data as T;
}

export async function fetchSchedules(): Promise<ScheduleItem[]> {
  try {
    const response = await fetch(API_BASE_URL, {
      credentials: 'include',
    });
    return await handleResponse<ScheduleItem[]>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Không thể kết nối đến máy chủ Backend (http://localhost:3003). Vui lòng kiểm tra lại backend server!',
      );
    }
    throw error;
  }
}

export async function fetchScheduleById(id: string): Promise<ScheduleItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      credentials: 'include',
    });
    return await handleResponse<ScheduleItem>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Không thể kết nối đến máy chủ Backend (http://localhost:3003).',
      );
    }
    throw error;
  }
}

export async function validateCronExpression(
  cronExpression: string,
  timezone?: string,
): Promise<CronValidationResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/validate-cron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cronExpression, timezone }),
    });
    return await handleResponse<CronValidationResult>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Không thể kết nối đến máy chủ Backend để kiểm tra Cron expression.',
      );
    }
    throw error;
  }
}

export async function createScheduleApi(payload: {
  name: string;
  cronExpression: string;
  timezone?: string;
  description?: string;
}): Promise<ScheduleItem> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return await handleResponse<ScheduleItem>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để tạo lịch.');
    }
    throw error;
  }
}

export async function updateScheduleApi(
  id: string,
  payload: {
    name?: string;
    cronExpression?: string;
    timezone?: string;
    description?: string;
  },
): Promise<ScheduleItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return await handleResponse<ScheduleItem>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để cập nhật lịch.');
    }
    throw error;
  }
}

export async function pauseScheduleApi(id: string): Promise<ScheduleItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/pause`, {
      method: 'PATCH',
      credentials: 'include',
    });
    return await handleResponse<ScheduleItem>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để tạm dừng lịch.');
    }
    throw error;
  }
}

export async function resumeScheduleApi(id: string): Promise<ScheduleItem> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/resume`, {
      method: 'PATCH',
      credentials: 'include',
    });
    return await handleResponse<ScheduleItem>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để tiếp tục lịch.');
    }
    throw error;
  }
}

export async function pauseAllSchedulesApi(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/pause-all`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) {
      await handleResponse<void>(response);
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để tạm dừng tất cả lịch.');
    }
    throw error;
  }
}

export async function resumeAllSchedulesApi(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/resume-all`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) {
      await handleResponse<void>(response);
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để kích hoạt tất cả lịch.');
    }
    throw error;
  }
}

export async function deleteScheduleApi(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      await handleResponse<void>(response);
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để xóa lịch.');
    }
    throw error;
  }
}

export async function deleteAllSchedulesApi(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/delete-all`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      await handleResponse<void>(response);
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ Backend để xóa tất cả lịch.');
    }
    throw error;
  }
}

// ───── Health Check API ─────
export interface ServiceStatus {
  status: 'up' | 'down';
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  details: {
    postgres_db?: ServiceStatus;
    mariadb_db?: ServiceStatus;
    minio_storage?: ServiceStatus;
  };
}

export async function fetchHealthCheckApi(): Promise<HealthCheckResponse> {
  const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003';
  try {
    const response = await fetch(`${BACKEND_BASE}/health`);
    return await response.json();
  } catch {
    return {
      status: 'error',
      details: {
        postgres_db: { status: 'down', message: 'Mất kết nối backend' },
        mariadb_db: { status: 'down', message: 'Mất kết nối backend' },
        minio_storage: { status: 'down', message: 'Mất kết nối backend' },
      },
    };
  }
}

// ───── Excel API ─────
export async function exportExcelApi(): Promise<Blob> {
  const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003';
  const response = await fetch(`${BACKEND_BASE}/excel/export`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Không thể tải file Excel.');
  }
  return await response.blob();
}

export async function importExcelApi(file: File): Promise<any> {
  const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003';
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${BACKEND_BASE}/excel/import`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  
  if (response.headers.get('content-type')?.includes('spreadsheetml')) {
    // Returned an error excel file
    const blob = await response.blob();
    return {
      hasErrors: true,
      errorBlob: blob,
      total: response.headers.get('x-import-total'),
      success: response.headers.get('x-import-success'),
      failed: response.headers.get('x-import-failed'),
    };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || 'Lỗi khi import Excel.');
  }
  
  return { hasErrors: false, data: await response.json() };
}

// ───── MinIO API ─────
export async function uploadMinioApi(file: File): Promise<{ url: string; fileName: string; message: string }> {
  const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003';
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${BACKEND_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return await handleResponse(response);
}

// ───── Sync API ─────
export async function triggerSyncApi(): Promise<any> {
  const BACKEND_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003';
  const response = await fetch(`${BACKEND_BASE}/sync/trigger`, {
    method: 'POST',
    credentials: 'include',
  });
  return await handleResponse(response);
}

