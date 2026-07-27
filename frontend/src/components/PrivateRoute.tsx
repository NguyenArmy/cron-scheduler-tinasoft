import type React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-box">Đang tải cấu hình xác thực...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};
