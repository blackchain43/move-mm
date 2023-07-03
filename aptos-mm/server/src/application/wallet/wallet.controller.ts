import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  SetMetadata,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { BaseResultDto } from 'src/common';
import {
  AddWalletDto,
  CreateWalletDto,
  GetWalletDto,
  MultiSendDto,
} from './dtos';
import { ClaimDto } from './dtos/claim.dto';
import { WalletService } from './wallet.service';
import { Types } from 'aptos';

@ApiTags('WalletService')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  getWallet(@Query() query: GetWalletDto) {
    return this.walletService.getWallet(query);
  }

  @Post()
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  createWallet(@Body() body: CreateWalletDto): Promise<BaseResultDto<any>> {
    return this.walletService.createWallets(body);
  }

  @Post('/multi-send')
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  multiSend(
    @Body() body: MultiSendDto,
  ): Promise<BaseResultDto<Types.Transaction>> {
    return this.walletService.multiSend(body);
  }

  @Get('test/resource')
  test(): Promise<any> {
    return this.walletService.test();
  }

  @Post('/claim')
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  claim(@Body() body: ClaimDto): Promise<BaseResultDto<string[]>> {
    return this.walletService.claim(body);
  }
}
