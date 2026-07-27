import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { ExcelModule } from './excel/excel.module';
import { MinioModule } from './minio/minio.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { SseModule } from './scheduler/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SchedulerModule,
    PrismaModule,
    QueueModule,
    ExcelModule,
    MinioModule,
    HealthModule,
    AuthModule,
    SyncModule,
    SseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
