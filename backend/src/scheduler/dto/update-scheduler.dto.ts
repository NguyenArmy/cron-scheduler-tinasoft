export class UpdateSchedulerDto {
    name?: string;
    cronExpression?: string;
    description?: string;
    isActive?: boolean;
    timezone?: string;
}