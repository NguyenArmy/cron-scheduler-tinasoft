import type React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, PlusCircle, Clock, Server, Radio, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

interface NavbarProps {
  scheduleCount: number;
  isConnected: boolean;
  sseConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ scheduleCount, isConnected, sseConnected }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        <div className="brand-section">
          <div className="brand-icon">
            <Clock className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="brand-title">Cron Manager</h1>
          </div>
        </div>

        <nav className="nav-menu">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard className="nav-icon" />
            <span>Tổng quan</span>
          </NavLink>

          <NavLink to="/schedules" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Calendar className="nav-icon" />
            <span>Danh sách lịch</span>
            {scheduleCount > 0 && <span className="nav-badge">{scheduleCount}</span>}
          </NavLink>

          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/create" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <PlusCircle className="nav-icon" />
                <span>Tạo lịch mới</span>
              </NavLink>
              
              <NavLink to="/system" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings className="nav-icon" />
                <span>Hệ thống</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="status-group">
          {/* User Info & Logout */}
          {user && (
            <div className="user-info-box">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Đăng xuất">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Trạng thái kết nối API */}
          <div className="status-indicator">
            <Server className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            <span className="status-text">
              {isConnected ? 'API' : 'Mất KN'}
            </span>
          </div>

          {/* Trạng thái SSE real-time */}
          <div className="status-indicator">
            <Radio className={`w-4 h-4 ${sseConnected ? 'text-indigo-400' : 'text-slate-500'}`} />
            <span className={`status-dot ${sseConnected ? 'sse-live' : 'offline'}`} />
            <span className="status-text">
              {sseConnected ? 'Live' : 'Off'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
