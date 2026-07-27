import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Schedule } from '@prisma/client';

import {
    EXECUTE_SCHEDULER_JOB,
    SCHEDULER_QUEUE,
} from '../constants/queue.constant';
import { SchedulerJobData } from '../interfaces/scheduler-job-data.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchedulerQueueService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SchedulerQueueService.name);

    constructor(
        @InjectQueue(SCHEDULER_QUEUE)
        private readonly schedulerQueue: Queue<SchedulerJobData>,

        private readonly prisma: PrismaService,
    ) { }

    /**
     * Khi ứng dụng khởi động, đồng bộ lại các scheduler đang active
     * từ PostgreSQL sang BullMQ.
     */
    async onApplicationBootstrap(): Promise<void> {
        const schedulers = await this.prisma.schedule.findMany({
            where: {
                isActive: true,
            },
        });

        for (const scheduler of schedulers) {
            try {
                await this.syncScheduler(scheduler);
            } catch (error) {
                this.logger.error(
                    `Không thể khôi phục scheduler ${scheduler.id}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }

        this.logger.log(
            `Đã đồng bộ ${schedulers.length} scheduler sang BullMQ`,
        );
    }

    async syncScheduler(scheduler: Schedule): Promise<void> {
        const jobSchedulerId = this.createJobSchedulerId(scheduler.id);

        if (!scheduler.isActive) {
            await this.schedulerQueue.removeJobScheduler(jobSchedulerId);

            this.logger.log(
                `Đã tắt BullMQ scheduler: ${scheduler.id}`,
            );

            return;
        }

        await this.schedulerQueue.upsertJobScheduler(
            jobSchedulerId,
            {
                pattern: scheduler.cronExpression,
                tz: scheduler.timezone || 'Asia/Ho_Chi_Minh',
            },
            {
                name: EXECUTE_SCHEDULER_JOB,

                data: {
                    schedulerId: scheduler.id,
                },

                opts: {
                    attempts: 3,

                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },

                    removeOnComplete: {
                        count: 100,
                    },

                    removeOnFail: {
                        count: 500,
                    },
                },
            },
        );

        this.logger.log(
            `Đã đồng bộ scheduler ${scheduler.id}: ${scheduler.cronExpression}`,
        );
    }

    async removeScheduler(schedulerId: string): Promise<void> {
        const jobSchedulerId =
            this.createJobSchedulerId(schedulerId);

        await this.schedulerQueue.removeJobScheduler(
            jobSchedulerId,
        );

        this.logger.log(
            `Đã xoá BullMQ scheduler: ${schedulerId}`,
        );
    }
    async removeAllSchedulers(): Promise<void> {
        const schedulers = await this.prisma.schedule.findMany();

        for (const scheduler of schedulers) {
            await this.schedulerQueue.removeJobScheduler(
                this.createJobSchedulerId(scheduler.id),
            );
        }

        this.logger.log('Da xoa tat ca BullMQ schedulers');
    }

    private createJobSchedulerId(schedulerId: string): string {
        return `scheduler:${schedulerId}`;
    }
}