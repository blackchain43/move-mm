import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuiService } from './sui.service';
import { SuiUtilities } from './sui.utilities';

@Module({
  imports: [],
  providers: [SuiService, SuiUtilities],
  exports: [SuiService, SuiUtilities],
})
export class SuiModule {}
