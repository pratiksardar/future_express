# Future Express: Kite AI Agent-Native Payments (Phase 1)
 
This documents the completion of the "Agent-Native Payments & Identity" Hackathon Bounty on the Kite AI Testnet.

## Implementation Details

We achieved the prompt's requirement: "Using Kite AI's identity framework, the Editor autonomously signs an x402 micro-payment to "hire" the Photographer API to produce the 1930s vintage image for the daily edition"

1. **Identity & Setup**:
   - `BASE_SEPOLIA_PRIVATE_KEY` handles the core identity of our "Editor Agent".
   - Using Kite AI's fast Testnet RPC `https://rpc-testnet.gokite.ai/` (Chain ID 2368).

2. **The x402 Micro-Payment**:
   - Integrated exactly inside our existing newspaper image pipeline `src/lib/articles/llm.ts` just prior to making the actual image generation request.
   - Code: `src/lib/kite/client.ts`
   - The "Editor Agent" securely connects to the EVM and executes an on-chain zero-value payload representing the `x402:image_job` transaction, natively sending `0.0001 KITE` to a designated Photographer Agent's mock wallet.
   - We utilize Ethers JS with custom payload strings to define the framework transaction.
   - It checks funds on testnet, submits the tx, and confirms the `x402_payment` before unlocking the image pipeline.

## Demo Instructions

To demo the Editor Agent paying the Photographer:
1. Ensure your `.env` contains `BASE_SEPOLIA_PRIVATE_KEY` with testnet funds from `faucet.gokite.ai`.
2. Wait for the standard 4-hour cron loop to generate an edition OR trigger manually.
3. Observe the server backend logs where the Agent triggers:
   ```
   [Kite AI] Initiating x402 Micropayment on Kite Testnet (Chain: 2368)...
   [Kite AI] Editor Identity: 0x0D2e...
   [Kite AI] Hiring Photographer Identity for Prompt...
   [Kite AI] x402 Micropayment Submitted! Tx Hash: 0x3b272d12d2eebf2ed1aca82aeff791818337337702f83895e9377056b0d56ac1
   [Kite AI] Payment Confirmed! Photographer API unlocked.
   ```
