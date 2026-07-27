import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CronService } from './cron/cron.service';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';
import { SchedulerQueueService } from 'src/queue/scheduler-queue/scheduler-queue.service';


@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly CronService: CronService,
        private readonly schedulerQueueService: SchedulerQueueService,
    ) { }

    async findAll() {
        try {
            return await this.prisma.schedule.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } catch (error) {
            this.logger.error(
                'Error fetching cron jobs',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async findById(id: string) {
        try {
            const schedule = await this.prisma.schedule.findUnique({
                where: { id },
            });

            if (!schedule) {
                throw new NotFoundException(`Cron job with ID ${id} not found`);
            }

            return schedule;
        } catch (error) {
            this.logger.error(
                'Error fetching cron job by ID',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async createSchedule(name: string, cronExpression: string, timezone: string, description: string) {
        try {
            const cronValidation = await this.CronService.validateCron(cronExpression, timezone);
            if (cronValidation.valid === false) {
                throw new Error(`Cron expression không hợp lệ: ${cronValidation.message}`);
            }

            const scheduler = await this.prisma.schedule.create({
                data: {
                    name,
                    timezone,
                    cronExpression,
                    description,
                    isActive: true,
                    status: 'ACTIVE',
                    nextRunAt: cronValidation.nextRunAt ?? null,
                },
            });
            await this.schedulerQueueService.syncScheduler(scheduler);
            return scheduler;
        } catch (error) {
            this.logger.error(
                'Error creating cron job',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async updateSchedule(id: string, updateSchedulerDto: UpdateSchedulerDto) {
        try {
            const existingSchedule = await this.prisma.schedule.findUnique({
                where: { id },
            });

            if (!existingSchedule) {
                throw new NotFoundException(`Cron job with ID ${id} not found`);
            }


            const cronExpression = updateSchedulerDto.cronExpression ?? existingSchedule.cronExpression;
            const timezone = updateSchedulerDto.timezone ?? existingSchedule.timezone ?? 'Asia/Ho_Chi_Minh';

            let nextRunAt: Date | null = existingSchedule.nextRunAt;

            const shouldRecalculateNextRunAt =
                updateSchedulerDto.cronExpression !== undefined ||
                updateSchedulerDto.timezone !== undefined;

            if (shouldRecalculateNextRunAt) {
                const cronValidation = await this.CronService.validateCron(cronExpression, timezone);
                if (cronValidation.valid === false) {
                    throw new Error(`Cron expression không hợp lệ: ${cronValidation.message}`);
                }
                nextRunAt = cronValidation.nextRunAt ?? null;
            }

            const scheduler = await this.prisma.schedule.update({
                where: { id },
                data: {
                    name: updateSchedulerDto.name ?? existingSchedule.name,
                    cronExpression: updateSchedulerDto.cronExpression ?? existingSchedule.cronExpression,
                    timezone: updateSchedulerDto.timezone ?? existingSchedule.timezone,
                    description: updateSchedulerDto.description ?? existingSchedule.description,
                    nextRunAt,
                },
            });
            await this.schedulerQueueService.syncScheduler(scheduler);
            return scheduler;
        } catch (error) {
            this.logger.error(
                'Error updating cron job',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async deleteSchedule(id: string) {
        try {
            const existingSchedule = await this.prisma.schedule.findUnique({
                where: { id },
            });

            if (!existingSchedule) {
                throw new NotFoundException(`Cron job with ID ${id} not found`);
            }


            await this.prisma.schedule.delete({
                where: { id },

            });
            await this.schedulerQueueService.removeScheduler(id);
        } catch (error) {
            this.logger.error(
                'Error deleting cron job',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async deleteAllSchedules() {
        try {
            await this.prisma.schedule.deleteMany({});
            await this.schedulerQueueService.removeAllSchedulers();

        } catch (error) {
            this.logger.error(
                'Error deleting all cron jobs',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async pauseSchedule(id: string) {
        try {
            await this.findById(id);

            const schedule = await this.prisma.schedule.update({
                where: { id },
                data: {
                    isActive: false,
                    status: 'PAUSED',
                },
            });

            await this.schedulerQueueService.removeScheduler(id);

            return schedule;
        } catch (error) {
            this.logger.error(
                'Error pausing cron job',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async resumeSchedule(id: string) {
        try {
            await this.findById(id);

            const scheduler = await this.prisma.schedule.update({
                where: { id },
                data: {
                    isActive: true,
                    status: 'ACTIVE',
                },
            });
            await this.schedulerQueueService.syncScheduler(scheduler);
            return scheduler;
        } catch (error) {
            this.logger.error(
                'Error resuming cron job',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async getActiveSchedules() {
        try {
            return await this.prisma.schedule.findMany({
                where: { isActive: true },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } catch (error) {
            this.logger.error(
                'Error fetching active cron jobs',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async getPausedSchedules() {
        try {
            return await this.prisma.schedule.findMany({
                where: { isActive: false },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } catch (error) {
            this.logger.error(
                'Error fetching paused cron jobs',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    async pauseAllSchedules() {
        try {
            const result = await this.prisma.schedule.updateMany({
                where: { isActive: true },
                data: {
                    isActive: false,
                    status: 'PAUSED',
                },
            });

            await this.schedulerQueueService.removeAllSchedulers();

            return result;
        } catch (error) {
            this.logger.error(
                'Error pausing all cron jobs',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }
    async resumeAllSchedules() {
        try {
            const schedulesToResume = await this.prisma.schedule.findMany({
                where: { isActive: false },
            });

            const result = await this.prisma.schedule.updateMany({
                where: { isActive: false },
                data: {
                    isActive: true,
                    status: 'ACTIVE',
                },
            });

            for (const schedule of schedulesToResume) {
                await this.schedulerQueueService.syncScheduler({
                    ...schedule,
                    isActive: true,
                    status: 'ACTIVE',
                });
            }

            return result;
        } catch (error) {
            this.logger.error(
                'Error resuming all cron jobs',
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }
}
