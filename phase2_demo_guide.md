# Future Express: Phase 2 Demo Guide (Hedera & 0G Compute)

This guide documents the integration of **Hedera (Schedule & Consensus Service)** and **0G Labs Compute** features for Phase 2 of the hackathon bounties.

## 1. Top Setup: Environment Variables
For both these systems to run optimally in production on the testnets, the following environment variables need to be correctly configured in `.env`. The project contains robust fallbacks, so if the wallets have zero balances, the app will degrade gracefully without crashing while still triggering the API integration hooks!

```env
# 0G Compute Config - Needs an active testnet wallet with "Neuron" test funds
BASE_SEPOLIA_PRIVATE_KEY=your_ecdsa_private_key # Shared across the app
# HEDERA - Requires a free Hedera Testnet Account (from portal.hedera.com)
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e02... 
HEDERA_SCHEDULE_CONTRACT_ADDRESS=0x123... # Only after deploying the listener
```

---

## 2. 0G Compute Integration: Best Use of AI Inference
**Objective**: Decentralize the intelligence behind Future Express using Open Source LLMs directly executed via the 0G Compute Network (TEE verifiable model execution). 

**Code Implementation Locations:**
- **`src/lib/zeroG/client.ts`**: The core `@0glabs/0g-serving-broker` SDK wrapper. This file signs messages natively and initiates an OpenAI-compatible completion on the 0G Compute Testnet. Fallbacks to default OpenAI/OpenRouter if the wallet does not have a "sub-account ledger" or active testnet neurons on 0G.
- **`src/lib/articles/generate.ts`** (Lines 76-88): `generateArticleForMarket` routes all AI logic out of the proprietary API into the `get0GAIResponse` function securely. 

**Demo testing approach:**
```bash
# We built a test script to prove the interaction with 0G testnet:
npx tsx scripts/test-0g.ts

# Output will prove that the `@0glabs/0g-serving-broker` SDK successfully queried the 0G Network:
# > [0G] Initializing broker for wallet 0x0...
# > Detected testnet (chain ID: 16602)
# > [0G] Getting service metadata for provider 0xa48f...
```
*Note: Due to a lack of testnet funding, our CLI output gracefully explains the `Sub-account not found / Insufficient Balance` warning and falls back to standard APIs for application stability.*

---

## 3. Hedera: Killer App for Agentic Society & On-Chain Schedule
**Objective:** Prove transparent, verifiable AI behavior. 1) Our "Editor-in-Chief" agent makes layout decisions deciding which prediction markets get priority on the front page. We log this on the Hedera Consensus Service (HCS). 2) Make the publication timing trigger based on Hedera Smart Contracts instead of Node.js cron.

**Code Implementation Locations:**
- **`src/lib/hedera/client.ts`**: The core proxy to create `TopicCreateTransaction` and `TopicMessageSubmitTransaction`. The AI generates a layout of what articles to feature and it hashes those decisions immutably to the Hedera ledger. 
- **`src/lib/articles/generate.ts`** (Lines 236-242): During the `runEditionPipeline`, we invoke `#logEditorialDecision` sending the generated edition metadata layout transparently.
- **`contracts/ScheduledEditionTrigger.sol`**: An immutable system trigger using Hedera's EVM that is designed to be paired with `Hedera Schedule Service` to initiate the edition publishing.
- **`scripts/hedera-schedule-listener.ts`**: An EVM listener configured via `ethers` connected to `hashio.io` (Hedera RPC), waiting for `EditionTriggered` natively and autonomously bridging smart-contract signals to our 4hr article generator.

**Demo testing approach**:
Set your keys via the `portal.hedera.com`, and run:
```bash
npx tsx scripts/hedera-schedule-listener.ts
```
When simulated (or run off Hedera Schedule Service system contracts), the agent triggers a pipeline that saves its immutable ledger footprint to `HCS` via `src/lib/hedera/client.ts`!
