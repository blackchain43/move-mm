import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AptosModule } from '../aptos/aptos.module';
import { WalletInfo, WalletInfoSchema } from './schemas';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletInfo.name, schema: WalletInfoSchema },
    ]),
    AptosModule,
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [],
})
export class WalletModule {}
