import { Module } from '@nestjs/common';
import { DexService } from './dex.service';
import { DexController } from './dex.controller';
import { AdminModule } from '../admin/admin.module';
import { AdminService } from '../admin/admin.service';
import { WalletModule } from '../wallet/wallet.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SwapHistory,
  SwapHistorySchema,
  SwapProcess,
  SwapProcessSchema,
  SwapTaskChanges,
  SwapTaskChangesSchema,
} from './schemas';
import { MmConfig, MmConfigSchema } from '../admin/schemas';
import { WalletService } from '../wallet/wallet.service';
import { WalletInfo, WalletInfoSchema } from '../wallet/schemas';
import { CentrifugoModule } from '../centrifugo/centrifugo.module';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { SwapTask, SwapTaskSchema } from '../task/schemas';
import { AptosModule } from '../aptos/aptos.module';

@Module({
  imports: [
    AdminModule,
    WalletModule,
    CentrifugoModule,
    AptosModule,
    MongooseModule.forFeature([
      { name: SwapHistory.name, schema: SwapHistorySchema },
      { name: MmConfig.name, schema: MmConfigSchema },
      { name: WalletInfo.name, schema: WalletInfoSchema },
      { name: SwapProcess.name, schema: SwapProcessSchema },
      { name: SwapTask.name, schema: SwapTaskSchema },
      { name: SwapTaskChanges.name, schema: SwapTaskChangesSchema },
    ]),
  ],
  providers: [DexService, AdminService, WalletService, CentrifugoService],
  controllers: [DexController],
  exports: [DexService],
})
export class DexModule {}
