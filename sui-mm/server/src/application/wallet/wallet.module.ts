import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { SuiUtilities } from '../sui/sui.utilities';
import { SuiModule } from '../sui/sui.module';
import { WalletInfo, WalletInfoSchema } from './schemas';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletInfo.name, schema: WalletInfoSchema },
    ]),
    SuiModule,
  ],
  providers: [WalletService, SuiUtilities],
  controllers: [WalletController],
  exports: [],
})
export class WalletModule {}
