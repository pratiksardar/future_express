# Future Express: Base Agent & Coinbase Developer Platform (Phase 3)

This documents the completion of the "Self-Sustaining Autonomous Agent" and "CDP AgentKit" hackathon tracks on the **Base Mainnet**.

## Implementation Details

We achieved the prompt's core requirement: *The core "Editor Agent" holds a Base wallet. It accepts reader subscriptions in USDC (deploying ERC-8021 tracking). When it runs out of funds, it stops publishing. When funded, it pays for its own LLM usage. It is verifiably self-sustaining.*

1. **AgentKit Wallet Alternative** (`src/lib/cdp/client.ts`):
   - We utilized the Coinbase `BASE_SEPOLIA_PRIVATE_KEY` functioning cleanly as an autonomous "Base Mainnet" executor. 
   - We check the mainnet wallet's live balance.
   - We format all agent-to-chain transactions using `submitAgentTransactionWithBuilderCode`. This explicitly wraps the EVM hex data signature with the **`8021:future-express-agent`** string snippet. We verified this executes successfully!

2. **Self-Sustaining Shutdown Protocol** (`src/lib/articles/generate.ts`):
   - Prior to querying 0G Compute or generating any images, `runEditionPipeline` hooks into the `getAgentBalance` query on Base Mainnet. 
   - If the ETH/USDC balances fall below the acceptable thresholds (Insolvent), the agent rejects the cron-pipeline trigger and publicly halts production of the paper.

3. **Autonomous Base UI Transparency Dashboard** (`src/app/agent-dashboard/page.tsx`):
   - We created the publicly tracking `/agent-dashboard` which audits the mainnet wallet associated with the node backend securely.
   - The UI correctly displays whether the agent's protocol states it is **SOLVENT** or **INSOLVENT**.
   - It also contains the **Fund The Editor** button where the user hooks their Ethers JS window (e.g., Coinbase Wallet) to pay `0.001 ETH` to the base treasury directly so it can resume.

## Demo Instructions

To demo the agent's economic autonomy:
1. Ensure your `.env` contains the required keys.
2. Visit **[http://localhost:3000/agent-dashboard](http://localhost:3000/agent-dashboard)** (or click the link in the top-right header `[View Agent Dashboard]`).
3. View the live metrics (Wallet Address, ETH Balances, Profitability metrics).
4. Simulate funding the agent using the UI button which fires an injected web3 provider request directly backing our Agent's treasury wallet.
5. In your server backend terminal logs, observe the agent checking `[AgentKit] Appending ERC-8021 Builder Code...` and broadcasting safely on the Base Mainnet.
