import React, { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  exportExcelApi,
  importExcelApi,
  uploadMinioApi,
  triggerSyncApi
} from '../../services/api';
import './SystemPage.css';

export const SystemPage: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const minioInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const blob = await exportExcelApi();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedules_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showMessage('success', 'Xuất Excel thành công!');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Lỗi khi xuất Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await importExcelApi(file);
      
      if (result.hasErrors) {
        showMessage('error', `Import hoàn tất với một số lỗi. Thành công: ${result.success}/${result.total}. File lỗi đang được tải xuống...`);
        const url = window.URL.createObjectURL(result.errorBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_errors.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        showMessage('success', result.data.message || 'Import Excel thành công!');
      }
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Lỗi khi import Excel');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadMinio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await uploadMinioApi(file);
      setUploadedUrl(result.url);
      showMessage('success', result.message || 'Upload MinIO thành công!');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Lỗi khi upload MinIO');
    } finally {
      setLoading(false);
      if (minioInputRef.current) minioInputRef.current.value = '';
    }
  };

  const handleTriggerSync = async () => {
    try {
      setLoading(true);
      await triggerSyncApi();
      showMessage('success', 'Kích hoạt đồng bộ Postgres -> MariaDB thành công!');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Lỗi khi đồng bộ dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="system-page">
      <header className="page-header">
        <h1>Quản trị Hệ thống (Admin Tools)</h1>
        <p className="page-desc">Công cụ quản lý dữ liệu và hệ thống dành riêng cho Admin.</p>
      </header>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tools-grid">
        {/* Module Excel */}
        <section className="tool-card">
          <div className="tool-icon excel-icon">📊</div>
          <h2>Quản lý Excel</h2>
          <p>Xuất hoặc nhập lịch trình hàng loạt bằng file Excel.</p>
          <div className="tool-actions">
            <button className="btn btn-outline" onClick={handleExportExcel} disabled={loading}>
              📥 Xuất Excel
            </button>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              📤 Nhập Excel
            </button>
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImportExcel}
            />
          </div>
        </section>

        {/* Module MinIO */}
        <section className="tool-card">
          <div className="tool-icon minio-icon">🗄️</div>
          <h2>Lưu trữ MinIO</h2>
          <p>Upload file lên hệ thống lưu trữ S3 Compatible (MinIO).</p>
          <div className="tool-actions">
            <button className="btn btn-primary" onClick={() => minioInputRef.current?.click()} disabled={loading}>
              ☁️ Upload File
            </button>
            <input
              type="file"
              ref={minioInputRef}
              style={{ display: 'none' }}
              onChange={handleUploadMinio}
            />
          </div>
          {uploadedUrl && (
            <div className="upload-result">
              <p>File đã upload:</p>
              <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
                {uploadedUrl}
              </a>
            </div>
          )}
        </section>

        {/* Module Sync */}
        <section className="tool-card">
          <div className="tool-icon sync-icon">🔄</div>
          <h2>Đồng bộ Dữ liệu</h2>
          <p>Kích hoạt đồng bộ dữ liệu thủ công từ Postgres sang MariaDB.</p>
          <div className="tool-actions">
            <button className="btn btn-danger" onClick={handleTriggerSync} disabled={loading}>
              ⚡ Kích hoạt Sync
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
