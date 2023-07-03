import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { DexModule } from './dex/dex.module';
import { AdminModule } from './admin/admin.module';
import { TaskModule } from './task/task.module';
import { AptosModule } from './aptos/aptos.module';

@Module({
  imports: [AptosModule, DexModule, AdminModule, WalletModule, TaskModule],
})
export class ApplicationModule {}
