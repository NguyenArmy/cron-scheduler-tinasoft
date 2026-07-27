import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SchedulerService } from '../scheduler/scheduler.service';
import { CronService } from '../scheduler/cron/cron.service';
import 'multer';

// Kết quả trả về sau khi import — export để Controller dùng
export interface ImportResult {
    total: number;
    success: number;
    failed: number;
    errorBuffer?: Buffer;
}

// Cấu trúc một dòng lỗi để ghi vào file error.xlsx
interface ErrorRow {
    row: number;
    name: string;
    cronExpression: string;
    timezone: string;
    description: string;
    error: string;
}

@Injectable()
export class ExcelService {
    constructor(
        private readonly schedulerService: SchedulerService,
        private readonly cronService: CronService,
    ) { }

    async importSchedules(file: Express.Multer.File & { buffer: Buffer }): Promise<ImportResult> {
        // ── BƯỚC 1: Đọc file Excel ─────────────────────────────────────────
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file.buffer.buffer as ArrayBuffer);
        const worksheet = workbook.worksheets[0];

        const successRows: Array<{
            name: string;
            cronExpression: string;
            timezone?: string;
            description?: string;
        }> = [];
        const errorRows: ErrorRow[] = [];

        // ── BƯỚC 2: Tự động tìm chỉ số vị trí cột theo tên Header dòng 1 ──
        let colNameIdx = 1;
        let colCronIdx = 2;
        let colTzIdx = 3;
        let colDescIdx = 4;

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            const val = (cell.value ?? '').toString().trim().toLowerCase();
            if (val === 'name' || val === 'tên lịch' || val === 'tên') {
                colNameIdx = colNumber;
            } else if (val === 'cronexpression' || val === 'cron expression' || val === 'cron') {
                colCronIdx = colNumber;
            } else if (val === 'timezone' || val === 'múi giờ') {
                colTzIdx = colNumber;
            } else if (val === 'description' || val === 'mô tả') {
                colDescIdx = colNumber;
            }
        });

        // ── BƯỚC 3: Duyệt từng dòng dữ liệu ────────────────────────────────
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Bỏ qua dòng header

            const name = (row.getCell(colNameIdx).value ?? '').toString().trim();
            const cronExpression = (row.getCell(colCronIdx).value ?? '').toString().trim();
            const timezone = (row.getCell(colTzIdx).value ?? '').toString().trim();
            const description = (row.getCell(colDescIdx).value ?? '').toString().trim();

            // ── BƯỚC 3: Validate từng dòng ───────────────────────────────────
            const errors: string[] = [];

            // 3a. Validate cơ bản: name bắt buộc
            if (!name) {
                errors.push('Tên lịch (name) không được để trống');
            }

            // 3b. Validate cơ bản: cronExpression bắt buộc
            if (!cronExpression) {
                errors.push('Biểu thức Cron không được để trống');
            } else {
                // 3c. Custom validate: kiểm tra cú pháp Cron thực sự hợp lệ không
                const cronValidation = this.cronService.validateCron(
                    cronExpression,
                    timezone,
                );
                if (!cronValidation.valid) {
                    errors.push(`Cron không hợp lệ: ${cronValidation.message}`);
                }
            }

            // ── BƯỚC 4: Phân loại đúng/sai ───────────────────────────────────
            if (errors.length > 0) {
                errorRows.push({
                    row: rowNumber,
                    name,
                    cronExpression,
                    timezone,
                    description,
                    error: errors.join(' | '),
                });
            } else {
                successRows.push({
                    name,
                    cronExpression,
                    timezone: timezone || undefined,
                    description: description || undefined,
                });
            }
        });

        // ── BƯỚC 5: Lưu các dòng hợp lệ vào PostgreSQL ───────────────────
        let savedCount = 0;
        for (const item of successRows) {
            try {
                await this.schedulerService.createSchedule(
                    item.name,
                    item.cronExpression,
                    item.timezone || 'Asia/Ho_Chi_Minh',
                    item.description ?? '',
                );
                savedCount++;
            } catch (err) {
                errorRows.push({
                    row: 0,
                    name: item.name,
                    cronExpression: item.cronExpression,
                    timezone: item.timezone ?? '',
                    description: item.description ?? '',
                    error: `Lỗi khi lưu DB: ${err instanceof Error ? err.message : String(err)}`,
                });
            }
        }

        const total = successRows.length + errorRows.length;
        const failed = errorRows.length;
        const success = savedCount;

        // ── BƯỚC 6: Tạo file Excel lỗi (nếu có dòng sai) ─────────────────
        if (errorRows.length > 0) {
            const errorBuffer = await this.buildErrorExcel(errorRows);
            return { total, success, failed, errorBuffer };
        }

        return { total, success, failed };
    }

    // ── Tạo file error.xlsx chứa các dòng sai + cột "Lý do lỗi" ──────────
    private async buildErrorExcel(errorRows: ErrorRow[]): Promise<Buffer> {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Import Errors');

        // Định nghĩa cột
        ws.columns = [
            { header: 'Dòng (Row)', key: 'row', width: 12 },
            { header: 'name', key: 'name', width: 25 },
            { header: 'cronExpression', key: 'cronExpression', width: 20 },
            { header: 'timezone', key: 'timezone', width: 22 },
            { header: 'description', key: 'description', width: 25 },
            { header: 'Lý do lỗi', key: 'error', width: 45 },
        ];

        // Style header: nền đỏ, chữ trắng, in đậm
        ws.getRow(1).eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD32F2F' },
            };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        });

        // Ghi từng dòng lỗi
        errorRows.forEach((e) => ws.addRow(e));

        // Xuất ra Buffer
        const buffer = await wb.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    // ── Xuất toàn bộ danh sách schedules ra file Excel ────────────────────
    async exportSchedules(): Promise<Buffer> {
        // Lấy tất cả schedules từ DB (không giới hạn)
        const schedules = await this.schedulerService.findAll();

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Cron Scheduler System';
        wb.created = new Date();

        const ws = wb.addWorksheet('Schedules');

        // Định nghĩa các cột
        ws.columns = [
            { header: 'STT', key: 'stt', width: 6 },
            { header: 'ID', key: 'id', width: 38 },
            { header: 'Tên lịch', key: 'name', width: 28 },
            { header: 'Cron Expression', key: 'cronExpression', width: 22 },
            { header: 'Timezone', key: 'timezone', width: 22 },
            { header: 'Mô tả', key: 'description', width: 35 },
            { header: 'Trạng thái', key: 'status', width: 14 },
            { header: 'Lần chạy gần nhất', key: 'lastRunAt', width: 22 },
            { header: 'Lần chạy tiếp theo', key: 'nextRunAt', width: 22 },
            { header: 'Ngày tạo', key: 'createdAt', width: 22 },
        ];

        // Style header: nền xanh đậm, chữ trắng, in đậm
        const headerRow = ws.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E40AF' }, // Xanh đậm
            };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        headerRow.height = 30;

        // Ghi dữ liệu từng dòng
        schedules.forEach((s, idx) => {
            const row = ws.addRow({
                stt: idx + 1,
                id: s.id,
                name: s.name,
                cronExpression: s.cronExpression,
                timezone: s.timezone ?? 'Asia/Ho_Chi_Minh',
                description: s.description ?? '',
                status: s.status,
                lastRunAt: s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('vi-VN') : '—',
                nextRunAt: s.nextRunAt ? new Date(s.nextRunAt).toLocaleString('vi-VN') : '—',
                createdAt: new Date(s.createdAt).toLocaleString('vi-VN'),
            });

            // Tô màu nền xen kẽ cho dễ đọc
            if (idx % 2 === 1) {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF1F5F9' }, // Xám nhạt
                    };
                });
            }

            // Tô màu cột status: xanh lá nếu ACTIVE, cam nếu PAUSED
            const statusCell = row.getCell('status');
            statusCell.font = {
                bold: true,
                color: { argb: s.status === 'ACTIVE' ? 'FF16A34A' : 'FFCA8A04' },
            };
        });

        // Freeze row header (cuộn vẫn thấy tiêu đề)
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        const buffer = await wb.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
