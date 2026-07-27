import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from './minio.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MinioController {
  constructor(private readonly minioService: MinioService) { }

  /**
   * POST /upload
   * Upload 1 file bất kỳ lên MinIO S3
   */
  @Post()
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File & { buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException(
        'Vui lòng chọn 1 file để upload (Key trong form-data phải đặt tên là "file")',
      );
    }

    const fileName = await this.minioService.uploadFile(file);
    const url = await this.minioService.getFileUrl(fileName);

    return {
      message: 'Upload file lên MinIO S3 thành công!',
      fileName,
      url,
    };
  }

  /**
   * GET /upload/url/:fileName
   * Lấy đường dẫn xem/tải file từ MinIO
   */
  @Get('url/:fileName')
  async getFileUrl(@Param('fileName') fileName: string) {
    const url = await this.minioService.getFileUrl(fileName);
    return { fileName, url };
  }
}
