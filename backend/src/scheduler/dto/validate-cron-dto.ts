import { IsNotEmpty, IsString, IsOptional } from "class-validator";


export class ValidateCronDto {
    @IsNotEmpty()
    @IsString()
    cronExpression!: string;

    @IsOptional()
    @IsString()
    timezone?: string;
}