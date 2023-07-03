import { Schema } from '@nestjs/mongoose';

export class Balance {
  token_address: string;
  token_type: string;
  availableBalance: string;
}
@Schema()
export class Wallet {
  address: string;
  balance: Balance;
}
