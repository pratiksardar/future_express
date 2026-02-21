import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import "dotenv/config";

async function run() {
  const privateKey = process.env.BASE_SEPOLIA_PRIVATE_KEY!;
  const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
  const wallet = new ethers.Wallet(privateKey, provider);
  const broker = await createZGComputeNetworkBroker(wallet);
  console.log("Listing services...");
  const services = await broker.inference.listService();
  console.log("Found services:", services);
}
run().catch(console.error);
