import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { BaseQueryParams } from 'src/common';

export class GetWalletDto extends BaseQueryParams {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  address: string;
}
