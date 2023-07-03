import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AptosAccount, AptosClient, Types } from 'aptos';
import { plainToInstance } from 'class-transformer';
import { ethers } from 'ethers';
import { Model } from 'mongoose';
import { BaseResultDto } from 'src/common';
import { AppConfiguration, InjectAppConfig } from 'src/config';
import { decrypt } from 'src/utils/cipher-utils';
import { AptosUtilities } from '../aptos/aptos.utilities';
import { CreateWalletDto, MultiSendDto } from './dtos';
import { ClaimDto } from './dtos/claim.dto';
import { GetWalletDto } from './dtos/get-wallet.dto';
import { WalletDto } from './dtos/wallet.dto';
import { WalletInfo, WalletInfoDocument } from './schemas';
@Injectable()
export class WalletService {
  constructor(
    private readonly aptosUtils: AptosUtilities,
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
        const aptosWallet = this.aptosUtils.createWallet();
        walletInfos.push(
          new WalletInfo(
            aptosWallet.address,
            aptosWallet.privateKey,
            aptosWallet.seedPhrase,
            payload.address,
          ),
        );
        result.data.push(aptosWallet.address);
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
  ): Promise<BaseResultDto<Types.Transaction>> {
    const result = new BaseResultDto<Types.Transaction>(null, true);
    try {
      const wallets = [];
      const resourceData = await this.aptosUtils.getResourceData(
        payload.coinType,
      );
      if (
        !resourceData &&
        payload.coinType !== this.appConfig.aptosNetwork.aptosCoin
      ) {
        throw new Error('Resource not found');
      }
      const decimals =
        payload.coinType !== this.appConfig.aptosNetwork.aptosCoin
          ? resourceData?.decimals
          : 8;
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
      result.data = await this.aptosUtils.multiSend(
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
  async test() {
    const balance = await this.aptosUtils.checkCoinBalance(
      AptosAccount.fromAptosAccountObject({
        privateKeyHex:
          '0x447a66a950feaa5a183e8092a8c630582fd54d5fd5b657242e369db94f7a4721',
      }),
      {
        coinType: '0x1::aptos_coin::AptosCoin',
      },
    );
    console.log(balance);
  }

  async claim(payload: ClaimDto): Promise<BaseResultDto<string[]>> {
    const result = new BaseResultDto<string[]>([], true);
    try {
      const privateKeys = [];
      for (let i = 0; i < payload.addresses.length; i++) {
        const wallet = await this.walletInfoModel.findOne({
          address: payload.addresses[i],
        });
        privateKeys.push(decrypt(wallet.privateKey));
        // const tx = await this.aptosUtils.claim(
        //   payload.targetAddress,
        //   privateKey,
        //   payload.coinType,
        // );
        // result.data.push(tx);
      }
      result.data = await Promise.all(
        privateKeys.map((k) =>
          this.aptosUtils.claim(payload.targetAddress, k, payload.coinType),
        ),
      );
    } catch (err) {
      console.log('multiSend error: ' + err);
      result.success = false;
      result.errors = err;
    }
    return result;
  }

  async getAccountByAddresses(
    addressList: string[],
  ): Promise<Array<AptosAccount>> {
    const wallets = await this.walletInfoModel
      .find({
        address: { $in: addressList },
      })
      .exec();
    const keypairs = wallets.map((w) => {
      const privateKey = decrypt(w.privateKey);
      return this.aptosUtils.getAccountByPrivateKeyHex(privateKey);
    });
    return keypairs;
  }
}
