import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { SCHEDULER_QUEUE } from './constants/queue.constant';
import { SchedulerQueueService } from './scheduler-queue/scheduler-queue.service';
import { CronModule } from '../scheduler/cron/cron.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulerProcessor } from './scheduler.processor';

@Module({
  imports: [

    ConfigModule,
    PrismaModule,
    CronModule,

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    BullModule.registerQueue({
      name: SCHEDULER_QUEUE,
    }),
  ],
  providers: [SchedulerQueueService, SchedulerProcessor],
  exports: [SchedulerQueueService],
})
export class QueueModule { }
