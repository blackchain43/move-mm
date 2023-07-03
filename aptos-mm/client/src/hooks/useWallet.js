import React from "react";
import { AptosClient } from "aptos";
import { formatUnits } from "ethers";

import { TOKENS } from "../utils/constants";

const client = new AptosClient("https://fullnode.testnet.aptoslabs.com");

export default function useWallet() {
  const getAllWallets = React.useCallback(async (data) => {
    if (!data) return [];
    for (let i = 0; i < data?.length; i++) {
      try {
        const balances = await client.getAccountResources(data[i].address);
        const aptBalance = formatUnits(
          balances?.find((x) => x.type === TOKENS[0].coinStore)?.data?.coin
            ?.value || "0",
          TOKENS[0].decimals
        );
        const tokenBalance = formatUnits(
          balances?.find((x) => x.type === TOKENS[1].coinStore)?.data?.coin
            ?.value || "0",
          TOKENS[1].decimals
        );
        data[i].aptBalance = aptBalance;
        data[i].tokenBalance = tokenBalance;
      } catch (error) {
        data[i].aptBalance = -1;
        data[i].tokenBalance = -1;
      }
    }

    return data;
  }, []);

  return { getAllWallets };
}
