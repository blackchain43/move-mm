import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WalletInfoDocument = WalletInfo & Document;
@Schema({
  collection: 'aptos-wallet-info',
  timestamps: true,
  toJSON: {
    transform: function (doc, ret, options) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class WalletInfo {
  constructor(
    address: string,
    privateKey: string,
    seedPhrase: string,
    owner: string,
  ) {
    this.address = address;
    this.privateKey = privateKey;
    this.seedPhrase = seedPhrase;
    this.owner = owner;
  }
  @Prop({ default: null })
  address: string;

  @Prop({ default: null })
  privateKey: string;

  @Prop({ default: null })
  seedPhrase: string;

  @Prop({ default: '' })
  owner: string;
}

export const WalletInfoSchema = SchemaFactory.createForClass(WalletInfo);
