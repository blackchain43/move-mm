import { Module } from '@nestjs/common';
import { AptosUtilities } from './aptos.utilities';

@Module({
  imports: [],
  providers: [AptosUtilities],
  exports: [AptosUtilities],
})
export class AptosModule {}
