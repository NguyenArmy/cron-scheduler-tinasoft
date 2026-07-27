import { useEffect, useState, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ScheduleItem } from './types/schedule';
import {
  fetchSchedules,
  pauseScheduleApi,
  resumeScheduleApi,
  pauseAllSchedulesApi,
  resumeAllSchedulesApi,
  deleteScheduleApi,
  deleteAllSchedulesApi,
  subscribeToScheduleEvents,
  type ScheduleExecutedPayload,
} from './services/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { SchedulesPage } from './pages/Schedules/SchedulesPage';
import { ScheduleFormPage } from './pages/Schedules/ScheduleFormPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { SystemPage } from './pages/System/SystemPage';
import './App.css';

function MainApp() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [recentlyFiredId, setRecentlyFiredId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 5000);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return; // Không load nếu chưa đăng nhập
    try {
      setLoading(true);
      const data = await fetchSchedules();
      setSchedules(data);
      setError('');
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ Backend.',
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Lắng nghe SSE để cập nhật real-time khi schedule chạy
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToScheduleEvents(
      (payload: ScheduleExecutedPayload) => {
        setSseConnected(true);
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === payload.id
              ? { ...s, lastRunAt: payload.lastRunAt, nextRunAt: payload.nextRunAt }
              : s,
          ),
        );
        setRecentlyFiredId(payload.id);
        setTimeout(() => setRecentlyFiredId(null), 3000);

        const time = new Date(payload.executedAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        showToast(`⏰ Lịch "${payload.name}" vừa chạy lúc ${time}`);
      },
      () => {
        setSseConnected(false);
      },
    );

    return unsubscribe;
  }, [showToast, user]);

  // Load dữ liệu ban đầu
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Public routes (không hiển thị Navbar)
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // --- Hàm xử lý action ---
  const handlePause = async (id: string) => {
    try {
      await pauseScheduleApi(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạm dừng lịch');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeScheduleApi(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tiếp tục lịch');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduleApi(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa lịch');
    }
  };

  const handlePauseAll = async () => {
    try {
      await pauseAllSchedulesApi();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạm dừng tất cả lịch');
    }
  };

  const handleResumeAll = async () => {
    try {
      await resumeAllSchedulesApi();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi kích hoạt tất cả lịch');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllSchedulesApi();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xóa tất cả lịch');
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        scheduleCount={schedules.length}
        isConnected={isConnected}
        sseConnected={sseConnected}
      />

      <main className="main-content">
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route
              path="/"
              element={
                <DashboardPage
                  schedules={schedules}
                  loading={loading}
                  error={error}
                  onRefresh={loadData}
                />
              }
            />

            <Route
              path="/schedules"
              element={
                <SchedulesPage
                  schedules={schedules}
                  loading={loading}
                  error={error}
                  onPause={handlePause}
                  onResume={handleResume}
                  onPauseAll={handlePauseAll}
                  onResumeAll={handleResumeAll}
                  onDelete={handleDelete}
                  onDeleteAll={handleDeleteAll}
                  onRefresh={loadData}
                  recentlyFiredId={recentlyFiredId}
                />
              }
            />

            <Route
              path="/create"
              element={<ScheduleFormPage onSuccess={loadData} />}
            />

            <Route
              path="/edit/:id"
              element={<ScheduleFormPage onSuccess={loadData} />}
            />
            
            <Route
              path="/system"
              element={<SystemPage />}
            />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Toast notification khi schedule chạy */}
      {toastMessage && (
        <div className="sse-toast">
          <span className="sse-toast-icon">✅</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
