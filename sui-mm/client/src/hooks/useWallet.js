import React from "react";
import { Connection, JsonRpcProvider } from "@mysten/sui.js";
import web3 from "web3";

import { COIN_TYPE_SUI, COIN_TYPE_TOKEN, DECIMALS } from "../utils/constants";

const provider = new JsonRpcProvider(
  new Connection({
    fullnode: "https://fullnode.mainnet.sui.io:443",
  })
);

export default function useWallet() {
  const getAllWallets = React.useCallback(async (data) => {
    if (!data) return [];
    for (let i = 0; i < data?.length; i++) {
      try {
        const balances = await provider.getAllBalances({
          owner: data[i].address,
        });
        const suiBalance = web3.utils.fromWei(
          balances?.find((x) => x.coinType === COIN_TYPE_SUI)?.totalBalance ||
            "0",
          "Gwei"
        );
        const tokenBalance = web3.utils.fromWei(
          balances?.find((x) => x.coinType === COIN_TYPE_TOKEN)?.totalBalance ||
            "0",
          DECIMALS
        );
        data[i].suiBalance = suiBalance;
        data[i].tokenBalance = tokenBalance;
      } catch (error) {
        data[i].suiBalance = -1;
        data[i].tokenBalance = -1;
      }
    }

    return data;
  }, []);

  return { getAllWallets };
}
