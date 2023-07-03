import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty()
  @IsNotEmpty()
  numOfWallets: number;

  @ApiProperty()
  @IsNotEmpty()
  address: string;
}
