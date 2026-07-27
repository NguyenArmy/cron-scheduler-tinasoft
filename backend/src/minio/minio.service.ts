import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: Number(this.configService.get<number>('MINIO_PORT')) || 9000,
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });

    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') || 'cron-scheduler-files';
  }

  // Tự động kiểm tra và tạo Bucket khi ứng dụng khởi động
  async onModuleInit() {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`🎉 Đã tự động tạo MinIO Bucket: "${this.bucketName}"`);
      } else {
        this.logger.log(`✅ Kết nối MinIO Bucket "${this.bucketName}" thành công.`);
      }
    } catch (err) {
      this.logger.warn(
        `❌ Chưa thể kết nối MinIO (${err instanceof Error ? err.message : err}). Vui lòng kiểm tra Docker MinIO Server!`,
      );
    }
  }

  /**
   * Upload File Buffer lên MinIO Bucket
   * @returns Tên file duy nhất lưu trong MinIO
   */
  async uploadFile(file: Express.Multer.File & { buffer: Buffer }): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname}`;

    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    return fileName;
  }

  /**
   * Tạo Presigned URL để xem/tải file (mặc định có hiệu lực 24 giờ)
   */
  async getFileUrl(fileName: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.bucketName,
      fileName,
      24 * 60 * 60,
    );
  }

  /**
   * Xóa file khỏi MinIO Bucket
   */
  async deleteFile(fileName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, fileName);
  }

  /**
   * Kiểm tra xem MinIO Server có sống không (phục vụ Health Check)
   */
  async checkConnection(): Promise<boolean> {
    try {
      return await this.minioClient.bucketExists(this.bucketName);
    } catch {
      return false;
    }
  }
}
