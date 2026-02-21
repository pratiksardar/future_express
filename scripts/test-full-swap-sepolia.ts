import { ethers } from "ethers";
import { getQuote, createSwap } from "../src/lib/uniswap/client";
import { getBaseChainConfig } from "../src/lib/uniswap/constants";
import "dotenv/config";

async function run() {
    const pk = process.env.BASE_SEPOLIA_PRIVATE_KEY!;
    if (!pk) throw new Error("No private key");
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const wallet = new ethers.Wallet(pk, provider);
    const swapper = wallet.address;
    console.log("Swapper:", swapper);

    const config = getBaseChainConfig();
    const amountWei = "1800000000000000"; // 0.0018 ETH

    // 1. Get WETH quote (since Base Sepolia native quote throws)
    console.log("Getting quote...");
    let quoteResp;
    try {
        quoteResp = await getQuote({
            tokenIn: "0x0000000000000000000000000000000000000000",
            tokenOut: config.usdc,
            tokenInChainId: config.chainId,
            tokenOutChainId: config.chainId,
            amount: amountWei,
            swapper,
            type: "EXACT_INPUT"
        });
    } catch (e: any) {
        console.log("NATIVE_ETH quote failed:", e.message);
        quoteResp = await getQuote({
            tokenIn: config.weth,
            tokenOut: config.usdc,
            tokenInChainId: config.chainId,
            tokenOutChainId: config.chainId,
            amount: amountWei,
            swapper,
            type: "EXACT_INPUT"
        });
    }

    // 2. Auto-wrap WETH
    const wethContract = new ethers.Contract(config.weth, [
        "function deposit() payable",
        "function balanceOf(address) view returns (uint256)"
    ], wallet);

    const wethBal = await wethContract.balanceOf(swapper);
    console.log("WETH balance:", ethers.formatEther(wethBal));
    if (wethBal < BigInt(amountWei)) {
        console.log("Wrapping ETH to WETH...");
        const wrapAmount = BigInt(amountWei) - wethBal;
        const wrapTx = await wethContract.deposit({ value: wrapAmount });
        await wrapTx.wait();
        console.log("Wrapped WETH");
    }

    // 3. /check_approval
    console.log("Checking approval...");
    const approvalRes = await fetch("https://trade-api.gateway.uniswap.org/v1/check_approval", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.UNISWAP_API_KEY!
        },
        body: JSON.stringify({
            walletAddress: swapper,
            token: config.weth,
            amount: amountWei,
            chainId: config.chainId
        })
    });
    const approvalData = await approvalRes.json();
    console.log("Approval data:", approvalData);

    if (approvalData.approval) {
        console.log("Sending approval transaction...");
        const req = {
            to: approvalData.approval.to,
            data: approvalData.approval.data,
            value: BigInt(approvalData.approval.value || 0),
        };
        const tx = await wallet.sendTransaction(req);
        console.log("Approval Tx:", tx.hash);
        await tx.wait(2);
        console.log("Approval confirmed.");
    } else {
        console.log("Already approved");
    }

    // 4. Sign Permit2
    let signature: string | undefined;
    if (quoteResp.permitData) {
        console.log("Signing Permit2...");
        const pd = quoteResp.permitData as any;

        // Fix: delete EIP712Domain from types before signing (ethers adds it automatically)
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

    console.log("Swap Data ready.");
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
