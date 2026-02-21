import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = "https://sepolia.base.org"; // Base Sepolia RPC
const PRIVATE_KEY = process.env.BASE_SEPOLIA_PRIVATE_KEY || "";

// Addresses on Base Sepolia
const WETH = "0x4200000000000000000000000000000000000006";

// Let's attempt to use the universal router or quoter on Base Sepolia.
// Wait, do we have USDC on Base Sepolia? Let's check user's balance first to see what tokens they have.

async function checkBalances() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`Address: ${wallet.address}`);
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

    // Common USDC addresses on Base Sepolia to check
    const potentialUSDCAddresses = [
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Circle Testnet USDC
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC (won't work on Sepolia, but just in case)
    ];

    const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
    ];

    for (const address of potentialUSDCAddresses) {
        try {
            const contract = new ethers.Contract(address, erc20Abi, provider);
            const balance = await contract.balanceOf(wallet.address);
            const symbol = await contract.symbol();
            const decimals = await contract.decimals();

            console.log(`${symbol} (${address}) Balance: ${ethers.formatUnits(balance, decimals)}`);
        } catch (e) {
            // Address might not be a valid contract on this network
        }
    }
}

checkBalances().catch(console.error);
