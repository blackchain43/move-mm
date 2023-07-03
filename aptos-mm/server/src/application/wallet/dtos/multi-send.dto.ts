import { ApiProperty } from '@nestjs/swagger';

export class MultiSendDto {
  @ApiProperty()
  owner: string;

  @ApiProperty({ required: true })
  coinType: string;

  @ApiProperty({ required: true })
  addresses: string[];

  @ApiProperty({ required: false })
  amounts?: string[];
}
