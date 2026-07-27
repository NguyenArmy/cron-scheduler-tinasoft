# ⏰ Hệ Thống Quản Lý & Chạy Tự Động Lịch Trình (Cron Scheduler)

Hệ thống Cron Scheduler là một ứng dụng Full-stack giúp quản lý, lên lịch và tự động thực thi các tác vụ ngầm dựa trên biểu thức thời gian (Cron Expression). Hệ thống được trang bị tính năng cập nhật theo thời gian thực (Real-time), phân quyền mạnh mẽ và giao diện quản trị thân thiện.

## 🚀 Công nghệ sử dụng (Tech Stack)

### Frontend (Giao diện người dùng)
- **Framework:** ReactJS (Vite)
- **Ngôn ngữ:** TypeScript
- **Styling:** Vanilla CSS (Thiết kế hiện đại, Glassmorphism, Dark mode)
- **Tính năng đặc biệt:** 
  - Server-Sent Events (SSE) để cập nhật dữ liệu Real-time
  - State Management qua Context API

### Backend (Xử lý hệ thống)
- **Framework:** NestJS
- **Ngôn ngữ:** TypeScript
- **Cơ sở dữ liệu chính (Quản lý User & Schedule):** PostgreSQL (thông qua Prisma ORM)
- **Hàng đợi tác vụ (Message Queue):** Redis & BullMQ
- **Cơ sở dữ liệu phụ trợ:** MariaDB
- **Lưu trữ file (Object Storage):** MinIO (S3 compatible)
- **Bảo mật:** JWT (lưu qua HttpOnly Cookie), Mã hóa mật khẩu (Bcrypt)

## 🌟 Các tính năng nổi bật

1. **Quản lý tài khoản (Auth & RBAC):** 
   - Đăng nhập, đăng ký an toàn với JWT ẩn trong HttpOnly Cookie (chống hack/XSS).
   - Phân quyền (Role-based): `ADMIN` (được toàn quyền thêm/xóa/sửa), `USER` (chỉ được xem).
2. **Quản lý Tác vụ hẹn giờ:**
   - Tạo, tạm dừng (Pause), kích hoạt lại (Resume), xóa lịch trình.
   - Hỗ trợ kiểm tra (validate) biểu thức Cron trực tiếp khi nhập.
3. **Thực thi ngầm & Real-time:**
   - Hệ thống tự động đếm ngược và chạy tác vụ chính xác đến từng giây.
   - Mỗi khi một tác vụ chạy xong, giao diện sẽ tự động chớp nháy và cập nhật thời gian "Chạy gần nhất/tiếp theo" nhờ công nghệ **SSE (Server-Sent Events)** mà không cần F5.
4. **Nhập / Xuất dữ liệu (Excel):**
   - Hỗ trợ tải toàn bộ lịch trình ra file `.xlsx`.
   - Hỗ trợ Import file `.xlsx` hàng loạt. Tự động kiểm tra lỗi từng dòng, chỉ lưu dòng đúng và trả về 1 file excel chứa riêng các dòng lỗi.
5. **Giám sát sức khỏe (Health Check):**
   - Bảng điều khiển (Dashboard) kiểm tra trực tiếp trạng thái sống/chết của Postgres, MariaDB, MinIO.

## ⚙️ Hướng dẫn cài đặt & Khởi động

### 1. Chuẩn bị Môi trường (Cần cài đặt)
- Node.js (phiên bản 18 trở lên)
- Redis Server (đang chạy local ở cổng 6379)
- MariaDB Server (chạy local ở cổng 3306)
- MinIO Server (chạy local ở cổng 9000)
- PostgreSQL (Có thể dùng database trên mây như NeonDB)

### 2. Thiết lập Biến môi trường
Hệ thống sử dụng các thông tin nhạy cảm. Bạn cần copy file `.env.example` thành `.env` bên trong thư mục `/backend` và điền cấu hình:

```env
DATABASE_URL="postgresql://user:pass@host/db"
MARIADB_URL="mysql://root:pass@localhost:3306/db"
JWT_SECRET="secret_key"
...
```

### 3. Cài đặt và Chạy hệ thống

**Chạy Backend:**
```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```
*Backend sẽ chạy ở địa chỉ: `http://localhost:3003`*

**Chạy Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*Frontend sẽ chạy ở địa chỉ: `http://localhost:5173`*

---
*Dự án được xây dựng và tối ưu kiến trúc với niềm đam mê!*
