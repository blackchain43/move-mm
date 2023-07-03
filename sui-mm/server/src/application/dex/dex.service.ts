import {
  Percentage,
  Pool,
  SDK,
  adjustForSlippage,
  d,
  sendTransaction,
} from '@cetusprotocol/cetus-sui-clmm-sdk/dist/index';
import crypto from 'crypto';
import { RawSigner } from '@mysten/sui.js';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import BN, * as bignum from 'bn.js';
import { Document, Model, Types } from 'mongoose';
import { BaseResult, PaginationDto } from 'src/common';
import { AppConfiguration, InjectAppConfig } from 'src/config';
import { mainnet } from 'src/config/mainnet_config.cetus';
import { testnet } from 'src/config/testnet_config.cetus';
import { AdminService } from '../admin/admin.service';
import { SuiUtilities } from '../sui/sui.utilities';
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
import { Subject } from 'rxjs';
import { CentrifugoService } from '../centrifugo/centrifugo.service';
import { SwapTask, SwapTaskDocument, SwapTaskStatus } from '../task/schemas';
import { QuerySwapSummary } from '../task/dto';
import { MmConfig, MmConfigDocument } from '../admin/schemas';
enum SDK_ENV {
  mainnet = 'mainnet',
  testnet = 'testnet',
}
const MINT_SWAP_ALL_AMOUNT = BigInt(1000);
@Injectable()
export class DexService {
  sdk: SDK;
  swapSubject = new Subject<any>();
  logger = new Logger('DexService');
  constructor(
    private readonly suiUtils: SuiUtilities,
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
  ) {
    this.sdk = this.buildDexSdk(SDK_ENV.mainnet);
    // this.sdk.senderAddress = this.suiUtils
    //   .getKeypairFromPrivKey(this.appConfig.marketMaker.sourceWalletPk)
    //   .getPublicKey()
    //   .toSuiAddress();
  }
  buildSdkOptions(currSdkEnv: SDK_ENV) {
    switch (currSdkEnv) {
      case SDK_ENV.mainnet:
        return mainnet;
      case SDK_ENV.testnet:
        return testnet;
    }
  }
  buildDexSdk(currSdkEnv: SDK_ENV): SDK {
    const sdkEnv = this.buildSdkOptions(currSdkEnv);
    const sdk = new SDK(sdkEnv);
    return sdk;
  }
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
      // check if payload.walletAddresses is enough balance and gas to perform swap
      const wallets = await this.walletService.getWalletKeypairByAddresses(
        walletAddresses,
      );
      // const runWallets: Array<[Ed25519Keypair, string, BN]> = [];
      // const poolInfo = await this.sdk.Pool.getPool(mmConfig.poolAddress);
      const slippage = Percentage.fromDecimal(d(mmConfig.slippage));
      // const provider = this.suiUtils.getProvider();
      // calculate stop index when sum of randomAmount reach to stopThreshold
      const decimals = mmConfig.swapAforB
        ? mmConfig.decimalsA
        : mmConfig.decimalsB;
      let stopThreshold = new bignum.BN(
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
      const zero = new bignum.BN(0);
      let randomAmount = this.newRandAmount(
        +mmConfig.lowerBound,
        +mmConfig.upperBound,
        decimals,
      );

      while (
        stopThreshold.sub(randomAmount).gte(zero) &&
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

        const randWalletIdx = random(0, wallets.length - 1, false);
        const signer = new RawSigner(
          wallets[randWalletIdx],
          this.suiUtils.createRandomProvider(),
        );
        const address = wallets[randWalletIdx]
          .getPublicKey()
          .toSuiAddress()
          .toLowerCase();
        const txEffect = await this.createSwapTx(
          signer,
          mmConfig.poolAddress,
          address,
          mmConfig.swapAforB,
          randomAmount,
          slippage,
          mmConfig.decimalsA,
          mmConfig.decimalsB,
        );
        if (txEffect?.data) {
          stopThreshold = stopThreshold.sub(randomAmount);
        }
        const gasInfo = txEffect?.data
          ? this.suiUtils.calculateGasFeeInfo(txEffect?.data?.gasUsed)
          : {
              totalGasFee: '0',
              netGasFee: '0',
            };
        swapHistories.push({
          status: txEffect?.data?.status
            ? SwapStatus[txEffect?.data?.status.status]
            : SwapStatus.failure,
          txDigest: txEffect?.data?.transactionDigest,
          address: address,
          poolAddress: txEffect?.poolAddress,
          gasInfo,
          configId: payload.configId,
          configName: mmConfig.name,
          requestor,
          jobName,
        });
        if (
          jobName &&
          txEffect?.data &&
          SwapStatus[txEffect?.data?.status.status]
        ) {
          const { amountIn, amountOut } = txEffect;
          if (swapTaskChanges.get(address)) {
            const { tokenAChange, tokenBChange, gasUsed } =
              swapTaskChanges.get(address);
            swapTaskChanges.set(address, {
              tokenAChange: mmConfig.swapAforB
                ? tokenAChange - BigInt(amountIn)
                : tokenAChange + BigInt(amountOut),
              tokenBChange: mmConfig.swapAforB
                ? tokenBChange + BigInt(amountOut)
                : tokenBChange - BigInt(amountIn),
              gasUsed: gasUsed + BigInt(gasInfo.netGasFee),
            });
          } else {
            swapTaskChanges.set(address, {
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
        if (stopThreshold.isZero()) {
          this.logger.log(
            `running with address: ${address} -  next randomAmount: ${randomAmount.toString()} - stop threshold remains: 0 - counter: ${counter}`,
          );
          break;
        }
        if (
          stopThreshold.sub(randomAmount).lte(zero) ||
          counter === Number(this.appConfig.suiNetwork.maxSwapAttempts)
        ) {
          randomAmount = stopThreshold;
        }
        this.logger.log(
          `running with address: ${address} -  next randomAmount: ${randomAmount.toString()} - stop threshold remains: ${stopThreshold.toString()} - counter: ${counter}`,
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
      console.log(swapTaskChanges);
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
  newRandAmount(lowerBound: number, upperBound: number, decimals: number) {
    return new BN(
      parseUnits(
        random(lowerBound, upperBound, true).toFixed(4),
        decimals,
      ).toString(),
    );
  }
  // write me a function to sleep for random ms
  async sleepRand(): Promise<any> {
    const sleepDuration = +random(0.2, 0.5, true).toFixed(3) * 1000;
    this.logger.log(`Sleeping for ${sleepDuration} ms`);
    return new Promise((resolve) => setTimeout(resolve, sleepDuration));
  }
  async createSwapTx(
    signer: RawSigner,
    poolAddress: string,
    signerAddress: string,
    swapAforB: boolean,
    swapAmount: BN,
    slippage: Percentage,
    decimalsA: number,
    decimalsB: number,
    byAmountIn = true,
  ): Promise<any> {
    try {
      const pool = await this.sdk.Pool.getPool(poolAddress);
      this.sdk.senderAddress = signerAddress;
      const tickdatas = await this.sdk.Pool.fetchTicksByRpc(pool.ticks_handle);
      const calculateRatesParams = {
        decimalsA,
        decimalsB,
        a2b: swapAforB,
        byAmountIn,
        amount: swapAmount,
        swapTicks: tickdatas,
        currentPool: pool,
      };
      const res = await this.sdk.Swap.calculateRates(calculateRatesParams);
      const toAmount = byAmountIn
        ? res.estimatedAmountOut
        : res.estimatedAmountIn;

      const amountLimit = adjustForSlippage(toAmount, slippage, !byAmountIn);

      const transactionPayload =
        await this.sdk.Swap.createSwapTransactionPayload(
          {
            pool_id: pool.poolAddress,
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
            a2b: swapAforB,
            by_amount_in: byAmountIn,
            amount: swapAmount.toString(),
            amount_limit: amountLimit.toString(),
          },
          {
            byAmountIn,
            slippage,
            decimalsA,
            decimalsB,
            swapTicks: tickdatas,
            currentPool: pool,
          },
        );
      // const resp = await signer.signAndExecuteTransactionBlock({
      //   transactionBlock: transactionPayload as any,
      // });
      const resp = await sendTransaction(signer as any, transactionPayload);
      return {
        data: resp,
        address: signerAddress,
        poolAddress: pool.poolAddress,
        amountIn: res.estimatedAmountIn.toString(),
        amountOut: res.estimatedAmountOut.toString(),
      };
    } catch (e) {
      console.log(`error when swap: ${e} with address: ${signerAddress}`);
      return {
        data: null,
        address: signerAddress,
        poolAddress,
        amountIn: '0',
        amountOut: '0',
      };
    }
  }
  async setUp(): Promise<any> {
    const tokenMetadata = await this.sdk.Token.getTokenListByCoinTypes([
      '0x5580c843b6290acb2dbc7d5bf8ab995d4d4b6ba107e2a283b4d481aab1564d68::brt::BRT',
      '0x2::sui::SUI',
    ]);
    console.log(tokenMetadata);
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
  async swapAllToken(payload: SwapAllTokenDto) {
    const { poolAddress, swapAforB, slippage, coinTypeA, coinTypeB } = payload;
    const requestor = payload?.requestor?.toLowerCase();
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
          requestor: requestor?.toLowerCase(),
          isProcessing: true,
          killProcess: false,
          swapResult: '',
        },
      },
      { upsert: true },
    );
    // const poolInfo = await this.sdk.Pool.getPool(poolAddress);
    // if (!poolInfo) {
    //   this.logger.error('No pool found');
    //   return;
    // }
    const slippagePercent = Percentage.fromDecimal(d(slippage));
    const tokenMetadata = await this.sdk.Token.getTokenListByCoinTypes([
      coinTypeA,
      coinTypeB,
    ]);
    const coinType = swapAforB ? coinTypeA : coinTypeB;
    // get all wallets belongs to requestor
    const walleList = await this.walletService.getAllWalletsByOwner(requestor);
    const totalSelectedWallets = walleList.length;
    const swapHistories = [];
    while (walleList.length) {
      const killProcess = await this.swapProcessModel
        .findOne({
          requestor,
        })
        .exec()
        .then((d) => d.killProcess);
      if (killProcess === true) break;
      const randWalletIdx = random(0, walleList.length - 1, false);
      const signer = new RawSigner(
        walleList[randWalletIdx].keypair,
        this.suiUtils.createRandomProvider(),
      );
      // get token balance of wallet
      const balance = await this.suiUtils
        .getOwnedCoin(walleList[randWalletIdx].address, coinType)
        .then((c) => c.reduce((a, b) => a + BigInt(b.balance), BigInt(0)));
      this.logger.log(
        `address: ${
          walleList[randWalletIdx].address
        } - balance: ${balance.toString()}`,
      );
      if (balance <= MINT_SWAP_ALL_AMOUNT) {
        walleList.splice(randWalletIdx, 1);
        continue;
      }
      const txEffect = await this.createSwapTx(
        signer,
        poolAddress,
        walleList[randWalletIdx].address,
        swapAforB,
        new BN(balance.toString()),
        slippagePercent,
        tokenMetadata[coinTypeA]?.decimals,
        tokenMetadata[coinTypeB]?.decimals,
      );
      if (txEffect?.data) {
        // remove wallet with randWalletIdx from walleList
        walleList.splice(randWalletIdx, 1);
      }
      swapHistories.push({
        status: txEffect?.data?.status
          ? SwapStatus[txEffect?.data?.status.status]
          : SwapStatus.failure,
        txDigest: txEffect?.data?.transactionDigest,
        address: txEffect?.address,
        poolAddress: poolAddress,
        gasInfo: txEffect?.data
          ? this.suiUtils.calculateGasFeeInfo(txEffect?.data?.gasUsed)
          : {},
        configId: 'SWAP_ALL',
        configName: 'SWAP_ALL',
        requestor,
      });
      await this.sleepRand();
    }
    // save to history
    await this.swapHistoryModel.insertMany(swapHistories);
    const numSuccessSwaps = swapHistories.filter(
      (h) => h.status === SwapStatus.success,
    ).length;
    this.logger.log(
      `Done swap with ${numSuccessSwaps} success swaps/${totalSelectedWallets} tries`,
    );
    await this.swapProcessModel.updateOne(
      {
        requestor: payload.requestor.toLowerCase(),
      },
      {
        $set: {
          requestor: payload.requestor.toLowerCase(),
          isProcessing: false,
          swapResult: `${numSuccessSwaps} success swaps/${totalSelectedWallets} transactions`,
        },
      },
      { upsert: true },
    );
    const requestorChannel = crypto
      .createHash('md5')
      .update(`${payload.requestor.toLowerCase()}_account_stream`, 'utf-8')
      .digest('hex');
    await this.centrifugoService.publishMessage({
      message: `${numSuccessSwaps} success swaps/${totalSelectedWallets} transactions`,
      channel: requestorChannel,
    });
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
