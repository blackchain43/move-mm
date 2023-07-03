import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SwapTaskChangesDocument = SwapTaskChanges & Document;
@Schema({
  collection: 'aptos-swap-task-history',
  timestamps: true,
})
export class SwapTaskChanges {
  @Prop({ default: null })
  walletAddress: string;

  @Prop({ default: '0' })
  tokenAChange: string;

  @Prop({ default: '0' })
  tokenBChange: string;

  @Prop({ default: '0' })
  gasUsed: string;

  @Prop({ default: null })
  requestor: string;

  @Prop({ default: null })
  jobName: string;

  @Prop({ default: null })
  configId: string;
}

export const SwapTaskChangesSchema =
  SchemaFactory.createForClass(SwapTaskChanges);
