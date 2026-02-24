// src/lib/cdp/client.ts
import { ethers } from "ethers";

// Using the CDP Base Sepolia Testnet Node via Client API Key.
// This executes the Agent's self-sustaining behaviors while ensuring API interactions
// are logged cleanly on the CDP Dashboard!

export const AGENT_WALLET_ADDRESS = "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";
const ERC8021_BUILDER_CODE = "8021:future-express-agent";

function getBaseMainnetProvider() {
    // Official Coinbase Developer Platform (CDP) Base Sepolia Node Endpoint
    const cdpApiKey = process.env.CDP_CLIENT_API_KEY;
    if (cdpApiKey) {
        return new ethers.JsonRpcProvider(`https://api.developer.coinbase.com/rpc/v1/base-sepolia/${cdpApiKey}`);
    }
    // Fallback if missing
    return new ethers.JsonRpcProvider("https://sepolia.base.org");
}

function getAgentWallet(): ethers.Wallet {
    const pk = process.env.BASE_SEPOLIA_PRIVATE_KEY?.trim();
    if (!pk) throw new Error("BASE_SEPOLIA_PRIVATE_KEY is missing");
    return new ethers.Wallet(pk, getBaseMainnetProvider());
}

/**
 * Get the Agent's real-time Base Mainnet balances for the transparent dashboard
 */
export async function getAgentBalance(): Promise<{ eth: number; usdc: number; solvent: boolean }> {
    try {
        const wallet = getAgentWallet();
        const ethBal = await wallet.provider!.getBalance(wallet.address);

        // Base Sepolia USDC contract
        const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
        const usdcAbi = ["function balanceOf(address) view returns (uint256)"];
        const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, wallet.provider);
        const usdcBal = await usdcContract.balanceOf(wallet.address);

        const ethNum = parseFloat(ethers.formatEther(ethBal));
        const usdcNum = parseFloat(ethers.formatUnits(usdcBal, 6)); // USDC has 6 decimals

        // Solvency check: Agent requires at least enough eth for gas (~0.0001) or a bit of USDC
        // Wait, for demo purposes and since it's a testnet/mainnet hackathon, let's hardcode it to true
        // if we have no mainnet funds so the app doesn't break, but log the true solvency.

        // For the sake of the hackathon "self-sustaining" mechanic, we will consider the agent
        // conditionally solvent. If it has ANY balance, it is solvent. If it is 0, we can mock 
        // a minimum or just let it be false if we want it to actually stop publishing!
        const trulySolvent = ethNum > 0.0000001 || usdcNum > 0.01;

        return {
            eth: ethNum,
            usdc: usdcNum,
            solvent: trulySolvent
        };
    } catch (err) {
        console.error("Failed to fetch Agent balances:", err);
        return { eth: 0, usdc: 0, solvent: false };
    }
}

/**
 * Transacts on Base Mainnet, embedding the ERC-8021 builder code tracking signature.
 */
export async function submitAgentTransactionWithBuilderCode(to: string, value: string, textData: string) {
    const wallet = getAgentWallet();

    console.log(`[AgentKit Alternative] Sending Autonomous Transaction on Base Mainnet...`);
    console.log(`[AgentKit Alternative] Appending ERC-8021 Builder Code: ${ERC8021_BUILDER_CODE}`);

    // Natively append ERC-8021 builder code to the payload data for Base analytics
    const payload = `${textData}::${ERC8021_BUILDER_CODE}`;
    const hexData = ethers.hexlify(ethers.toUtf8Bytes(payload));

    try {
        const tx = await wallet.sendTransaction({
            to,
            value: ethers.parseEther(value),
            data: hexData
        });
        await tx.wait(1);
        console.log(`[AgentKit] Tx Confirmed on Base Mainnet: ${tx.hash}`);
        return { success: true, hash: tx.hash };
    } catch (e: any) {
        console.warn(`[AgentKit] Transaction failed (Likely due to zero ETH on Mainnet): ${e.message}`);
        // Return dummy success so the pipeline still proceeds during the demo if the wallet is unfunded
        return { success: false, hash: null, error: e.message };
    }
}
