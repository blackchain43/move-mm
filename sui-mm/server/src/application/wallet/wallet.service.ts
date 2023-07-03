import { Get, Injectable, Query, Req } from '@nestjs/common';
import { SuiUtilities } from '../sui/sui.utilities';
import { AppConfiguration, InjectAppConfig } from 'src/config';
import { BaseResult, BaseResultDto } from 'src/common';
import { MultiSendDto, CreateWalletDto, AddWalletDto } from './dtos';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WalletInfoDocument, WalletInfo } from './schemas';
import { SuiTransactionBlockResponse, SUI_TYPE_ARG } from '@mysten/sui.js';
import { ethers } from 'ethers';
import { Ed25519Keypair } from '@mysten/sui.js';
import { decrypt, encrypt } from 'src/utils/cipher-utils';
import { GetWalletDto } from './dtos/get-wallet.dto';
import { WalletDto } from './dtos/wallet.dto';
import { plainToClass, plainToInstance } from 'class-transformer';
import { ClaimDto } from './dtos/claim.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly suiUtils: SuiUtilities,
    @InjectAppConfig()
    private appConfig: AppConfiguration,
    @InjectModel(WalletInfo.name)
    private readonly walletInfoModel: Model<WalletInfoDocument>,
  ) {}

  async createWallets(payload: CreateWalletDto): Promise<BaseResultDto<any>> {
    const result = new BaseResultDto<any[]>([], true);
    try {
      const walletInfos = [];
      for (let i = 0; i < payload.numOfWallets; i++) {
        const suiWallet = this.suiUtils.createWallet();
        walletInfos.push(
          new WalletInfo(
            suiWallet.address,
            suiWallet.privateKey,
            suiWallet.seedPhrase,
            payload.address,
          ),
        );
        result.data.push(suiWallet.address);
      }
      // save wallets to db
      await this.walletInfoModel.insertMany(walletInfos);
    } catch (err) {
      console.log('createWallets error: ' + err);
      result.success = false;
      result.errors = err;
    }
    return result;
  }

  async addWallet(payload: AddWalletDto): Promise<BaseResultDto<any>> {
    const result = new BaseResultDto<any>([], true);
    try {
      const wallet = await this.walletInfoModel.insertMany([
        {
          address: payload.address,
          privateKey: encrypt(payload.privateKey),
          seedPhrase: encrypt(payload.seedPhrase),
          owner: payload.owner,
        },
      ]);
      result.data = wallet;
    } catch (err) {
      result.success = false;
      result.errors = err;
    }
    return result;
  }

  async getWallet(payload: GetWalletDto): Promise<BaseResultDto<WalletDto[]>> {
    const result = new BaseResultDto<WalletDto[]>([], true);
    try {
      const addresses = await this.walletInfoModel.find(
        { owner: payload.address },
        { seedPhrase: false, privateKey: false },
      );
      result.data = plainToInstance(WalletDto, addresses, {
        excludeExtraneousValues: true,
      });
    } catch (err) {
      result.success = false;
      result.errors = err;
    }
    return result;
  }

  async multiSend(
    payload: MultiSendDto,
  ): Promise<BaseResultDto<SuiTransactionBlockResponse>> {
    const result = new BaseResultDto<SuiTransactionBlockResponse>(null, true);
    try {
      const wallets = [];
      const provider = await this.suiUtils.getProvider();
      const coinMetadata = await provider.getCoinMetadata({
        coinType: payload.coinType,
      });
      const decimals = coinMetadata.decimals;
      if (payload.amounts.length == 1) {
        for (let i = 0; i < payload.addresses.length; i++) {
          wallets.push({
            address: payload.addresses[i],
            amount: ethers.utils
              .parseUnits(payload.amounts[0], decimals)
              .toString(),
          });
        }
      } else {
        if (payload.addresses.length != payload.amounts.length) {
          throw new Error('Addresses and amount must have the same length');
        }
        for (let i = 0; i < payload.addresses.length; i++) {
          wallets.push({
            address: payload.addresses[i],
            amount: ethers.utils
              .parseUnits(payload.amounts[i], decimals)
              .toString(),
          });
        }
      }
      result.data = await this.suiUtils.multiSend(
        payload.owner,
        '',
        payload.coinType,
        wallets,
      );
    } catch (err) {
      console.log('multiSend error: ' + err);
      result.success = false;
      result.errors = err;
    }
    return result;
  }

  async claim(
    payload: ClaimDto,
  ): Promise<BaseResultDto<SuiTransactionBlockResponse[]>> {
    const result = new BaseResultDto<SuiTransactionBlockResponse[]>([], true);
    try {
      for (let i = 0; i < payload.addresses.length; i++) {
        try {
          const wallet = await this.walletInfoModel.findOne({
            address: payload.addresses[i],
          });
          const privateKey = decrypt(wallet.privateKey);
          const tx = await this.suiUtils.claim(
            payload.targetAddress,
            privateKey,
            payload.coinType,
          );
          result.data.push(tx);
        } catch (err) {
          console.log(`address ${payload.addresses[i]} error: ` + err);
        }
      }
    } catch (err) {
      console.log('multiSend error: ' + err);
      result.success = false;
      result.errors = err;
    }
    return result;
  }

  async getWalletKeypairByAddresses(
    addressList: string[],
  ): Promise<Array<Ed25519Keypair>> {
    const wallets = await this.walletInfoModel
      .find({
        address: { $in: addressList },
      })
      .exec();
    const keypairs = wallets.map((w) => {
      const privateKey = decrypt(w.privateKey);
      return this.suiUtils.getKeypairFromPrivateKey(privateKey);
    });
    return keypairs;
  }

  async getAllWalletsByOwner(owner: string): Promise<
    Array<{
      address: string;
      keypair: Ed25519Keypair;
    }>
  > {
    owner = owner.toLowerCase();
    const addresses = await this.walletInfoModel.find({ owner });
    return addresses.map((w) => {
      const privateKey = decrypt(w.privateKey);
      return {
        address: w.address,
        keypair: this.suiUtils.getKeypairFromPrivateKey(privateKey),
      };
    });
  }
}
