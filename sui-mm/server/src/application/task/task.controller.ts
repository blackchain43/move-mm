import {
  Body,
  Controller,
  Delete,
  Post,
  Param,
  Get,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import {
  CreateTaskSwap,
  GetSwapTaskDto,
  QuerySwapSummary,
  ReuseTaskConfig,
} from './dto';
import { BaseResult, PaginationDto } from 'src/common';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { ApiTags } from '@nestjs/swagger';
import { SwapTaskChanges } from '../dex/schemas';

@ApiTags('TaskService')
@Controller('task')
export class TaskController {
  constructor(private taskService: TaskService) {}
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Post()
  CreateTask(@Body() body: CreateTaskSwap): Promise<BaseResult<any>> {
    return this.taskService.addTask(body);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Delete(':id')
  DeleteTask(@Param('id') id: string): Promise<BaseResult<any>> {
    return this.taskService.deleteTask(id);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get(':id')
  GetSwapTaskById(@Param('id') id: string): Promise<BaseResult<any>> {
    return this.taskService.getSwapTaskById(id);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get()
  GetSwapTask(@Query() query: GetSwapTaskDto): Promise<BaseResult<any>> {
    return this.taskService.getSwapTask(query);
  }
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get('stats/changes')
  GetTaskDetails(
    @Query() query: QuerySwapSummary,
  ): Promise<BaseResult<PaginationDto<SwapTaskChanges>>> {
    return this.taskService.getSwapSummary(query);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Delete('cancel/:id')
  CancelTask(@Param('id') id: string): Promise<BaseResult<any>> {
    return this.taskService.cancelTask(id);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Post('reuse')
  ReuseTask(@Body() body: ReuseTaskConfig): Promise<BaseResult<any>> {
    return this.taskService.reuseTask(body);
  }
}
