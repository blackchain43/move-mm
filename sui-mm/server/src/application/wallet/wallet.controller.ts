import { SuiTransactionBlockResponse } from '@mysten/sui.js';
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

  @Post('add')
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  addWallet(@Body() body: AddWalletDto): Promise<BaseResultDto<any>> {
    return this.walletService.addWallet(body);
  }

  @Post('/multi-send')
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  multiSend(
    @Body() body: MultiSendDto,
  ): Promise<BaseResultDto<SuiTransactionBlockResponse>> {
    return this.walletService.multiSend(body);
  }

  @Post('/claim')
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  claim(
    @Body() body: ClaimDto,
  ): Promise<BaseResultDto<SuiTransactionBlockResponse[]>> {
    return this.walletService.claim(body);
  }
}
