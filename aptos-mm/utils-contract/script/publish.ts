import dotenv from "dotenv";
dotenv.config();
import {
  AptosClient,
  AptosAccount,
  FaucetClient,
  BCS,
  TxnBuilderTypes,
  HexString,
} from "aptos";
import { aptosCoinStore, NODE_URL, FAUCET_URL } from "./common";
// import assert from "assert";
import fs from "fs";
import path from "path";
const MODULE_PATH = process.argv[2];
(async () => {
  const client = new AptosClient(NODE_URL);
  // const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

  const sender = AptosAccount.fromAptosAccountObject({
    privateKeyHex: process.env.PRIVATE_KEY || "",
  });
  // await faucetClient.fundAccount(sender.address(), 100_000_000);
  const packageMetadata = fs.readFileSync(
    path.join(MODULE_PATH, "build", "Disperse", "package-metadata.bcs")
  );
  const moduleData = fs.readFileSync(
    path.join(
      MODULE_PATH,
      "build",
      "Disperse",
      "bytecode_modules",
      "operation.mv"
    )
  );
  console.log("Publishing package.");
  let txnHash = await client.publishPackage(
    sender,
    new HexString(packageMetadata.toString("hex")).toUint8Array(),
    [
      new TxnBuilderTypes.Module(
        new HexString(moduleData.toString("hex")).toUint8Array()
      ),
    ]
  );
  await client.waitForTransaction(txnHash, { checkSuccess: true });
})();
