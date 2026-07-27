import { Logger } from '@nestjs/common';
import {
    OnWorkerEvent,
    Processor,
    WorkerHost,
} from '@nestjs/bullmq';
import { Job } from 'bullmq';

import {
    EXECUTE_SCHEDULER_JOB,
    SCHEDULER_QUEUE,
} from './constants/queue.constant';
import { SchedulerJobData } from './interfaces/scheduler-job-data.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CronService } from '../scheduler/cron/cron.service';
import { SseService } from '../scheduler/sse.service';

@Processor(SCHEDULER_QUEUE, {
    concurrency: 5,
})
export class SchedulerProcessor extends WorkerHost {
    private readonly logger = new Logger(
        SchedulerProcessor.name,
    );

    constructor(
        private readonly prisma: PrismaService,
        private readonly cronService: CronService,
        private readonly sseService: SseService,
    ) {
        super();
    }

    async process(
        job: Job<SchedulerJobData>,
    ): Promise<unknown> {
        switch (job.name) {
            case EXECUTE_SCHEDULER_JOB:
                return this.executeScheduler(job);

            default:
                throw new Error(
                    `Không hỗ trợ loại job: ${job.name}`,
                );
        }
    }

    private async executeScheduler(
        job: Job<SchedulerJobData>,
    ): Promise<unknown> {
        const { schedulerId } = job.data;

        const scheduler =
            await this.prisma.schedule.findUnique({
                where: {
                    id: schedulerId,
                },
            });

        /*
         * Scheduler đã bị xoá:
         * không thực hiện công việc.
         */
        if (!scheduler) {
            this.logger.warn(
                `Không tìm thấy scheduler ${schedulerId}`,
            );

            return {
                skipped: true,
                reason: 'SCHEDULER_NOT_FOUND',
            };
        }

        /*
         * Scheduler đã bị tắt nhưng một job cũ vừa được lấy ra:
         * không thực hiện công việc.
         */
        if (!scheduler.isActive) {
            this.logger.warn(
                `Scheduler ${schedulerId} đang bị tắt`,
            );

            return {
                skipped: true,
                reason: 'SCHEDULER_INACTIVE',
            };
        }

        const startedAt = new Date();

        this.logger.log(
            `Bắt đầu chạy scheduler: ${scheduler.name}`,
        );

        /*
         * Đây là công việc demo hiện tại.
         * Sau này bạn thay bằng gửi email, sync DB, export file...
         */
        console.log({
            message: 'Scheduler đang thực thi',
            schedulerId: scheduler.id,
            name: scheduler.name,
            cronExpression: scheduler.cronExpression,
            executedAt: startedAt.toISOString(),
        });

        const cronResult = this.cronService.validateCron(
            scheduler.cronExpression,
            scheduler.timezone || 'Asia/Ho_Chi_Minh',
        );

        if (!cronResult.valid) {
            throw new Error(
                cronResult.message ?? 'Cron expression không hợp lệ',
            );
        }

        const updatedScheduler =
            await this.prisma.schedule.update({
                where: {
                    id: scheduler.id,
                },

                data: {
                    lastRunAt: startedAt,
                    nextRunAt: cronResult.nextRunAt
                        ? new Date(cronResult.nextRunAt)
                        : null,
                },
            });

        this.logger.log(
            `Hoàn thành scheduler: ${scheduler.name}`,
        );

        this.sseService.emitScheduleExecuted({
            id: scheduler.id,
            name: scheduler.name,
            lastRunAt: startedAt,
            nextRunAt: updatedScheduler.nextRunAt,
            executedAt: startedAt,
        });

        return {
            schedulerId: scheduler.id,
            executedAt: startedAt,
            nextRunAt: updatedScheduler.nextRunAt,
        };
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<SchedulerJobData>): void {
        this.logger.log(
            `Job ${job.id ?? 'unknown'} hoàn thành`,
        );
    }

    @OnWorkerEvent('failed')
    onFailed(
        job: Job<SchedulerJobData> | undefined,
        error: Error,
    ): void {
        this.logger.error(
            `Job ${job?.id ?? 'unknown'} thất bại: ${error.message}`,
            error.stack,
        );
    }
}