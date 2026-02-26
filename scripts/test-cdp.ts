import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";

async function testCDP() {
    const cdpKey = process.env.CDP_CLIENT_API_KEY;

    console.log("=== CDP Configuration Check ===");
    console.log("CDP Client API Key present:", !!cdpKey);
    console.log("CDP API Key Name present:", !!process.env.CDP_API_KEY_NAME);
    console.log("CDP Private Key present:", !!process.env.CDP_API_KEY_PRIVATE_KEY);
    console.log("CDP Project ID present:", !!process.env.CDP_PROJECT_ID);
    console.log("Base Sepolia PK present:", !!process.env.BASE_SEPOLIA_PRIVATE_KEY);

    // 1. Test CDP RPC endpoint
    console.log("\n=== CDP Base Sepolia RPC Test ===");
    const rpcUrl = cdpKey
        ? `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${cdpKey}`
        : "https://sepolia.base.org";
    console.log("RPC URL:", rpcUrl);

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const blockNumber = await provider.getBlockNumber();
        console.log("✅ RPC is working! Current block:", blockNumber);
    } catch (e: any) {
        console.error("❌ RPC Error:", e.message);
        console.log("Trying fallback...");
        try {
            const fallback = new ethers.JsonRpcProvider("https://sepolia.base.org");
            const bn = await fallback.getBlockNumber();
            console.log("✅ Fallback RPC works! Block:", bn);
        } catch (e2: any) {
            console.error("❌ Fallback also failed:", e2.message);
        }
    }

    // 2. Test Agent Wallet Balance
    console.log("\n=== Agent Wallet Balance Test ===");
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(process.env.BASE_SEPOLIA_PRIVATE_KEY!, provider);
        console.log("Agent wallet address:", wallet.address);

        const balance = await provider.getBalance(wallet.address);
        console.log("ETH Balance:", ethers.formatEther(balance), "ETH");

        const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
        const usdcContract = new ethers.Contract(
            usdcAddress,
            ["function balanceOf(address) view returns (uint256)"],
            provider
        );
        const usdcBal = await usdcContract.balanceOf(wallet.address);
        console.log("USDC Balance:", ethers.formatUnits(usdcBal, 6), "USDC");

        const isSolvent = parseFloat(ethers.formatEther(balance)) > 0.0000001 || parseFloat(ethers.formatUnits(usdcBal, 6)) > 0.01;
        console.log("Solvent:", isSolvent);
    } catch (e: any) {
        console.error("❌ Wallet Error:", e.message);
    }

    // 3. Test getAgentBalance function from client.ts
    console.log("\n=== getAgentBalance() Integration Test ===");
    try {
        // We need to set the env vars that the CDP client expects
        const { getAgentBalance } = await import("../src/lib/cdp/client");
        const result = await getAgentBalance();
        console.log("✅ getAgentBalance() result:", JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error("❌ getAgentBalance() Error:", e.message);
    }

    console.log("\n=== Done ===");
}

testCDP();
