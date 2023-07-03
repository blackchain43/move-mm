import { toHEX } from '@mysten/bcs';
import { Injectable, Logger } from '@nestjs/common';
import { TxPayloadCallFunction } from '@pontem/liquidswap-sdk/dist/tsc/types/aptos';
import * as bip39 from '@scure/bip39';
import { wordlist as enWordlist } from '@scure/bip39/wordlists/english';
import {
  AptosAccount,
  AptosClient,
  CoinClient,
  MaybeHexString,
  OptionalTransactionArgs,
  Provider,
  TransactionBuilderRemoteABI,
  Types,
  getAddressFromAccountOrAddress,
} from 'aptos';
import { ethers } from 'ethers';
import random from 'lodash/random';
import { AppConfiguration, InjectAppConfig } from 'src/config';
import { encrypt } from 'src/utils/cipher-utils';
export interface SuiWallet {
  address: string;
  privateKeyHex: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

@Injectable()
export class AptosUtilities {
  private readonly logger = new Logger(AptosUtilities.name);
  // private readonly provider: Provider;
  private readonly coinClient: CoinClient;
  private readonly aptosClient: AptosClient;

  public constructor(
    @InjectAppConfig()
    private appConfig: AppConfiguration,
  ) {
    this.aptosClient = new AptosClient(
      this.appConfig.aptosNetwork.rpcUrl.testnet,
    );
    this.coinClient = new CoinClient(this.aptosClient);
  }

  getAptosClient() {
    return this.aptosClient;
  }
  getCoinClient() {
    return this.coinClient;
  }

  createRandomProvider() {
    const connectionPool = JSON.parse(
      this.appConfig.aptosNetwork.connectionPool ??
        `["${this.appConfig.aptosNetwork.rpcUrl.testnet}"]`,
    );
    return new Provider(
      connectionPool[random(0, connectionPool.length - 1, false)],
    );
  }

  createWallet() {
    const seedPhrase = bip39.generateMnemonic(enWordlist);
    const account = AptosAccount.fromDerivePath(
      `m/44'/637'/0'/0'/0'`,
      seedPhrase,
    );
    const exportedKeypair = account.signingKey;
    const privateKey = toHEX(exportedKeypair.secretKey);
    return {
      address: account.address().toString(),
      seedPhrase: encrypt(seedPhrase),
      privateKey: encrypt(privateKey),
    };
  }

  async multiSend(
    address: string,
    privateKeyHex: string,
    coinType: string,
    wallets: any[],
  ): Promise<Types.Transaction> {
    try {
      const netWorkWallets = JSON.parse(
        this.appConfig.aptosNetwork.wallets ?? '{}',
      );
      const privateKey = netWorkWallets[address] || privateKeyHex;
      const signer = AptosAccount.fromAptosAccountObject({
        privateKeyHex: privateKey,
      });
      const totalAmount = wallets.reduce(
        (total, wallet) => BigInt(total) + BigInt(wallet.amount),
        BigInt(0),
      );
      // check for balance of sender
      const balance = await this.checkCoinBalance(signer, {
        coinType,
      });
      // const accountResource = resources.find(
      //   (r) => r.type === `0x1::coin::CoinStore<${coinType}>`,
      // );
      // const balance = BigInt((accountResource?.data as any).coin.value);
      if (balance < totalAmount) {
        throw new Error('Insufficient Balance');
      }
      const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
        sender: signer.address(),
      });
      const rawTxn = await builder.build(
        `0x1::aptos_account::${
          coinType === this.appConfig.aptosNetwork.aptosCoin
            ? 'batch_transfer'
            : 'batch_transfer_coins'
        }`,
        coinType === this.appConfig.aptosNetwork.aptosCoin ? [] : [coinType],
        [
          wallets.map((w) => getAddressFromAccountOrAddress(w.address)),
          wallets.map((w) => BigInt(w.amount)),
        ],
      );
      const bcsTxn = AptosClient.generateBCSTransaction(signer, rawTxn);
      const pendingTransaction =
        await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
      const transasction = await this.aptosClient.waitForTransactionWithResult(
        pendingTransaction.hash,
      );
      return transasction;
    } catch (err) {
      throw new Error(err);
    }
  }
  async getResourceData(coinType: string) {
    // split address of coinType
    const coinIssuer = coinType.split('::')[0];
    const resources = await this.aptosClient.getAccountResources(coinIssuer);
    const accountResource = resources.find(
      (r) => r.type === `0x1::coin::CoinInfo<${coinType}>`,
    );
    return accountResource?.data as any;
  }
  async claim(
    targetAddress: string,
    privateKeyHex: string,
    coinType: string,
  ): Promise<string> {
    const signer = AptosAccount.fromAptosAccountObject({
      privateKeyHex,
    });
    const balance = await this.checkCoinBalance(signer, {
      coinType,
    });
    const aptosBalance = await this.checkCoinBalance(signer);
    const gasBudget = BigInt(
      ethers.utils
        .parseUnits(this.appConfig.aptosNetwork.gasBudget, 8)
        .toString(),
    );
    if (balance === BigInt(0) || aptosBalance < gasBudget) {
      throw new Error('Insufficient Balance');
    }
    const transferAmount =
      coinType === this.appConfig.aptosNetwork.aptosCoin
        ? BigInt(balance) - BigInt(gasBudget)
        : BigInt(balance);
    // const [estimateGas, maxGasAmount] = await Promise.all([
    //   this.aptosClient.estimateGasPrice(),
    //   this.aptosClient.estimateMaxGasAmount(signer.address()),
    // ]);
    const estimateGas = await this.aptosClient.estimateGasPrice();
    return await this.transferCoin(signer, targetAddress, transferAmount, {
      gasUnitPrice: BigInt(estimateGas.gas_estimate),
      // maxGasAmount,
      coinType,
    });
  }
  getAccountByPrivateKeyHex(privateKeyHex: string) {
    return AptosAccount.fromAptosAccountObject({
      privateKeyHex,
    });
  }
  async sendTransactionWithPayload(
    sender: AptosAccount,
    entryFuncPayload: TxPayloadCallFunction,
    extraArgs?: OptionalTransactionArgs & {
      checkSuccess?: boolean;
      timeoutSecs?: number;
    },
  ): Promise<Types.Transaction> {
    //create random aptos client from connection pool
    const aptosClient = new AptosClient(
      this.appConfig.aptosNetwork.rpcUrl.testnet,
    );
    const builder = new TransactionBuilderRemoteABI(aptosClient, {
      sender: sender.address(),
    });
    const rawTxn = await builder.build(
      entryFuncPayload.function,
      entryFuncPayload.type_arguments,
      entryFuncPayload.arguments,
    );

    return await aptosClient.generateSignSubmitWaitForTransaction(
      sender,
      rawTxn,
      extraArgs,
    );
  }
  /**
   * The latest CoinClient.checkBalance has some issues so this is a workaround
   */
  async checkCoinBalance(
    account: AptosAccount | MaybeHexString,
    extraArgs?: {
      // The coin type to use, defaults to 0x1::aptos_coin::AptosCoin.
      // If you want to check the balance of a fungible asset, set this param to be the
      // fungible asset address
      coinType?: string;
    },
  ): Promise<bigint> {
    const coinType =
      extraArgs?.coinType ?? this.appConfig.aptosNetwork.aptosCoin;
    const typeTag = `0x1::coin::CoinStore<${coinType}>`;
    const address = getAddressFromAccountOrAddress(account);
    const accountResource = await this.aptosClient.getAccountResource(
      address,
      typeTag,
    );
    return BigInt((accountResource.data as any).coin.value);
  }
  /**
   * The latest CoinClient.transfer has some issues so this is a workaround
   */
  async transferCoin(
    from: AptosAccount,
    to: AptosAccount | MaybeHexString,
    amount: number | bigint,
    extraArgs?: OptionalTransactionArgs & {
      // The coin type to use, defaults to 0x1::aptos_coin::AptosCoin.
      // If you want to transfer a fungible asset, set this param to be the
      // fungible asset address
      coinType?: string | MaybeHexString;
      // If set, create the `receiver` account if it doesn't exist on-chain.
      // This is done by calling `0x1::aptos_account::transfer` instead, which
      // will create the account on-chain first if it doesn't exist before
      // transferring the coins to it.
      // If this is the first time an account has received the specified coinType,
      // and this is set to false, the transaction would fail.
      createReceiverIfMissing?: boolean;
    },
  ): Promise<string> {
    // If none is explicitly given, use 0x1::aptos_coin::AptosCoin as the coin type.
    const coinTypeToTransfer =
      extraArgs?.coinType ?? this.appConfig.aptosNetwork.aptosCoin;

    // If we should create the receiver account if it doesn't exist on-chain,
    // use the `0x1::aptos_account::transfer` function.
    const func = extraArgs?.createReceiverIfMissing
      ? '0x1::aptos_account::transfer_coins'
      : '0x1::coin::transfer';

    // Get the receiver address from the AptosAccount or MaybeHexString.
    const toAddress = getAddressFromAccountOrAddress(to);

    const builder = new TransactionBuilderRemoteABI(this.aptosClient, {
      sender: from.address(),
      ...extraArgs,
    });
    const rawTxn = await builder.build(
      func,
      [coinTypeToTransfer as string],
      [toAddress, amount],
    );

    const bcsTxn = AptosClient.generateBCSTransaction(from, rawTxn);
    const pendingTransaction =
      await this.aptosClient.submitSignedBCSTransaction(bcsTxn);
    return pendingTransaction.hash;
  }
}
