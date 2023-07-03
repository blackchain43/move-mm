import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CentrifugoService } from './centrifugo.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: async () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
  ],
  providers: [CentrifugoService],
  exports: [CentrifugoService],
})
export class CentrifugoModule {}
