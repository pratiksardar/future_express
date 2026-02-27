import { ethers } from "ethers";
import { PHOTOGRAPHER_AGENT_ADDRESS, RPC, config } from "@/lib/config";
import { loggers } from "@/lib/logger";


/**
 * Executes an x402-style micro-payment on the Kite AI Testnet
 * This proves agent-to-agent identity and payment frameworks
 */
export async function authorizeX402PaymentForImage(prompt: string): Promise<string | null> {
    const pk = config.BASE_SEPOLIA_PRIVATE_KEY?.trim();
    if (!pk) return null;

    try {
        const provider = new ethers.JsonRpcProvider(RPC.KITE_TESTNET);
        const wallet = new ethers.Wallet(pk, provider);

        loggers.kite.info("Initiating x402 Micropayment on Kite Testnet (Chain: 2368)");
        loggers.kite.debug({ editor: wallet.address }, "Editor identity");
        loggers.kite.debug({ prompt: prompt.slice(0, 30) }, "Hiring Photographer for prompt");

        // Let's send a fake micropayment of 0.0001 KITE representing the x402 logic
        const tx = await wallet.sendTransaction({
            to: PHOTOGRAPHER_AGENT_ADDRESS,
            value: ethers.parseEther("0.0001"),
            data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({
                type: "x402_payment",
                service: "image_generation",
                client: "the_editor",
                provider: "the_photographer"
            })))
        });

        loggers.kite.info({ txHash: tx.hash }, "x402 Micropayment Submitted");
        await tx.wait(1);
        loggers.kite.info("Payment confirmed — Photographer API unlocked");

        return tx.hash;
    } catch (err: any) {
        loggers.kite.warn({ err: err.message }, "Failed to send x402 payment");
        return null; // Don't crash the pipeline if Kite RPC is down
    }
}
