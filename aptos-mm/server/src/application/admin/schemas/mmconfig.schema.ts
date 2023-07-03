import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

const DEFAULT_LOWER_BOUND = '0';
const DEFAULT_UPPER_BOUND = '100';
const DEFAULT_STOP_THRESHOLD = '0';

export type MmConfigDocument = MmConfig & Document;
@Schema({
  collection: 'aptos-mm-config',
  timestamps: true,
})
export class MmConfig {
  @Prop({ default: DEFAULT_LOWER_BOUND, required: true })
  lowerBound: string;

  @Prop({ default: DEFAULT_UPPER_BOUND, required: true })
  upperBound: string;

  @Prop({ default: DEFAULT_STOP_THRESHOLD, required: true })
  stopThreshold: string;

  @Prop({ default: null, required: true })
  tokenAType: string;

  @Prop({ default: null, required: true })
  tokenBType: string;

  @Prop({ default: null, required: false })
  baseGasSwap?: string;

  @Prop({ default: null, required: true })
  poolAddress: string;

  @Prop({ default: 9, required: true })
  decimalsA: number;

  @Prop({ default: 9, required: true })
  decimalsB: number;

  @Prop({ default: true, required: true })
  swapAforB: boolean;

  @Prop({ default: 0.1 })
  slippage: number;

  @Prop({ default: null })
  name: string;

  @Prop({ default: null })
  requestor: string;
}

export const MmConfigSchema = SchemaFactory.createForClass(MmConfig);
