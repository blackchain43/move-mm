import { Inject } from '@nestjs/common';
import { ConfigType, registerAs } from '@nestjs/config';

export const appConfiguration = registerAs('app', () => {
  return {
    baseUrl: process.env.URL || '',
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 6003,
    auth: {
      x_api_key: process.env.X_API_KEY || '',
    },
    mongodb: {
      connection: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DBNAME || 'sui_mm',
    },
    suiNetwork: {
      rpc: process.env.SUI_NETWORK_RPC || 'https://fullnode.mainnet.sui.io',
      faucet:
        process.env.SUI_NETWORK_FAUCET || 'https://faucet.testnet.sui.io/gas',
      privateKey: process.env.SUI_NETWORK_PRIVATE_KEY || '',
      wallets: JSON.parse(process.env.SUI_NETWORK_WALLETS) || {},
      gasBudget: process.env.SUI_NETWORK_GAS_BUDGET || '0.003',
      connectionPool: JSON.parse(process.env.SUI_NETWORK_CONNECTION_POOL) || [],
      maxSwapAttempts: process.env.SUI_NETWORK_MAX_SWAP_ATTEMPTS || 100,
    },
    aesSecretKey: process.env.AES_SECRET_KEY,
    centrifugo: {
      url: process.env.CENTRIFUGO_HTTP_URL,
      key: process.env.CENTRIFUGO_API_KEY,
      hmacKey: process.env.CENTRIFUGO_HMAC_KEY,
      jwtSignOptions: process.env.CENTRIFUGO_JWT_SIGN_OPTIONS,
    },
  };
});

export type AppConfiguration = ConfigType<typeof appConfiguration>;
export const InjectAppConfig = () => Inject(appConfiguration.KEY);
