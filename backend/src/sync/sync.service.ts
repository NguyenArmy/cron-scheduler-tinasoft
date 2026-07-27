import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as mysql from 'mysql2/promise';

export interface SyncResult {
  success: boolean;
  totalSynced: number;
  syncedAt: Date;
  message: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Đồng bộ toàn bộ dữ liệu từ PostgreSQL (Primary DB) sang MariaDB (Replica DB)
   */
  async syncPostgresToMariaDb(): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log('🔄 Bắt đầu tiến trình đồng bộ dữ liệu: Postgres ➔ MariaDB...');

    let connection: mysql.Connection | null = null;
    try {
      // 1. Lấy tất cả bản ghi từ PostgreSQL
      const schedules = await this.prisma.schedule.findMany();

      if (schedules.length === 0) {
        this.logger.log('ℹ️ Không có bản ghi nào trong Postgres để đồng bộ.');
        return {
          success: true,
          totalSynced: 0,
          syncedAt: new Date(),
          message: 'Không có dữ liệu cần đồng bộ',
        };
      }

      // 2. Kết nối tới MariaDB
      const mariadbUrl = this.configService.get<string>('MARIADB_URL');
      this.logger.log(`Kết nối tới MariaDB tại: ${mariadbUrl}`);
      if (!mariadbUrl) {
        throw new Error('Không tìm thấy biến môi trường MARIADB_URL');
      }

      connection = await mysql.createConnection(mariadbUrl);

      // 3. Thực hiện Upsert (INSERT ... ON DUPLICATE KEY UPDATE) từng bản ghi sang MariaDB
      const upsertSql = `
        INSERT INTO Schedule (
          id, name, cronExpression, timezone, description, isActive, status, lastRunAt, nextRunAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          id = VALUES(id),
          name = VALUES(name),
          cronExpression = VALUES(cronExpression),
          timezone = VALUES(timezone),
          description = VALUES(description),
          isActive = VALUES(isActive),
          status = VALUES(status),
          lastRunAt = VALUES(lastRunAt),
          nextRunAt = VALUES(nextRunAt),
          updatedAt = VALUES(updatedAt);
      `;

      let syncedCount = 0;
      for (const s of schedules) {
        await connection.execute(upsertSql, [
          s.id,
          s.name,
          s.cronExpression,
          s.timezone ?? 'Asia/Ho_Chi_Minh',
          s.description ?? null,
          s.isActive ? 1 : 0,
          s.status,
          s.lastRunAt ? new Date(s.lastRunAt) : null,
          s.nextRunAt ? new Date(s.nextRunAt) : null,
          s.createdAt ? new Date(s.createdAt) : new Date(),
          s.updatedAt ? new Date(s.updatedAt) : new Date(),
        ]);
        syncedCount++;
      }

      const duration = Date.now() - startTime;
      const msg = `🎉 Đồng bộ thành công ${syncedCount}/${schedules.length} bản ghi sang MariaDB trong ${duration}ms!`;
      this.logger.log(msg);

      return {
        success: true,
        totalSynced: syncedCount,
        syncedAt: new Date(),
        message: msg,
      };
    } catch (error) {
      const errMsg = `❌ Lỗi khi đồng bộ Postgres ➔ MariaDB: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errMsg);
      return {
        success: false,
        totalSynced: 0,
        syncedAt: new Date(),
        message: errMsg,
      };
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
