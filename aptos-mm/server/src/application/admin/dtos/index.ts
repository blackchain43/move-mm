import { ApiProperty } from '@nestjs/swagger';
export class MmConfigDto {
  @ApiProperty({ required: false })
  id?: string;

  @ApiProperty({ required: false })
  stopThreshold?: string;

  @ApiProperty({ required: false })
  lowerBound?: string;

  @ApiProperty({ required: false })
  upperBound?: string;

  @ApiProperty({ required: false })
  tokenAType?: string;

  @ApiProperty({ required: false })
  tokenBType?: string;

  @ApiProperty({ required: false })
  baseGasSwap?: string;

  @ApiProperty({ required: true })
  poolAddress: string;

  @ApiProperty({ required: false })
  decimalsA?: number;

  @ApiProperty({ required: false })
  decimalsB?: number;

  @ApiProperty({ required: true })
  swapAforB: boolean;

  @ApiProperty({ required: false })
  slippage?: number;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: true })
  requestor: string;
}

export class GetThresholdConfig {
  @ApiProperty({ required: false })
  poolAddress?: string;

  @ApiProperty({ required: false })
  swapAforB?: boolean;

  @ApiProperty({ required: false })
  requestor?: string;
}
