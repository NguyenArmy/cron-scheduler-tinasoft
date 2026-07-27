import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CronService } from './cron/cron.service';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';
import { ValidateCronDto } from './dto/validate-cron-dto';
import { SchedulerService } from './scheduler.service';
import { SseService } from './sse.service';

@Controller('scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulerController {
  constructor(
    private readonly cronService: CronService,
    private readonly schedulerService: SchedulerService,
    private readonly sseService: SseService,
  ) {}

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.sseService.getEventsObservable() as Observable<MessageEvent>;
  }

  @Post('validate-cron')
  validateCron(@Body() dto: ValidateCronDto) {
    return this.cronService.validateCron(dto.cronExpression, dto.timezone || '');
  }

  @Get()
  findAll() {
    return this.schedulerService.findAll();
  }

  @Get('status/active')
  getActiveSchedules() {
    return this.schedulerService.getActiveSchedules();
  }

  @Get('status/paused')
  getPausedSchedules() {
    return this.schedulerService.getPausedSchedules();
  }

  @Post()
  @Roles('ADMIN')
  createSchedule(@Body() dto: CreateSchedulerDto) {
    return this.schedulerService.createSchedule(
      dto.name,
      dto.cronExpression,
      dto.timezone || '',
      dto.description || '',
    );
  }

  @Patch('pause-all')
  @Roles('ADMIN')
  pauseAllSchedules() {
    return this.schedulerService.pauseAllSchedules();
  }

  @Patch('resume-all')
  @Roles('ADMIN')
  resumeAllSchedules() {
    return this.schedulerService.resumeAllSchedules();
  }

  @Delete('delete-all')
  @Roles('ADMIN')
  deleteAllSchedules() {
    return this.schedulerService.deleteAllSchedules();
  }

  @Patch(':id/pause')
  @Roles('ADMIN')
  pauseSchedule(@Param('id') id: string) {
    return this.schedulerService.pauseSchedule(id);
  }

  @Patch(':id/resume')
  @Roles('ADMIN')
  resumeSchedule(@Param('id') id: string) {
    return this.schedulerService.resumeSchedule(id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.schedulerService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateSchedulerDto) {
    return this.schedulerService.updateSchedule(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  deleteSchedule(@Param('id') id: string) {
    return this.schedulerService.deleteSchedule(id);
  }
}
