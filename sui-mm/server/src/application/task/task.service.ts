import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import random from 'lodash/random';
import { BaseResult, PaginationDto } from 'src/common';
import { DexService } from '../dex/dex.service';
import {
  CreateTaskSwap,
  GetSwapTaskDto,
  QuerySwapSummary,
  ReuseTaskConfig,
} from './dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SwapTask, SwapTaskDocument, SwapTaskStatus } from './schemas';
import { MmConfig, MmConfigDocument } from '../admin/schemas';
import { SwapTaskChanges } from '../dex/schemas';
import moment from 'moment';
@Injectable()
export class TaskService {
  intervalInfoList: Array<
    Record<string, { jobList: string[]; taskId: string }>
  > = [];
  logger = new Logger(TaskService.name);
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private dexService: DexService,
    @InjectModel(SwapTask.name)
    private readonly swapTasksModel: Model<SwapTaskDocument>,
    @InjectModel(MmConfig.name)
    private readonly mmConfigModel: Model<MmConfigDocument>,
  ) {}
  async addTask(requirements: CreateTaskSwap): Promise<BaseResult<any>> {
    const { startTime, duration, strategies, wallets, name } = requirements;
    const requestor = requirements?.requestor?.toLowerCase();
    if (
      strategies.length > wallets.length ||
      strategies.length < 1 ||
      wallets.length < 1 ||
      startTime < Date.now() + 5 * 60 * 1000 ||
      duration < 5 * 60 * 1000
    ) {
      return {
        success: false,
        message: 'Invalid parameters',
        data: null,
      };
    }
    // const swapState = await this.dexService.getSwapState(requestor);
    // if (swapState?.success && swapState?.data?.isProcessing) {
    //   return {
    //     success: false,
    //     message: 'Cannot create task while swap already in progress',
    //     data: null,
    //   };
    // }
    const swapIntervalName = this.createSwapInterval(
      strategies,
      wallets,
      requestor,
    );

    const intervalInfo = this.intervalInfoList.find((i) => i[swapIntervalName]);
    this.logger.log(JSON.stringify({ addTask: this.intervalInfoList }));
    const stopSwapIntervalTimeoutName = `endInterval_${swapIntervalName}`;
    const swapTaskData = await this.swapTasksModel.create({
      swapIntervalName,
      stopSwapIntervalTimeoutName,
      duration,
      startTime,
      walletList: wallets,
      strategies,
      requestor,
      status: SwapTaskStatus.ON_PLAN,
      name,
    });
    this.createStopSwapIntervalTimeout(
      swapIntervalName,
      startTime,
      duration,
      swapTaskData.id,
    );
    intervalInfo && (intervalInfo[swapIntervalName].taskId = swapTaskData.id);
    return {
      success: true,
      message: 'Success',
      data: {
        id: swapTaskData.id,
        swapIntervalName,
        stopSwapIntervalTimeoutName,
        duration,
        startTime,
      },
    };
  }
  createSwapInterval(
    strategies: string[],
    walletList: string[],
    requestor: string,
  ): string {
    // const divideIntoWalletBatchesFunc = this.divideIntoWalletBatches.bind(this);
    const intervalName = `interval_${requestor}_${randomUUID()}`;
    const callback = async () => {
      // const walletBatches = divideIntoWalletBatchesFunc(
      //   strategies.length,
      //   walletList,
      // );
      for (let i = 0; i < strategies.length; i++) {
        // const wallet = walletBatches[i];
        this.createRandomSwapTimeout(
          walletList,
          strategies[i],
          requestor,
          intervalName,
        );
      }
      // update interval info to swapTaskData
      this.logger.log(
        JSON.stringify({ createSwapIntervalCallback: this.intervalInfoList }),
      );
      const intervalInfo = this.intervalInfoList.find((i) => i[intervalName]);
      if (
        intervalInfo &&
        intervalInfo[intervalName]?.taskId &&
        intervalInfo[intervalName]?.jobList?.length
      ) {
        this.logger.log(
          `update swap task ${intervalInfo[intervalName].taskId} with joblist ${intervalInfo[intervalName].jobList}`,
        );
        const updatedTask = await this.swapTasksModel.findByIdAndUpdate(
          intervalInfo[intervalName].taskId,
          {
            $set: {
              jobList: intervalInfo[intervalName].jobList,
              status: SwapTaskStatus.IN_PROGRESS,
            },
          },
          { new: true },
        );
        this.logger.log(
          `updatedTask from createSwapInterval: ${JSON.stringify(updatedTask)}`,
        );
        // remove intervalInfo from this.intervalInfoList
        // this.intervalInfoList = this.intervalInfoList.filter(
        //   (i) => !i[intervalName],
        // );
      }
    };
    const interval = setInterval(callback, 5 * 60 * 1000);

    this.schedulerRegistry.addInterval(intervalName, interval);
    this.logger.log(
      JSON.stringify({ createSwapInterval: this.intervalInfoList }),
    );
    this.intervalInfoList.push({
      [intervalName]: {
        jobList: [],
        taskId: null,
      },
    });
    return intervalName;
  }
  divideIntoWalletBatches(
    strategiesLength: number,
    walletList: string[],
  ): string[][] {
    const batchWalletList: string[][] = new Array(strategiesLength);
    const remainingWallets = [...walletList];
    for (let i = 0; i < strategiesLength; i++) {
      const maxBatchSize = Math.ceil(
        remainingWallets.length / (strategiesLength - i),
      );
      const batchSize = Math.min(maxBatchSize, remainingWallets.length);
      const batch = [];
      for (let j = 0; j < batchSize; j++) {
        const randomIndex = random(0, remainingWallets.length - 1);
        batch.push(remainingWallets.splice(randomIndex, 1)[0]);
      }
      batchWalletList[i] = batch;
    }
    return batchWalletList;
  }
  createRandomSwapTimeout(
    walletAddresses: string[],
    configId: string,
    requestor: string,
    intervalName: string,
  ): string {
    const randomMs = random(10, 30, false) * 1000;
    const timeoutName = `timeout_${configId}_${randomUUID()}`;
    const timeout = setTimeout(async () => {
      this.logger.log(`Running timeout: ${timeoutName} with ${randomMs}ms`);
      await this.dexService.performSwap(
        {
          requestor,
          walletAddresses,
          configId,
        },
        timeoutName,
      );
    }, randomMs);

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
    this.logger.log(
      JSON.stringify({ createRandomSwapTimeout: this.intervalInfoList }),
    );
    const intervalInfo = this.intervalInfoList.find((i) => i[intervalName]);
    intervalInfo && intervalInfo[intervalName]?.jobList.push(timeoutName);
    return timeoutName;
  }
  createStopSwapIntervalTimeout(
    jobName: string,
    startTime: number,
    duration: number,
    taskId: string,
  ) {
    const endTime = startTime + duration - Date.now();
    const callback = async () => {
      if (this.schedulerRegistry.doesExist('interval', jobName)) {
        this.logger.log(`Delete Interval ${jobName}`);
        this.schedulerRegistry.deleteInterval(jobName);
        await this.swapTasksModel.updateOne(
          {
            _id: taskId,
          },
          {
            $set: {
              status: SwapTaskStatus.COMPLETED,
            },
          },
        );
      } else {
        this.logger.log(`Interval ${jobName} not found`);
      }
      this.intervalInfoList = this.intervalInfoList.filter((i) => !i[jobName]);
    };
    const timeout = setTimeout(callback, endTime);
    const timeoutName = `endInterval_${jobName}`;
    this.schedulerRegistry.addTimeout(timeoutName, timeout);
  }
  async deleteTask(id: string): Promise<BaseResult<any>> {
    if (!id)
      return {
        success: false,
        message: 'Fail to delete swap task',
        data: null,
      };
    const taskDoc = await this.swapTasksModel.findById(id).exec();
    if (taskDoc) {
      if (
        this.schedulerRegistry.doesExist(
          'timeout',
          taskDoc.stopSwapIntervalTimeoutName,
        )
      ) {
        this.schedulerRegistry.deleteTimeout(
          taskDoc.stopSwapIntervalTimeoutName,
        );
      }
      if (
        this.schedulerRegistry.doesExist('interval', taskDoc.swapIntervalName)
      ) {
        this.schedulerRegistry.deleteInterval(taskDoc.swapIntervalName);
      }
      await this.swapTasksModel.deleteOne({ _id: id }).exec();
    }

    return {
      success: true,
      message: 'Successfully delete swap task',
      data: true,
    };
  }
  async getSwapTaskById(id: string): Promise<BaseResult<any>> {
    const data = await this.swapTasksModel.findById(id).exec();
    return {
      success: data ? true : false,
      message: data ? 'Get Swap Task Successfully' : 'No Swap Task exists',
      data: data,
    };
  }
  async getSwapTask(payload: GetSwapTaskDto): Promise<BaseResult<any>> {
    if (!payload?.requestor) {
      return {
        success: true,
        message: 'Get Swap Task Successfully',
        data: [],
      };
    }
    payload.requestor = payload.requestor?.toLowerCase();
    const query = {};
    Object.keys(payload).forEach((k) => {
      if (payload[k]) {
        query[k] = payload[k];
      }
    });
    const data = await this.swapTasksModel.find(query).exec();
    const result = [];
    for (const d of data) {
      const configNames = await this.mmConfigModel
        .find(
          {
            _id: { $in: d.strategies },
            requestor: payload.requestor,
          },
          {
            name: true,
          },
        )
        .exec();
      const doc = d['_doc'];
      result.push({
        id: doc._id,
        swapIntervalName: doc.swapIntervalName,
        stopSwapIntervalTimeoutName: doc.stopSwapIntervalTimeoutName,
        strategies: doc.strategies,
        startTime: doc.startTime,
        duration: doc.duration,
        walletList: doc.walletList,
        requestor: doc.requestor,
        jobList: doc.jobList,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        strategyNames: configNames.map((i) => i.name),
        name: doc.name,
      });
    }
    return {
      success: true,
      data: result,
      message: 'Get Swap Task Successfully',
    };
  }
  async getSwapSummary(
    payload: QuerySwapSummary,
  ): Promise<BaseResult<PaginationDto<SwapTaskChanges>>> {
    const { taskId } = payload;
    const taskInfo = await this.swapTasksModel.findById(taskId).exec();
    if (!taskInfo)
      return {
        success: true,
        data: new PaginationDto([], 0, payload.page, payload.size),
        message: 'Get token changes successfully',
      };
    const swapData = await this.dexService.getSwapSummaryByTask(
      taskInfo,
      payload,
    );
    return {
      data: swapData,
      success: true,
      message: 'Get token changes successfullyy',
    };
  }
  getAllIntervalAndTimeout() {
    const timeouts = this.schedulerRegistry.getTimeouts();
    const intervals = this.schedulerRegistry.getIntervals();
    this.logger.log(`Interval: ${intervals}`);
    this.logger.log(`Timeouts: ${timeouts}`);
    return {
      intervals,
      timeouts,
    };
  }
  async cancelTask(taskId: string): Promise<BaseResult<any>> {
    const taskDoc = await this.swapTasksModel.findById(taskId).exec();
    if (taskDoc) {
      [taskDoc.stopSwapIntervalTimeoutName, ...taskDoc.jobList].forEach((j) => {
        if (this.schedulerRegistry.doesExist('timeout', j)) {
          this.schedulerRegistry.deleteTimeout(j);
        }
      });

      if (
        this.schedulerRegistry.doesExist('interval', taskDoc.swapIntervalName)
      ) {
        this.schedulerRegistry.deleteInterval(taskDoc.swapIntervalName);
      }
      await this.swapTasksModel
        .updateOne(
          { _id: taskId },
          {
            $set: {
              status: SwapTaskStatus.CANCELED,
            },
          },
        )
        .exec();
    }

    return {
      success: true,
      message: 'Successfully cancel swap task',
      data: true,
    };
  }
  async reuseTask(payload: ReuseTaskConfig): Promise<BaseResult<any>> {
    const taskDetails = await this.swapTasksModel
      .findById(payload.taskId)
      .exec();
    if (!taskDetails)
      return {
        success: false,
        message: 'Cannot find old task config',
        data: null,
      };
    const requirements: CreateTaskSwap = {
      startTime: payload.startTime,
      duration: taskDetails.duration,
      strategies: taskDetails.strategies,
      wallets: taskDetails.walletList,
      name: `${taskDetails.name}_${moment(payload.startTime).format(
        'YYYY-MM-DD HH:mm:ss',
      )}`,
      requestor: taskDetails.requestor,
    };
    return await this.addTask(requirements);
  }
}
