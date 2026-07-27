import {
    Controller,
    Get,
    Post,
    UploadedFile,
    UseInterceptors,
    Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ExcelService } from './excel.service';

@Controller('excel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExcelController {
    constructor(private readonly excelService: ExcelService) { }

    /**
     * GET /excel/export
     * Xuất toàn bộ danh sách schedules ra file Excel để download
     */
    @Get('export')
    async exportExcel(@Res() res: Response) {
        const buffer = await this.excelService.exportSchedules();
        const filename = `schedules_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
    }

    /**
     * POST /excel/import
     * Upload file .xlsx → validate từng dòng → lưu đúng, xuất file lỗi
     */
    @Post('import')
    @Roles('ADMIN')
    @UseInterceptors(FileInterceptor('file'))
    async importExcel(
        @UploadedFile() file: Express.Multer.File & { buffer: Buffer },
        @Res() res: Response,
    ) {
        const result = await this.excelService.importSchedules(file);

        // Nếu có dòng lỗi → trả về file Excel lỗi để download
        if (result.errorBuffer) {
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="import_errors.xlsx"',
            );
            // Gắn summary vào header để frontend đọc được
            res.setHeader('X-Import-Total', String(result.total));
            res.setHeader('X-Import-Success', String(result.success));
            res.setHeader('X-Import-Failed', String(result.failed));
            res.setHeader(
                'Access-Control-Expose-Headers',
                'X-Import-Total,X-Import-Success,X-Import-Failed',
            );
            return res.send(result.errorBuffer);
        }

        // Không có lỗi → trả về JSON bình thường
        return res.json({
            total: result.total,
            success: result.success,
            failed: result.failed,
            message: `Import thành công ${result.success}/${result.total} dòng.`,
        });
    }
}
