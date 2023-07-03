import {
  Connection,
  DryRunTransactionBlockResponse,
  Ed25519Keypair,
  JsonRpcProvider,
  Order,
  RawSigner,
  SuiEventFilter,
  SuiTransactionBlockResponse,
  TransactionBlock,
  Transactions,
  fromB64,
  CoinStruct,
  Coin,
  SUI_TYPE_ARG,
} from '@mysten/sui.js';
import { wordlist as enWordlist } from '@scure/bip39/wordlists/english';
import * as bip39 from '@scure/bip39';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfiguration, InjectAppConfig } from 'src/config';
import { encrypt } from 'src/utils/cipher-utils';
import * as bignum from 'bn.js';
import { ethers } from 'ethers';
import random from 'lodash/random';

export interface SuiWallet {
  address: string;
  privateKeyHex: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

@Injectable()
export class SuiUtilities {
  private readonly logger = new Logger(SuiUtilities.name);
  private readonly provider: JsonRpcProvider;
  private signer: RawSigner;
  private rpcProviderPools: JsonRpcProvider[] = [];

  public constructor(
    @InjectAppConfig()
    private appConfig: AppConfiguration,
  ) {
    const connection = new Connection({
      fullnode: this.appConfig.suiNetwork.rpc,
      faucet: this.appConfig.suiNetwork.faucet,
    });
    this.provider = new JsonRpcProvider(connection);
    const secretKey = Buffer.from(this.appConfig.suiNetwork.privateKey, 'hex');
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    this.signer = new RawSigner(keypair, this.provider);
    // this.createConnectionPool();
  }

  getProvider() {
    return this.provider;
  }
  createConnectionPool() {
    this.appConfig.suiNetwork.connectionPool.forEach((url) => {
      this.rpcProviderPools.push(
        new JsonRpcProvider(
          new Connection({
            fullnode: url,
          }),
        ),
      );
    });
  }
  getRandomRpcProvider() {
    return this.rpcProviderPools[
      random(0, this.rpcProviderPools.length - 1, false)
    ];
  }
  createRandomProvider() {
    return new JsonRpcProvider(
      new Connection({
        fullnode:
          this.appConfig.suiNetwork.connectionPool[
            random(
              0,
              this.appConfig.suiNetwork.connectionPool.length - 1,
              false,
            )
          ],
      }),
    );
  }

  createWallet() {
    const seedPhrase = bip39.generateMnemonic(enWordlist);
    const ed25519Keypair = Ed25519Keypair.deriveKeypair(
      seedPhrase,
      `m/44'/784'/0'/0'/0'`,
    );
    const exportedKeypair = ed25519Keypair.export();
    const privateKey = this.getPrivateKeyHex(exportedKeypair.privateKey);
    return {
      address: ed25519Keypair.getPublicKey().toSuiAddress(),
      seedPhrase: encrypt(seedPhrase),
      privateKey: encrypt(privateKey),
      encodedPrivateKey: encrypt(exportedKeypair.privateKey),
    };
  }

  importWallet(privateKeyHex: string): SuiWallet {
    const secretKey = Buffer.from(privateKeyHex, 'hex');
    const ed25519Keypair = Ed25519Keypair.fromSecretKey(secretKey);
    return {
      address: ed25519Keypair.getPublicKey().toSuiAddress(),
      privateKeyHex: privateKeyHex,
      publicKey: ed25519Keypair.getPublicKey().toBytes(),
      privateKey: secretKey,
    };
  }

  async getEvents(
    query: SuiEventFilter,
    cursor?: {
      txDigest: string;
      eventSeq: string;
    } | null,
    limit: number | null = 30,
    order: Order = 'ascending',
  ): Promise<any> {
    return await this.provider.queryEvents({
      query: query,
      cursor: cursor,
      limit: limit,
      order: order,
    });
  }

  async callContract(
    privateKeyHex: string,
    packageId: string,
    module: string,
    func: string,
    args: any,
  ): Promise<SuiTransactionBlockResponse> {
    const secretKey = Buffer.from(privateKeyHex, 'hex');
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const signer = new RawSigner(keypair, this.provider);
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${packageId}::${module}::${func}`,
      arguments: args.map((x) => tx.pure(x)),
    });
    const result = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
    });
    return result;
  }

  async dryRunTransactionWithSigner(
    senderAddress: string,
    packageId: string,
    module: string,
    func: string,
    args: any,
  ): Promise<DryRunTransactionBlockResponse> {
    const tx = new TransactionBlock();
    tx.add(
      Transactions.MoveCall({
        target: `${packageId}::${module}::${func}`,
        arguments: args.map((x) => tx.pure(x)),
      }),
    );
    tx.setSender(senderAddress);
    const serializedTx = await tx.build();
    const result = await this.provider.dryRunTransactionBlock({
      transactionBlock: serializedTx,
    });
    return result;
  }

  async getGasCostEstimation(
    privateKeyHex: string,
    packageId: string,
    module: string,
    func: string,
    args: any,
  ): Promise<bigint> {
    const secretKey = Buffer.from(privateKeyHex, 'hex');
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const signer = new RawSigner(keypair, this.provider);
    const tx = new TransactionBlock();
    tx.add(
      Transactions.MoveCall({
        target: `${packageId}::${module}::${func}`,
        arguments: args.map((x) => tx.pure(x)),
      }),
    );
    tx.setSender(keypair.getPublicKey().toSuiAddress());
    const serializedTx = await tx.build();
    return await signer.getGasCostEstimation({
      transactionBlock: serializedTx,
    });
  }

  getKeypairFromPrivateKey(privateKeyHex: string): Ed25519Keypair {
    const secretKey = Buffer.from(privateKeyHex, 'hex');
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  getPrivateKeyHex(privateKey: string): string {
    const privateKeyBuffer = fromB64(privateKey);
    return Buffer.from(privateKeyBuffer).toString('hex');
  }

  public async getOwnedCoin(
    address: string,
    coinType: string,
    filterOptions?: {
      amount?: bigint;
    },
  ): Promise<CoinObject[]> {
    const coins: CoinObject[] = [];
    let hasNextPage = true;
    let nextCursor = null;

    let currentAmount = BigInt(0);
    while (hasNextPage) {
      const resp: any = await this.provider.getCoins({
        owner: address,
        coinType,
        cursor: nextCursor,
      });

      resp.data.forEach((item: CoinStruct) => {
        const coinBalance = BigInt(item.balance);
        coins.push({
          type: item.coinType,
          objectId: item.coinObjectId,
          symbol: Coin.getCoinSymbol(item.coinType),
          balance: coinBalance,
          lockedUntilEpoch: item.lockedUntilEpoch,
          previousTransaction: item.previousTransaction,
          object: item,
        });
        currentAmount += coinBalance;
      });

      if (
        typeof filterOptions?.amount === 'bigint' &&
        currentAmount >= filterOptions.amount
      ) {
        break;
      }

      hasNextPage = resp.hasNextPage;
      nextCursor = resp.nextCursor;
    }
    return coins;
  }

  async multiSend(
    address: string,
    privateKeyHex: string,
    coinType: string,
    wallets: any[],
  ) {
    try {
      const privateKey =
        this.appConfig.suiNetwork.wallets[address] || privateKeyHex;
      const secretKey = Buffer.from(privateKey, 'hex');
      const keypair = Ed25519Keypair.fromSecretKey(secretKey);
      const signer = new RawSigner(keypair, this.provider);
      const tx = new TransactionBlock();
      const ownerAddress = await signer.getAddress();
      let totalAmount = BigInt(0);
      const pAmounts: any[] = [];
      for (let i = 0; i < wallets.length; i++) {
        pAmounts.push(tx.pure(`${wallets[i].amount}`));
        totalAmount += BigInt(wallets[i].amount);
      }

      const coins = await this.getOwnedCoin(ownerAddress, coinType, {
        amount: totalAmount,
      });
      if (coins.length === 0) {
        throw new Error('No coin to transfer');
      }

      let transferCoins;
      if (coinType == SUI_TYPE_ARG) {
        transferCoins = tx.splitCoins(tx.gas, pAmounts);
      } else {
        const [primaryCoin, ...mergeCoins] = coins.filter(
          (coin) => coin.type === coinType,
        );
        const primaryCoinInput = tx.object(primaryCoin.objectId);
        if (mergeCoins.length) {
          // TODO: This could just merge a subset of coins that meet the balance requirements instead of all of them.
          tx.mergeCoins(
            primaryCoinInput,
            mergeCoins.map((coin) => tx.object(coin.objectId)),
          );
        }
        transferCoins = tx.splitCoins(primaryCoinInput, pAmounts);
      }

      for (let i = 0; i < wallets.length; i++) {
        tx.transferObjects([transferCoins[i]], tx.pure(wallets[i].address));
      }

      const result = await signer.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async claim(
    targetAddress: string,
    privateKeyHex: string,
    coinType: string,
  ): Promise<SuiTransactionBlockResponse> {
    try {
      const signer = await this.getSigner(privateKeyHex);
      const address = await signer.getAddress();
      const tokenBalance = await this.provider.getBalance({
        owner: address,
        coinType,
      });
      const tx = new TransactionBlock();
      const coins = await this.getOwnedCoin(address, coinType, {
        amount: BigInt(tokenBalance.totalBalance),
      });
      if (coins.length === 0) {
        throw new Error('No coin to transfer');
      }
      let transferCoins;
      if (coinType == SUI_TYPE_ARG) {
        const gasBudget = ethers.utils.parseUnits(
          this.appConfig.suiNetwork.gasBudget,
          9,
        );
        const amount = ethers.BigNumber.from(tokenBalance.totalBalance).sub(
          gasBudget,
        );
        transferCoins = tx.splitCoins(tx.gas, [tx.pure(amount.toString())]);
      } else {
        const [primaryCoin, ...mergeCoins] = coins.filter(
          (coin) => coin.type === coinType,
        );
        const primaryCoinInput = tx.object(primaryCoin.objectId);
        if (mergeCoins.length) {
          // TODO: This could just merge a subset of coins that meet the balance requirements instead of all of them.
          tx.mergeCoins(
            primaryCoinInput,
            mergeCoins.map((coin) => tx.object(coin.objectId)),
          );
        }
        transferCoins = tx.splitCoins(primaryCoinInput, [
          tx.pure(tokenBalance.totalBalance),
        ]);
      }
      tx.transferObjects([transferCoins], tx.pure(targetAddress));
      const result = await signer.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getSigner(privateKey: string) {
    const secretKey = Buffer.from(privateKey, 'hex');
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const signer = new RawSigner(keypair, this.provider);
    return signer;
  }

  calculateGasFeeInfo(gasUsedInfo: any): {
    totalGasFee: string;
    netGasFee: string;
  } {
    const totalGas = new bignum.BN(gasUsedInfo?.computationCost || 0).add(
      new bignum.BN(gasUsedInfo?.storageCost || 0),
    );
    const netGas = totalGas.sub(new bignum.BN(gasUsedInfo?.storageRebate || 0));
    return {
      totalGasFee: totalGas.toString(),
      netGasFee: netGas.toString(),
    };
  }
}

export type CoinObject = {
  objectId: string;
  type: string;
  symbol: string;
  balance: bigint;
  lockedUntilEpoch: number | null | undefined;
  previousTransaction: string;
  object: CoinStruct; // raw data
};
