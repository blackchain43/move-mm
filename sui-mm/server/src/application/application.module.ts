import { Module } from '@nestjs/common';
import { SuiModule } from './sui/sui.module';
import { WalletModule } from './wallet/wallet.module';
import { DexModule } from './dex/dex.module';
import { AdminModule } from './admin/admin.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [SuiModule, DexModule, AdminModule, WalletModule, TaskModule],
})
export class ApplicationModule {}
