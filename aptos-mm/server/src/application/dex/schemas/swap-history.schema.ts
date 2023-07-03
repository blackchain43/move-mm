import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export enum SwapStatus {
  success = 1,
  failure = 0,
}

export class GasInfo {
  totalGasFee: string;
  netGasFee: string;
}
export type SwapHistoryDocument = SwapHistory & Document;
@Schema({
  collection: 'aptos-swap-mm-history',
  timestamps: true,
})
export class SwapHistory {
  @Prop({ default: SwapStatus.failure })
  status: number;

  @Prop({ default: null })
  txDigest: string;

  @Prop({ default: null })
  address: string;

  @Prop({ default: null })
  poolAddress: string;

  @Prop({ default: true })
  swapAforB: boolean;

  @Prop({
    default: {
      totalGasFee: '0',
      netGasFee: '0',
    },
  })
  gasInfo: GasInfo;

  @Prop({ default: null })
  configId: string;

  @Prop({ default: null })
  configName: string;

  @Prop({ default: null })
  requestor: string;

  @Prop({ default: null })
  jobName: string;
}

export const SwapHistorySchema = SchemaFactory.createForClass(SwapHistory);
