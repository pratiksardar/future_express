import { ethers } from "ethers";
import { getQuote, createSwap } from "../src/lib/blockchain/uniswap/client";
import "dotenv/config";

const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Circle USDC Sepolia
const CHAIN_ID = 11155111; // Ethereum Sepolia

async function run() {
    const pk = process.env.BASE_SEPOLIA_PRIVATE_KEY!;
    if (!pk) throw new Error("No private key");
    const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/468b63fc6e454ab5ba1467406a666991"); // public or env depending
    // Let's just use ethers default provider for sepolia if possible or public rpc
    const rpcProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
    const wallet = new ethers.Wallet(pk, rpcProvider);
    const swapper = wallet.address;
    console.log("Swapper:", swapper);

    const amountWei = "180000000000000"; // 0.00018 ETH

    console.log("Getting quote for ETH -> USDC on Sepolia...");
    let quoteResp;
    try {
        quoteResp = await getQuote({
            tokenIn: NATIVE_ETH,
            tokenOut: USDC_SEPOLIA,
            tokenInChainId: CHAIN_ID,
            tokenOutChainId: CHAIN_ID,
            amount: amountWei,
            swapper,
            type: "EXACT_INPUT"
        });
        console.log("Got NATIVE_ETH Quote:", !!quoteResp.quote);
    } catch (e: any) {
        console.log("Quote NATIVE_ETH failed, trying wrapped. Error:", e.message);
        const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
        quoteResp = await getQuote({
            tokenIn: WETH_SEPOLIA,
            tokenOut: USDC_SEPOLIA,
            tokenInChainId: CHAIN_ID,
            tokenOutChainId: CHAIN_ID,
            amount: amountWei,
            swapper,
            type: "EXACT_INPUT"
        });
        console.log("Got WETH Quote:", !!quoteResp.quote);
    }

    console.log("Routing:", quoteResp.routing);

    // 4. Sign Permit2 if needed
    let signature: string | undefined;
    if (quoteResp.permitData) {
        console.log("Signing Permit2...");
        const pd = quoteResp.permitData as any;
        if (pd.types && pd.types.EIP712Domain) {
            delete pd.types.EIP712Domain;
        }
        signature = await wallet.signTypedData(
            pd.domain,
            pd.types,
            pd.values
        );
        console.log("Signed Permit2");
    }

    // 5. Get Swap Data
    console.log("Getting Swap Tx Data...");
    const swapResp = await createSwap({
        quote: quoteResp.quote,
        permitData: quoteResp.permitData,
        signature
    });

    console.log("Swap Data:", swapResp.swap.to, swapResp.swap.value);
    const swapTxReq = {
        to: swapResp.swap.to,
        data: swapResp.swap.data,
        value: BigInt(swapResp.swap.value || 0),
        gasLimit: swapResp.swap.gas ? BigInt(swapResp.swap.gas) : undefined,
    };

    const finalTx = await wallet.sendTransaction(swapTxReq);
    console.log("Final Swap Tx Hash:", finalTx.hash);
    const receipt = await finalTx.wait();
    console.log("Swap confirmed successfully! Block:", receipt?.blockNumber);
}

run().catch(console.error);
