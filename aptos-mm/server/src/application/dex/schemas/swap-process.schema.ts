import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SwapProcessDocument = SwapProcess & Document;
@Schema({
  collection: 'aptos-swap-process',
  timestamps: true,
})
export class SwapProcess {
  @Prop({ default: false })
  isProcessing: boolean;

  @Prop({ default: '' })
  requestor: string;

  @Prop({ default: '' })
  swapResult: string;

  @Prop({ default: false })
  killProcess: boolean;
}

export const SwapProcessSchema = SchemaFactory.createForClass(SwapProcess);
