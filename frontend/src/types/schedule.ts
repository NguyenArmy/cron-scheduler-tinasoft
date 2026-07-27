export type ScheduleStatus = 'ACTIVE' | 'PAUSED';

export interface ScheduleItem {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string | null;
  description: string | null;
  status: ScheduleStatus;
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleFormState {
  name: string;
  description: string;
  timezone: string;
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
}

export interface CronValidationResult {
  valid: boolean;
  nextRunAt?: string;
  message?: string;
  timezone?: string;
}
