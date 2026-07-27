import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import * as mysql from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) { }

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      // 1. Kiểm tra sức khỏe PostgreSQL
      () => this.prismaHealth.pingCheck('postgres_db', this.prisma, { timeout: 10000 }),

      // 2. Kiểm tra sức khỏe MariaDB
      async () => {
        try {
          const mariadbUrl =
            this.configService.get<string>('MARIADB_URL') || 'mysql://root:rootpassword@localhost:3306/cron_scheduler_mariadb';;
          const connection = await mysql.createConnection(mariadbUrl);
          if (!connection) {
            throw new Error('Failed to create MariaDB connection');
          }
          await connection.ping();
          await connection.end();
          return {
            mariadb_db: {
              status: 'up',
            },
          };
        } catch (error) {
          return {
            mariadb_db: {
              status: 'down',
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      },

      // 3. Kiểm tra kết nối MinIO Storage
      async () => {
        try {
          const isAlive = await this.minioService.checkConnection();
          return {
            minio_storage: {
              status: isAlive ? 'up' : 'down',
            },
          };
        } catch (error) {
          return {
            minio_storage: {
              status: 'down',
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      },
    ]);
  }
}
