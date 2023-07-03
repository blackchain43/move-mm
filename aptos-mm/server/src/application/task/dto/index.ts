import { ApiProperty, PickType } from '@nestjs/swagger';
import { SwapTaskStatus } from '../schemas';
import { BaseQueryParams } from 'src/common';

export class CreateTaskSwap {
  @ApiProperty({ required: true })
  startTime: number;

  @ApiProperty({ required: true })
  duration: number;

  @ApiProperty({ required: true })
  strategies: string[];

  @ApiProperty({ required: true })
  requestor: string;

  @ApiProperty({ required: true })
  wallets: string[];

  @ApiProperty({ required: true })
  name: string;
}

export class GetSwapTaskDto {
  @ApiProperty({ required: true })
  requestor: string;

  @ApiProperty({ required: false })
  swapIntervalName?: string;

  @ApiProperty({ required: false })
  stopSwapIntervalTimeoutName?: string;

  @ApiProperty({ required: false })
  startTime?: number;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty({ required: false })
  status?: number;

  @ApiProperty({ required: false })
  name?: number;
}

export class QuerySwapSummary extends PickType(BaseQueryParams, [
  'size',
  'page',
  'orderBy',
  'desc',
] as const) {
  @ApiProperty({ required: false })
  taskId: string;
}

export class ReuseTaskConfig {
  @ApiProperty({ required: true })
  taskId: string;

  @ApiProperty({ required: true })
  startTime: number;
}
