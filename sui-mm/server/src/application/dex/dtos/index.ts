import { ApiProperty } from '@nestjs/swagger';
export class SwapTokenDto {
  @ApiProperty({ required: true })
  walletAddresses: string[];

  @ApiProperty({ required: true })
  configId: string;

  @ApiProperty({ required: true })
  requestor: string;
}

export class GetSwapHistories {
  @ApiProperty()
  status?: number;
  @ApiProperty()
  address?: string;
  @ApiProperty()
  poolAddress?: string;
  @ApiProperty()
  swapAforB?: boolean;
  @ApiProperty()
  txDigest?: string;
  @ApiProperty({ required: true })
  requestor: string;
}

export class SwapHistoryDto {
  id: string;
  status: number;
  address: string;
  poolAddress: string;
  swapAforB: boolean;
  txDigest: string;
  configName: string;
  gasInfo: {
    totalGasFee: string;
    netGasFee: string;
  };
}

export class DeleteFailSwapHistoriesDto {
  @ApiProperty({ required: true })
  deleteAllPool: boolean;
  @ApiProperty({ required: false })
  poolAddress?: string;
  @ApiProperty({ required: true })
  requestor: string;
}

export class SwapAllTokenDto {
  @ApiProperty({ required: true })
  requestor: string;
  @ApiProperty({ required: true })
  poolAddress: string;
  @ApiProperty({ required: true })
  swapAforB: boolean;
  @ApiProperty({ required: true })
  slippage: number;
  @ApiProperty({ required: true })
  coinTypeA: string;
  @ApiProperty({ required: true })
  coinTypeB: string;
}
