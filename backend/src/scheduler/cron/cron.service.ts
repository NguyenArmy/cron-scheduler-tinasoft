import { Injectable } from '@nestjs/common';
import CronExpressionParser from 'cron-parser';

@Injectable()
export class CronService {
    private readonly defaultTimezone = `Asia/Ho_Chi_Minh`;


    private normalizeCronExpression(expression: string) {
        return expression.trim().split(/\s+/).map((field) => {
            const stepMatch = field.match(/^\*(\d+)$/);
            return stepMatch ? `*/${stepMatch[1]}` : field;
        })
            .join(' ');
    }
    private resolveTimezone(timezone: string) {
        const normalizedTimezone = timezone.trim() || this.defaultTimezone;
        try {
            Intl.DateTimeFormat(undefined, { timeZone: normalizedTimezone });
            return normalizedTimezone;
        } catch (error) {
            throw new Error(`Invalid timezone: ${normalizedTimezone}`);
        }
    }





    validateCron(cronExpression: string, timezone: string) {
        try {
            if (!cronExpression?.trim()) {
                return {
                    valid: false,
                    message: 'Cron expression is required',
                };
            }

            const normalizedExpression = this.normalizeCronExpression(cronExpression);
            const resolvedTimezone = this.resolveTimezone(timezone);
            const interval = CronExpressionParser.parse(normalizedExpression, {
                tz: resolvedTimezone
            });
            const nextRunAt = interval.next().toDate();
            return {
                valid: true,
                nextRunAt,
                timezone: resolvedTimezone,
            };

        } catch (error) {
            return {
                valid: false,
                message: error instanceof Error ? error.message : 'Invalid cron expression',
            }
        }
    }


}

