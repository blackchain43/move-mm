import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AddWalletDto {
  @ApiProperty()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  privateKey: string;

  @ApiProperty()
  seedPhrase: string;

  @ApiProperty()
  @IsNotEmpty()
  owner: string;
}
