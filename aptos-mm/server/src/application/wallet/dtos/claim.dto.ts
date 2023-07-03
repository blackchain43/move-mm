import { ApiProperty } from '@nestjs/swagger';

export class ClaimDto {
  @ApiProperty()
  targetAddress: string;

  @ApiProperty({ required: true })
  coinType: string;

  @ApiProperty({ required: true })
  addresses: string[];
}
