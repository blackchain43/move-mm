import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  SetMetadata,
  UseGuards,
  Param,
} from '@nestjs/common';
import { DexService } from './dex.service';
import {
  SwapTokenDto,
  GetSwapHistories,
  DeleteFailSwapHistoriesDto,
  SwapAllTokenDto,
} from './dtos';
import { BaseResult } from 'src/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from 'src/auth/api-key.guard';

@ApiTags('DexService')
@Controller('dex')
export class DexController {
  constructor(private readonly dexService: DexService) {}
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Post('swap')
  PerformSwap(@Body() payload: SwapTokenDto): BaseResult<any> {
    this.dexService.performSwap(payload);
    return {
      success: true,
      data: 'Processing',
      message: 'Processing',
    };
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get('swap-histories')
  GetSwapHistories(
    @Query() queryParams: GetSwapHistories,
  ): Promise<BaseResult<any>> {
    return this.dexService.getSwapHistories(queryParams);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Delete('fail-swaps')
  DeleteFailSwapHistories(
    @Body() payload: DeleteFailSwapHistoriesDto,
  ): Promise<BaseResult<any>> {
    return this.dexService.deleteFailSwapHistories(payload);
  }
  // @UseGuards(ApiKeyGuard)
  // @SetMetadata('requiredApiKey', true)
  // @Post('swap-all')
  // SwapAllToken(@Body() body: SwapAllTokenDto): BaseResult<any> {
  //   this.dexService.swapAllToken(body);
  //   return {
  //     success: true,
  //     data: 'Processing',
  //     message: 'Processing',
  //   };
  // }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get('swap-state/:address')
  GetSwapState(@Param('address') address: string): Promise<BaseResult<any>> {
    return this.dexService.getSwapState(address);
  }
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get('kill-swap-process/:address')
  KillSwapProcess(@Param('address') address: string): Promise<BaseResult<any>> {
    return this.dexService.killSwapProcess(address);
  }
}
