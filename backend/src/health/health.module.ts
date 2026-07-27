import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [TerminusModule, PrismaModule, MinioModule],
  controllers: [HealthController],
})
export class HealthModule {}
