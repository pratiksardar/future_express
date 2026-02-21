import { ethers } from "ethers";

async function main() {
    const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
    const bal = await provider.getBalance("0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9");
    console.log("0G Balance:", ethers.formatEther(bal));
}

main().catch(console.error);
