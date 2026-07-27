import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { CronModule } from '../scheduler/cron/cron.module';

@Module({
  imports: [SchedulerModule, CronModule],
  providers: [ExcelService],
  controllers: [ExcelController]
})
export class ExcelModule {}
