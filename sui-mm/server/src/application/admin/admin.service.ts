import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MmConfig, MmConfigDocument } from './schemas';
import { BaseResult } from 'src/common';
import { GetThresholdConfig, MmConfigDto } from './dtos';
import { parseUnits } from 'ethers/lib/utils';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import crypto from 'crypto';
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(MmConfig.name)
    private readonly mmConfigModel: Model<MmConfigDocument>,
    private centrifugoService: CentrifugoService,
  ) {}
  async setThresholdConfig(payload: MmConfigDto): Promise<BaseResult<any>> {
    if (!payload.poolAddress) {
      return {
        success: false,
        message: 'poolAddress must be provided',
        data: null,
      };
    }
    if (!payload.requestor) {
      return {
        success: false,
        message: 'requestor must be provided',
        data: null,
      };
    }
    if (typeof payload.swapAforB !== 'boolean') {
      return {
        success: false,
        message: 'swapAforB must be provided',
        data: null,
      };
    }
    if (
      (payload.swapAforB && isNaN(payload?.decimalsA)) ||
      (!payload.swapAforB && isNaN(payload?.decimalsB))
    ) {
      return {
        success: false,
        message: 'decimalsA or decimalsB must be provided',
        data: null,
      };
    }
    const boundaryDecimal = payload.swapAforB
      ? payload?.decimalsA
      : payload?.decimalsB;
    if (
      !payload?.lowerBound ||
      !payload?.upperBound ||
      !payload?.stopThreshold
    ) {
      return {
        success: false,
        message: 'lowerBound, upperBound and stopThreshold must be provided',
        data: null,
      };
    }
    // ['stopThreshold', 'lowerBound', 'upperBound'].forEach((key) => {
    //   payload[key] = utils.parseUnits(payload[key], boundaryDecimal).toString();
    // });

    if (
      parseUnits(payload?.lowerBound, boundaryDecimal).gte(
        parseUnits(payload?.upperBound, boundaryDecimal),
      )
    ) {
      return {
        success: false,
        message: 'upperBound must be greater than lowerBound',
        data: null,
      };
    }
    if (
      payload?.upperBound &&
      payload?.stopThreshold &&
      parseUnits(payload?.stopThreshold, boundaryDecimal).lt(
        parseUnits(payload?.upperBound, boundaryDecimal),
      )
    ) {
      return {
        success: false,
        message: 'stopThreshold must be greater than upperBound',
        data: null,
      };
    }
    if (payload?.slippage && ![0.1, 0.5, 1].includes(payload?.slippage)) {
      return {
        success: false,
        message: 'slippage not valid',
        data: null,
      };
    }

    const existMmConfig = await this.mmConfigModel
      .findOne<MmConfigDocument>({
        _id: payload?.id,
      })
      .exec();

    if (!existMmConfig) {
      await this.mmConfigModel.insertMany(payload);
      return {
        success: true,
        message: 'Set MM Config Successfully',
        data: payload,
      };
    } else {
      const partialUpdateObj = {};
      [
        'stopThreshold',
        'lowerBound',
        'upperBound',
        'baseGasSwap',
        'poolAddress',
        'decimalsA',
        'decimalsB',
        'swapAforB',
        'slippage',
        'name',
        'tokenAType',
        'tokenBType',
        'requestor',
      ].forEach((key) => {
        if (payload[key] !== null) {
          partialUpdateObj[key] = payload[key];
        }
      });
      const updatedData = await this.mmConfigModel
        .findOneAndUpdate(
          {
            _id: existMmConfig._id,
          },
          {
            $set: {
              ...partialUpdateObj,
            },
          },
          { new: true },
        )
        .exec();
      return {
        success: true,
        message: 'Set MM Config Successfully',
        data: updatedData,
      };
    }
  }
  async getThresholdConfig(id: string): Promise<BaseResult<MmConfigDto>> {
    try {
      const doc = await this.mmConfigModel.findById(id).exec();
      const result = doc.$isEmpty
        ? null
        : {
            id: doc._id,
            stopThreshold: doc.stopThreshold,
            lowerBound: doc.lowerBound,
            upperBound: doc.upperBound,
            tokenAType: doc.tokenAType,
            tokenBType: doc.tokenBType,
            baseGasSwap: doc.baseGasSwap,
            poolAddress: doc.poolAddress,
            decimalsA: doc.decimalsA,
            decimalsB: doc.decimalsB,
            swapAforB: doc.swapAforB,
            slippage: doc.slippage,
            name: doc.name,
            requestor: doc.requestor,
          };
      return {
        success: true,
        message: 'Get MM Config Successfully',
        data: result,
      };
    } catch (e) {
      return {
        success: false,
        message: 'Get MM Config Failed',
        data: null,
      };
    }
  }
  async getThresholdConfigs(
    queryParams: GetThresholdConfig,
  ): Promise<BaseResult<MmConfigDto[]>> {
    const { poolAddress, swapAforB, requestor } = queryParams;
    const query = {};
    if (requestor) {
      query['requestor'] = requestor?.toLowerCase();
    } else {
      return {
        success: true,
        message: 'Get MM Configs Successfully',
        data: [],
      };
    }
    if (poolAddress) {
      query['poolAddress'] = poolAddress?.toLowerCase();
    }

    if (swapAforB) {
      query['swapAforB'] = swapAforB;
    }
    const baseQuery = this.mmConfigModel.find(query);
    const docs = await baseQuery.exec();
    const result = docs.map((doc) => ({
      id: doc._id,
      stopThreshold: doc.stopThreshold,
      lowerBound: doc.lowerBound,
      upperBound: doc.upperBound,
      tokenAType: doc.tokenAType,
      tokenBType: doc.tokenBType,
      baseGasSwap: doc.baseGasSwap,
      poolAddress: doc.poolAddress,
      decimalsA: doc.decimalsA,
      decimalsB: doc.decimalsB,
      swapAforB: doc.swapAforB,
      slippage: doc.slippage,
      name: doc.name,
      requestor: doc.requestor,
    }));
    return {
      success: true,
      message: 'Get MM Configs Successfully',
      data: result,
    };
  }
  async getThresholdConfigById(configId): Promise<MmConfigDto> {
    const docs = await this.mmConfigModel.findOne({ _id: configId }).exec();
    if (!docs) return null;
    return {
      id: docs._id,
      stopThreshold: docs.stopThreshold,
      lowerBound: docs.lowerBound,
      upperBound: docs.upperBound,
      tokenAType: docs.tokenAType,
      tokenBType: docs.tokenBType,
      baseGasSwap: docs.baseGasSwap,
      poolAddress: docs.poolAddress,
      decimalsA: docs.decimalsA,
      decimalsB: docs.decimalsB,
      swapAforB: docs.swapAforB,
      slippage: docs.slippage,
      name: docs.name,
      requestor: docs.requestor,
    } as MmConfigDto;
  }
  async deleteThresholdConfig(id: string): Promise<BaseResult<any>> {
    const existMmConfig = await this.mmConfigModel
      .exists({
        id: id,
      })
      .exec();
    if (!existMmConfig) {
      return {
        success: false,
        message: 'MM Config not found',
        data: null,
      };
    }
    await this.mmConfigModel.deleteOne({ _id: existMmConfig._id }).exec();
    return {
      success: true,
      message: 'Delete MM Config Successfully',
      data: existMmConfig._id,
    };
  }
  async generateCentrifugoToken(userAddress: string): Promise<BaseResult<any>> {
    const accessTokenInfo = {
      accessToken: await this.centrifugoService.generateToken(userAddress),
      channel: crypto
        .createHash('md5')
        .update(`${userAddress.toLowerCase()}_account_stream`, 'utf-8')
        .digest('hex'),
      expiresIn: Date.now() + 60 * 60 * 1000,
    };
    return {
      success: true,
      message: 'Successfully generate token',
      data: accessTokenInfo,
    };
  }
}
