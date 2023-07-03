import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MmConfig, MmConfigSchema } from './schemas';
import { CentrifugoModule } from '../centrifugo/centrifugo.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MmConfig.name, schema: MmConfigSchema },
    ]),
    CentrifugoModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
