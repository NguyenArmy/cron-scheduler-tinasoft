import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * POST /sync/trigger
   * Kích hoạt đồng bộ dữ liệu Postgres ➔ MariaDB ngay lập tức
   */
  @Post('trigger')
  async triggerSync() {
    return this.syncService.syncPostgresToMariaDb();
  }
}
