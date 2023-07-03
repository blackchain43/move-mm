import crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseResult, PaginationDto } from 'src/common';
import { AppConfiguration, InjectAppConfig } from 'src/config';
import { SDK, convertValueToDecimal } from '@pontem/liquidswap-sdk';
import { AdminService } from '../admin/admin.service';
import { WalletService } from '../wallet/wallet.service';
import {
  DeleteFailSwapHistoriesDto,
  GetSwapHistories,
  SwapAllTokenDto,
  SwapHistoryDto,
  SwapTokenDto,
} from './dtos';
import {
  SwapHistory,
  SwapHistoryDocument,
  SwapProcess,
  SwapStatus,
  SwapProcessDocument,
  SwapTaskChanges,
  SwapTaskChangesDocument,
} from './schemas';
import { parseUnits } from 'ethers/lib/utils';
import random from 'lodash/random';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { SwapTask, SwapTaskDocument, SwapTaskStatus } from '../task/schemas';
import { QuerySwapSummary } from '../task/dto';
import { MmConfig, MmConfigDocument } from '../admin/schemas';
import { mainnetOptions } from 'src/config/mainnet_config.pontem';
import Decimal from 'decimal.js';
import { AptosAccount } from 'aptos';
import { CurveType } from '@pontem/liquidswap-sdk/dist/tsc/types/aptos';
import {
  VERSION_0_5,
  VERSION_0,
} from '@pontem/liquidswap-sdk/dist/tsc/constants';
import { testnetOptions } from 'src/config/testnet_config.pontem';
// const MINT_SWAP_ALL_AMOUNT = BigInt(1000);
@Injectable()
export class DexService {
  logger = new Logger('DexService');
  constructor(
    private readonly adminService: AdminService,
    private readonly walletService: WalletService,
    private centrifugoService: CentrifugoService,
    @InjectAppConfig()
    private appConfig: AppConfiguration,
    @InjectModel(SwapHistory.name)
    private readonly swapHistoryModel: Model<SwapHistoryDocument>,
    @InjectModel(SwapProcess.name)
    private readonly swapProcessModel: Model<SwapProcessDocument>,
    @InjectModel(SwapTask.name)
    private readonly swapTasksModel: Model<SwapTaskDocument>,
    @InjectModel(SwapTaskChanges.name)
    private readonly swapTaskChangeModel: Model<SwapTaskChangesDocument>,
    @InjectModel(MmConfig.name)
    private readonly mmConfigModel: Model<MmConfigDocument>,
  ) {}
  async performSwap(payload: SwapTokenDto, jobName?: string): Promise<void> {
    try {
      const requestor = payload?.requestor?.toLowerCase();
      if (!jobName) {
        const processState = await this.swapProcessModel.findOne(
          {
            requestor,
          },
          {
            isProcessing: true,
          },
        );
        if (processState?.isProcessing) return;
        await this.swapProcessModel.updateOne(
          {
            requestor,
          },
          {
            $set: {
              requestor: payload.requestor,
              isProcessing: true,
              killProcess: false,
              swapResult: '',
            },
          },
          { upsert: true },
        );
      }
      let { walletAddresses } = payload;
      walletAddresses = walletAddresses.map((w) => w?.toLowerCase());
      // find mmconfig for pool(poolAddress)
      const mmConfig = await this.adminService.getThresholdConfigById(
        payload.configId,
      );
      if (!mmConfig) {
        this.logger.error('MM Config not found');
        return;
      }
      const signers = await this.walletService.getAccountByAddresses(
        walletAddresses,
      );
      // calculate stop index when sum of randomAmount reach to stopThreshold
      const decimals = mmConfig.swapAforB
        ? mmConfig.decimalsA
        : mmConfig.decimalsB;
      let stopThreshold = BigInt(
        parseUnits(mmConfig.stopThreshold, decimals).toString(),
      );
      const swapHistories = [];
      const swapTaskChanges = new Map<
        string,
        {
          tokenAChange: bigint;
          tokenBChange: bigint;
          gasUsed: bigint;
        }
      >();
      let counter = 0;
      const zero = BigInt(0);
      let randomAmount = this.newRandAmount(
        +mmConfig.lowerBound,
        +mmConfig.upperBound,
        decimals,
      );
      while (
        stopThreshold - BigInt(randomAmount.toString()) >= zero &&
        counter < Number(this.appConfig.suiNetwork.maxSwapAttempts)
      ) {
        if (!jobName) {
          const killProcess = await this.swapProcessModel
            .findOne({
              requestor,
            })
            .exec()
            .then((d) => d.killProcess);
          if (killProcess === true) break;
        } else {
          const taskInfo = await this.swapTasksModel
            .findOne(
              {
                jobList: {
                  $all: [jobName],
                },
                requestor,
                strategies: {
                  $all: [payload.configId],
                },
              },
              {
                status: true,
              },
            )
            .exec();
          this.logger.log(`task info: ${JSON.stringify(taskInfo)}`);
          if (
            [SwapTaskStatus.CANCELED, SwapTaskStatus.COMPLETED].includes(
              taskInfo?.status,
            )
          )
            break;
        }
        const randWalletIdx = random(0, signers.length - 1, false);
        const txReceipt = await this.createSwapTx(
          signers[randWalletIdx],
          randomAmount,
          mmConfig.slippage,
          mmConfig.swapAforB ? mmConfig.tokenAType : mmConfig.tokenBType,
          mmConfig.swapAforB ? mmConfig.tokenBType : mmConfig.tokenAType,
        );
        let txStatus = false;
        if (txReceipt?.data?.success) {
          stopThreshold = stopThreshold - BigInt(randomAmount.toString());
          txStatus = true;
        }
        const gasInfo = {
          totalGasFee: txReceipt?.data ? txReceipt?.data?.max_gas_amount : '0',
          netGasFee: txReceipt?.data ? txReceipt?.data?.gas_used : '0',
        };
        swapHistories.push({
          status: txStatus ? SwapStatus.success : SwapStatus.failure,
          txDigest: txReceipt?.data?.hash,
          address: txReceipt?.address,
          poolAddress: mmConfig.poolAddress,
          gasInfo,
          configId: payload.configId,
          configName: mmConfig.name,
          requestor,
          jobName,
          swapAforB: mmConfig.swapAforB,
        });
        if (jobName && txReceipt?.data && txStatus) {
          const { amountIn, amountOut } = txReceipt;
          if (swapTaskChanges.get(txReceipt?.address)) {
            const { tokenAChange, tokenBChange, gasUsed } = swapTaskChanges.get(
              txReceipt?.address,
            );
            swapTaskChanges.set(txReceipt?.address, {
              tokenAChange: mmConfig.swapAforB
                ? tokenAChange - BigInt(amountIn)
                : tokenAChange + BigInt(amountOut),
              tokenBChange: mmConfig.swapAforB
                ? tokenBChange + BigInt(amountOut)
                : tokenBChange - BigInt(amountIn),
              gasUsed: gasUsed + BigInt(gasInfo.netGasFee),
            });
          } else {
            swapTaskChanges.set(txReceipt?.address, {
              tokenAChange: mmConfig.swapAforB
                ? BigInt(`-${amountIn}`)
                : BigInt(`${amountOut}`),
              tokenBChange: mmConfig.swapAforB
                ? BigInt(`${amountOut}`)
                : BigInt(`-${amountIn}`),
              gasUsed: BigInt(gasInfo.netGasFee),
            });
          }
        }
        await this.sleepRand();
        randomAmount = this.newRandAmount(
          +mmConfig.lowerBound,
          +mmConfig.upperBound,
          decimals,
        );
        counter++;
        if (stopThreshold === zero) {
          this.logger.log(
            `running with address: ${signers[
              randWalletIdx
            ].address()} -  next randomAmount: ${randomAmount.toString()} - stop threshold remains: 0 - counter: ${counter}`,
          );
          break;
        }
        if (
          stopThreshold - BigInt(randomAmount.toString()) <= zero ||
          counter === Number(this.appConfig.suiNetwork.maxSwapAttempts)
        ) {
          randomAmount = new Decimal(stopThreshold.toString());
        }
        this.logger.log(
          `running with address: ${
            txReceipt?.address
          } -  next randomAmount: ${randomAmount.toString()} - stop threshold remains: ${stopThreshold.toString()} - counter: ${counter}`,
        );
      }
      // save to history
      await this.swapHistoryModel.insertMany(swapHistories);
      const numSuccessSwaps = swapHistories.filter(
        (h) => h.status === SwapStatus.success,
      ).length;
      this.logger.log(
        `Done swap with ${numSuccessSwaps} success swaps/${counter} tries`,
      );
      if (!jobName) {
        await this.swapProcessModel.updateOne(
          {
            requestor,
          },
          {
            $set: {
              requestor,
              isProcessing: false,
              swapResult: `${numSuccessSwaps} success swaps/${counter} transactions`,
            },
          },
          { upsert: true },
        );
        const requestorChannel = crypto
          .createHash('md5')
          .update(
            `${payload?.requestor?.toLowerCase()}_account_stream`,
            'utf-8',
          )
          .digest('hex');
        await this.centrifugoService.publishMessage({
          message: `${numSuccessSwaps} success swaps/${counter} transactions`,
          channel: requestorChannel,
        });
      } else {
        const swapChanges = Object.entries(
          Object.fromEntries(swapTaskChanges),
        ).map(([key, value]) => {
          return {
            walletAddress: key,
            gasUsed: value.gasUsed?.toString(),
            tokenAChange: value.tokenAChange?.toString(),
            tokenBChange: value.tokenBChange?.toString(),
            requestor,
            jobName,
            configId: payload.configId,
          };
        });
        this.logger.log(`Swap changes ${JSON.stringify(swapChanges)}`);
        await this.swapTaskChangeModel.insertMany(swapChanges);
      }
    } catch (e) {
      this.logger.log(`error: ${e}`);
      await this.swapProcessModel.updateOne(
        {
          requestor: payload?.requestor?.toLowerCase(),
        },
        {
          $set: {
            requestor: payload?.requestor?.toLowerCase(),
            isProcessing: false,
            killProcess: false,
            swapResult: 'Error while swap',
          },
        },
        { upsert: true },
      );
    }
  }
  async createSwapTx(
    signer: AptosAccount,
    swapAmount: Decimal,
    slippage: number,
    fromTokenType: string,
    toTokenType: string,
  ): Promise<any> {
    try {
      const connectionPool = JSON.parse(
        this.appConfig.aptosNetwork.connectionPool ??
          `["${this.appConfig.aptosNetwork.rpcUrl.testnet}"]`,
      );

      const sdk = new SDK({
        nodeUrl: connectionPool[random(0, connectionPool.length - 1, false)], // Node URL, required
        networkOptions: testnetOptions,
      });
      const calculateRatesParams = {
        fromToken: fromTokenType,
        toToken: toTokenType,
        amount: swapAmount,
        interactiveToken: 'from' as 'from' | 'to',
        curveType: 'uncorrelated' as CurveType,
        version: VERSION_0 as typeof VERSION_0,
      };
      const output = await sdk.Swap.calculateRates(calculateRatesParams).then(
        (data) => new Decimal(data),
      );

      const transactionPayload = await sdk.Swap.createSwapTransactionPayload({
        fromToken: fromTokenType,
        toToken: toTokenType,
        interactiveToken: 'from',
        fromAmount: swapAmount, // 1 APTOS, or you can use convertValueToDecimal(1, 8)
        toAmount: output, // 4.304638 USDT, or you can use convertValueToDecimal(4.304638, 6)
        slippage: slippage / 100, // 0.5% (1 - 100%, 0 - 0%)
        stableSwapType: 'high',
        curveType: 'uncorrelated',
        version: VERSION_0,
      });
      const rawTxn = await sdk.client.generateTransaction(
        signer.address(),
        transactionPayload,
      );
      const bcsTxn = await sdk.client.signTransaction(signer, rawTxn);
      const { hash } = await sdk.client.submitTransaction(bcsTxn);
      const txReceipt = await sdk.client.waitForTransactionWithResult(hash);
      return {
        data: txReceipt,
        address: (txReceipt as any)?.sender,
        amountIn: swapAmount.toString(),
        amountOut: output.toString(),
      };
    } catch (e) {
      console.log(
        `error when swap: ${e} with address: ${signer.address().toString()}`,
      );
      return {
        data: null,
        address: signer.address().toString(),
        amountIn: '0',
        amountOut: '0',
      };
    }
  }
  newRandAmount(
    lowerBound: number,
    upperBound: number,
    decimals: number,
  ): Decimal {
    return convertValueToDecimal(
      random(lowerBound, upperBound, true).toFixed(4),
      decimals,
    );
  }
  async sleepRand(): Promise<any> {
    const sleepDuration = +random(0.2, 0.5, true).toFixed(3) * 1000;
    this.logger.log(`Sleeping for ${sleepDuration} ms`);
    return new Promise((resolve) => setTimeout(resolve, sleepDuration));
  }
  async testSwap() {
    const result = await this.createSwapTx(
      AptosAccount.fromAptosAccountObject({
        privateKeyHex:
          '447a66a950feaa5a183e8092a8c630582fd54d5fd5b657242e369db94f7a4721',
      }),
      new Decimal(3000000),
      0.5,
      this.appConfig.aptosNetwork.aptosCoin,
      '0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT',
    );
    console.log(result);
  }
  async getSwapHistories(
    params: GetSwapHistories,
  ): Promise<BaseResult<SwapHistoryDto[]>> {
    const { status, address, poolAddress, swapAforB, txDigest } = params;
    const requestor = params?.requestor?.toLowerCase();
    const query = {
      requestor: requestor,
    };
    if (poolAddress) {
      query['poolAddress'] = poolAddress;
    }
    if (swapAforB) {
      query['swapAforB'] = swapAforB;
    }
    if (status) {
      query['status'] = status;
    }
    if (address) {
      query['address'] = address;
    }
    if (txDigest) {
      query['txDigest'] = txDigest;
    }
    const docs = await this.swapHistoryModel.find(query).exec();
    const result = docs.map((doc) => ({
      id: doc._id,
      status: doc.status,
      poolAddress: doc.poolAddress,
      swapAforB: doc.swapAforB,
      address: doc.address,
      gasInfo: doc.gasInfo,
      txDigest: doc.txDigest,
      configId: doc.configId,
      configName: doc.configName,
      requestor: doc.requestor,
    }));
    return {
      success: true,
      message: 'Get Swap Histories Successfully',
      data: result,
    };
  }
  async deleteFailSwapHistories(
    payload: DeleteFailSwapHistoriesDto,
  ): Promise<BaseResult<any>> {
    const { deleteAllPool, poolAddress, requestor } = payload;
    if (
      (deleteAllPool === true && poolAddress) ||
      (deleteAllPool === false && !poolAddress) ||
      !requestor
    ) {
      return {
        success: false,
        message: 'Invalid Params',
        data: null,
      };
    }
    const query = {
      status: {
        $eq: SwapStatus.failure,
      },
      requestor: requestor?.toLowerCase(),
      jobName: {
        $eq: null,
      },
    };
    if (deleteAllPool) {
      query['poolAddress'] = {
        $exists: true,
      };
    }
    if (poolAddress) {
      query['poolAddress'] = {
        $eq: poolAddress,
      };
    }
    try {
      await this.swapHistoryModel.deleteMany(query);

      return {
        success: true,
        message: 'Successfully Deleted Swap Histories',
        data: true,
      };
    } catch (e) {
      return {
        success: false,
        message: 'Failed to Delete Swap Histories',
        data: null,
      };
    }
  }
  async getSwapState(address: string): Promise<BaseResult<any>> {
    const state = await this.swapProcessModel
      .findOne(
        {
          requestor: address.toLowerCase(),
        },
        {
          isProcessing: true,
        },
      )
      .exec();
    if (!state) {
      return {
        success: true,
        message: 'No Swap State Found',
        data: false,
      };
    }
    return {
      success: true,
      message: 'Get Swap State Successfully',
      data: state,
    };
  }
  async killSwapProcess(address: string) {
    await this.swapProcessModel
      .updateOne(
        {
          requestor: address?.toLowerCase(),
        },
        {
          $set: {
            killProcess: true,
            isProcessing: false,
          },
        },
      )
      .exec();
    return {
      success: true,
      message: 'Kill Swap Process Successfully',
      data: true,
    };
  }
  async getSwapSummaryByTask(
    taskInfo: SwapTask,
    queryParams: QuerySwapSummary,
  ): Promise<PaginationDto<SwapTaskChanges>> {
    const { page, size, orderBy, desc } = queryParams;
    try {
      const sort = orderBy
        ? { [orderBy]: desc ? 1 : -1 }
        : {
            createdAt: desc ? 1 : -1,
          };
      const query = {
        requestor: taskInfo.requestor,
        configId: {
          $in: taskInfo.strategies,
        },
        jobName: {
          $in: taskInfo.jobList,
        },
      };
      const swapTaskChanges = await this.swapTaskChangeModel
        .find(query)
        .sort(sort as any)
        .skip((page - 1) * size)
        .limit(size)
        .exec();

      const total = await this.swapTaskChangeModel.countDocuments(query).exec();
      if (!swapTaskChanges.length) {
        return new PaginationDto([], total, page, size);
      }
      const result = [];
      for (const change of swapTaskChanges) {
        // get config name of change
        const config = await this.mmConfigModel.findOne({
          _id: change.configId,
        });
        result.push({
          configName: config.name,
          taskName: taskInfo?.name,
          ...change['_doc'],
        });
      }
      return new PaginationDto(result, total, page, size);
    } catch (e) {
      return new PaginationDto([], 0, page, size);
    }
  }
}

//   async swapAllToken(payload: SwapAllTokenDto) {
//     const { poolAddress, swapAforB, slippage, coinTypeA, coinTypeB } = payload;
//     const requestor = payload?.requestor?.toLowerCase();
//     const processState = await this.swapProcessModel.findOne(
//       {
//         requestor,
//       },
//       {
//         isProcessing: true,
//       },
//     );
//     if (processState?.isProcessing) return;
//     await this.swapProcessModel.updateOne(
//       {
//         requestor,
//       },
//       {
//         $set: {
//           requestor: requestor?.toLowerCase(),
//           isProcessing: true,
//           killProcess: false,
//           swapResult: '',
//         },
//       },
//       { upsert: true },
//     );
//     // const poolInfo = await this.sdk.Pool.getPool(poolAddress);
//     // if (!poolInfo) {
//     //   this.logger.error('No pool found');
//     //   return;
//     // }
//     const slippagePercent = Percentage.fromDecimal(d(slippage));
//     const tokenMetadata = await this.sdk.Token.getTokenListByCoinTypes([
//       coinTypeA,
//       coinTypeB,
//     ]);
//     const coinType = swapAforB ? coinTypeA : coinTypeB;
//     // get all wallets belongs to requestor
//     const walleList = await this.walletService.getAllWalletsByOwner(requestor);
//     const totalSelectedWallets = walleList.length;
//     const swapHistories = [];
//     while (walleList.length) {
//       const killProcess = await this.swapProcessModel
//         .findOne({
//           requestor,
//         })
//         .exec()
//         .then((d) => d.killProcess);
//       if (killProcess === true) break;
//       const randWalletIdx = random(0, walleList.length - 1, false);
//       const signer = new RawSigner(
//         walleList[randWalletIdx].keypair,
//         this.suiUtils.createRandomProvider(),
//       );
//       // get token balance of wallet
//       const balance = await this.suiUtils
//         .getOwnedCoin(walleList[randWalletIdx].address, coinType)
//         .then((c) => c.reduce((a, b) => a + BigInt(b.balance), BigInt(0)));
//       this.logger.log(
//         `address: ${
//           walleList[randWalletIdx].address
//         } - balance: ${balance.toString()}`,
//       );
//       if (balance <= MINT_SWAP_ALL_AMOUNT) {
//         walleList.splice(randWalletIdx, 1);
//         continue;
//       }
//       const txEffect = await this.createSwapTx(
//         signer,
//         poolAddress,
//         walleList[randWalletIdx].address,
//         swapAforB,
//         new BN(balance.toString()),
//         slippagePercent,
//         tokenMetadata[coinTypeA]?.decimals,
//         tokenMetadata[coinTypeB]?.decimals,
//       );
//       if (txEffect?.data) {
//         // remove wallet with randWalletIdx from walleList
//         walleList.splice(randWalletIdx, 1);
//       }
//       swapHistories.push({
//         status: txEffect?.data?.status
//           ? SwapStatus[txEffect?.data?.status.status]
//           : SwapStatus.failure,
//         txDigest: txEffect?.data?.transactionDigest,
//         address: txEffect?.address,
//         poolAddress: poolAddress,
//         gasInfo: txEffect?.data
//           ? this.suiUtils.calculateGasFeeInfo(txEffect?.data?.gasUsed)
//           : {},
//         configId: 'SWAP_ALL',
//         configName: 'SWAP_ALL',
//         requestor,
//       });
//       await this.sleepRand();
//     }
//     // save to history
//     await this.swapHistoryModel.insertMany(swapHistories);
//     const numSuccessSwaps = swapHistories.filter(
//       (h) => h.status === SwapStatus.success,
//     ).length;
//     this.logger.log(
//       `Done swap with ${numSuccessSwaps} success swaps/${totalSelectedWallets} tries`,
//     );
//     await this.swapProcessModel.updateOne(
//       {
//         requestor: payload.requestor.toLowerCase(),
//       },
//       {
//         $set: {
//           requestor: payload.requestor.toLowerCase(),
//           isProcessing: false,
//           swapResult: `${numSuccessSwaps} success swaps/${totalSelectedWallets} transactions`,
//         },
//       },
//       { upsert: true },
//     );
//     const requestorChannel = crypto
//       .createHash('md5')
//       .update(`${payload.requestor.toLowerCase()}_account_stream`, 'utf-8')
//       .digest('hex');
//     await this.centrifugoService.publishMessage({
//       message: `${numSuccessSwaps} success swaps/${totalSelectedWallets} transactions`,
//       channel: requestorChannel,
//     });
//   }
