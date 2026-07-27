import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { CronService } from './cron/cron.service';
import { QueueModule } from 'src/queue/queue.module';
import { CronModule } from './cron/cron.module';

@Module({

  imports: [CronModule,
    QueueModule,],
  controllers: [SchedulerController],
  providers: [SchedulerService, CronService],
  exports: [SchedulerService]
})
export class SchedulerModule { }
