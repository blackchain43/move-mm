import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Delete,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { MmConfigDto, GetThresholdConfig } from './dtos';
import { BaseResult, PaginationDto } from 'src/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
@ApiTags('AdminService')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Post('mmconfig')
  SetThresholdConfig(@Body() body: MmConfigDto): Promise<BaseResult<any>> {
    return this.adminService.setThresholdConfig(body);
  }
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get(':id')
  GetThresholdConfig(
    @Param('id') id: string,
  ): Promise<BaseResult<MmConfigDto>> {
    return this.adminService.getThresholdConfig(id);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get()
  GetAllThresholdConfig(
    @Query() queryParams: GetThresholdConfig,
  ): Promise<BaseResult<MmConfigDto[]>> {
    return this.adminService.getThresholdConfigs(queryParams);
  }
  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Delete(':id')
  DeleteThresholdConfig(@Param('id') id: string): Promise<BaseResult<any>> {
    return this.adminService.deleteThresholdConfig(id);
  }

  @UseGuards(ApiKeyGuard)
  @SetMetadata('requiredApiKey', true)
  @Get('access-token/:requestor')
  GetAccessToken(
    @Param('requestor') requestor: string,
  ): Promise<BaseResult<any>> {
    return this.adminService.generateCentrifugoToken(requestor);
  }
}
