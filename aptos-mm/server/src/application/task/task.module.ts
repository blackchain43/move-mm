import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SwapTask, SwapTaskSchema } from './schemas';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { DexModule } from '../dex/dex.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MmConfig, MmConfigSchema } from '../admin/schemas';

@Module({
  imports: [
    DexModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SwapTask.name, schema: SwapTaskSchema },
      { name: MmConfig.name, schema: MmConfigSchema },
    ]),
  ],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
