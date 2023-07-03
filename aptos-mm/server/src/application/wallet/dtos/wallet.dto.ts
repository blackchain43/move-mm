import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseDto } from 'src/common';

export class WalletDto extends BaseDto {
  @ApiProperty()
  @Expose()
  address: string;
}
