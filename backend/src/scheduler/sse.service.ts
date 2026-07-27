import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface ScheduleExecutedPayload {
  id: string;
  name: string;
  lastRunAt: Date | string | null;
  nextRunAt: Date | string | null;
  executedAt: Date | string;
}

export interface SseEvent {
  data: any;
  type?: string;
}

@Injectable()
export class SseService {
  private readonly eventsSubject = new Subject<SseEvent>();

  /**
   * Trả về luồng sự kiện (Observable) để Controller dùng làm luồng SSE
   */
  getEventsObservable() {
    return this.eventsSubject.asObservable();
  }

  /**
   * Phát ra sự kiện khi một lịch trình chạy xong
   */
  emitScheduleExecuted(payload: ScheduleExecutedPayload) {
    this.eventsSubject.next({
      type: 'schedule.executed',
      data: payload,
    });
  }
}
