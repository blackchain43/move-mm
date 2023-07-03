import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export enum SwapTaskStatus {
  CANCELED = 0,
  ON_PLAN = 1,
  IN_PROGRESS = 2,
  COMPLETED = 3,
}
export type SwapTaskDocument = SwapTask & Document;
@Schema({
  collection: 'swap-task',
  timestamps: true,
})
export class SwapTask {
  @Prop({ default: '' })
  swapIntervalName: string;

  @Prop({ default: '' })
  stopSwapIntervalTimeoutName: string;

  @Prop({ default: 0 })
  startTime: number;

  @Prop({ default: 5 * 60 * 1000 }) // 5 minutes
  duration: number;

  @Prop({ default: [] })
  walletList: string[];

  @Prop({ default: [] })
  strategies: string[];

  @Prop({ default: null })
  requestor: string;

  @Prop({ default: [] })
  jobList: string[];

  @Prop({ default: SwapTaskStatus.CANCELED })
  status: SwapTaskStatus;

  @Prop({ default: null })
  name: string;
}

export const SwapTaskSchema = SchemaFactory.createForClass(SwapTask);
