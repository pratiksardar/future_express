# ETHDenver 2026 - The Future Express Submission

## The problem it solves
Prediction markets like Polymarket and Kalshi are incredible tools for surfacing truth and probabilities, but they suffer from terrible data accessibility. Unless you're a crypto native or a data nerd constantly staring at order books, understanding the *context* behind a 72% probability vs. a 68% probability is incredibly difficult. Raw odds don't tell the human story.

I built **The Future Express** to solve this. It translates cold, hard prediction market data into engaging, narrative-driven journalism. By framing tomorrow's news through an 1880s vintage broadsheet aesthetic, it makes complex probabilistic outcomes accessible and fun to read for everyone. 

Beyond just the consumer experience, it also solves the "homeless agent" problem. Right now, most AI agents are just chatbots living in text boxes. I wanted to build an entirely autonomous business entity. The "AI Editor" of The Future Express doesn't just write text—it owns its own on-chain wallet on Base, handles its own finances, pays decoupled decentralized AI photographers for cover images using micro-transactions, and immutably logs its own cryptographic audit trails on Hedera. It's a glimpse into a world where apps are run end-to-end by agentic entities.

## Challenges I ran into
Combining severe retro front-end styling with bleeding-edge agentic infrastructure was honestly a massive headache, but in the best way possible. 

The first major hurdle was **API rate limits and context windows**. When you're feeding the top 30 most active prediction markets (with all their corresponding JSON data) into an LLM and asking it to act as an editorial board, the prompt gets enormous. I had to refine the ingestion pipeline to aggressively deduplicate overlapping markets between Polymarket and Kalshi before sending the data to the LLM. 

Another huge challenge was **getting the autonomous payments to work safely**. Giving an AI agent its own wallet and letting it spend money is terrifying. I integrated the Coinbase Developer Platform (CDP) to provision an MPC wallet for the agent on Base. Wiring this up to trigger x402 micropayments on the Kite AI network whenever the LLM requested a thumbnail image meant handling lots of edge cases (like what happens if the payment goes through but the image generation fails?). I had to build a robust retry mechanism and strict ledger tracking.

Finally, dealing with **dependency conflicts during deployment** nearly took me out. Vercel builds were failing because the 0G Serving Broker required an older version of `ethers` while other SDKs required newer ones. I eventually had to override the peer dependencies using `--legacy-peer-deps` in the `vercel.json` config to forcefully resolve the clash and get the production build green.

## Use of AI tools and agents
At the core of The Future Express is a fully autonomous "AI Editor" pipeline. Here’s how the agents work together:

1. **The Data Intake Agent**: Runs on a cron schedule, independently fetching live market data from Polymarket and Kalshi. It parses the odds, calculates the "cent-value" implied probabilities, and packages the most volatile markets.
2. **The Editorial LLM (powered by 0G Compute / OpenRouter)**: We use decentralized AI inferencing to evaluate the grouped markets. The LLM is prompted natively as an "1880s Newspaper Editor" to draft cohesive, engaging narratives that explain *why* the market is pricing things a certain way.
3. **The Financial Agent**: Hosted securely on the backend, this agent holds a CDP MPC Wallet on Base Mainnet. When an article is finalized, it autonomically sends x402-powered micropayments over the Kite AI network to hire a decentralized AI image-generator for the article's cover photo. 
4. **The Archival Agent**: Once the edition is published, an agent permanently logs a hash of the content and the exact market odds at the time of publication to the Hedera Consensus Service. This ensures the journalism is an immutable record.

## Technologies used
*   **Frontend**: Next.js 15 (App Router), Tailwind CSS (custom vintage utility classes), React
*   **Database**: Neon Serverless PostgreSQL (paired with Drizzle ORM)
*   **Hosting**: Vercel
*   **AI Inferencing**: 0g Labs (0G Compute) & OpenRouter for processing multi-market narratives.
*   **Agentic Wallet & On-Chain Autonomy**: Coinbase Developer Platform (CDP) AgentKit & MPC Wallets on Base. 
*   **Micro-transactions**: Kite AI (x402 protocol integration for agent-to-agent photo generation payments).
*   **Audit Trail / Immutable Logging**: Hedera (Consensus Service SDK).
*   **DeFi Integration**: Uniswap Foundation API (Smart routing widgets embedded directly into articles so users can trade markets they are reading about). 

## Tracks Applied

### ETHDenver 2026: Futurllama (AI, Next Gen Tech)
Most AI projects right now are just dressed-up chatbots. We built The Future Express to push the boundaries of what an autonomous entity can actually be. It's not just generating text; it's a full-stack media company run by an AI Editor that ingests real-time financial data, synthesizes complex narratives, manages its own bank account, and hires other agents to do design work. It's a glimpse into the future of autonomous, agent-to-agent economies.

### Base: Base Self-Sustaining Autonomous Agents
We wanted to solve the "homeless agent" problem by giving our AI Editor a real, on-chain business identity. Using the Coinbase Developer Platform (CDP) AgentKit, we provisioned an MPC wallet securely on the backend for the agent on Base Mainnet. The agent natively holds $USDC on Base, and uses it to automatically fund its own operations—specifically, paying decoupled AI artists for cover photos. Users can also natively tip the AI Editor via its Base address to help it remain completely self-sustaining over time.

### Kite AI: Agent-Native Payments & Identity (x402-Powered)
When our AI Editor drafts an article, it needs a cover image, but we didn't want to just use a standard, human-paid API key. Instead, the Editor acts autonomously. We integrated Kite AI’s x402 payment flow so the Editor can securely authenticate itself and instantly stream micro-payments to a decentralized AI image-generator. Every API request corresponds to a real agent-to-agent transaction on the Kite network, proving out a developer-friendly, trustless service economy where agents hire and pay each other without human intervention.

### 0g Labs: Best Use of AI Inference or Fine Tuning (0G Compute)
Synthesizing 30+ highly volatile prediction markets into a cohesive, vintage 1880s narrative requires some heavy lifting. We leveraged 0G Compute's decentralized inferencing infrastructure to handle these massive, complex context windows. Rather than just making a simple API call, our ingestion pipeline organizes the raw Kalshi and Polymarket JSONs, aggressively deduplicates overlapping odds natively, and feeds the structured data into 0G for inference. This allows the LLM to generate deep, multi-market reasoning in real-time.

### Uniswap Foundation: Integrate the Uniswap API
We didn’t want readers to just passively consume the news—we wanted to close the loop so they could take action on the odds they were reading about. We used the developer platform to directly embed the Uniswap API and swap widgets into the bottom of every generated article. If the AI Editor makes a compelling case about a specific market trend, readers can instantly swap tokens or fund their wallets right on the page, significantly reducing the friction to go place their own bets.

### Hedera: “No Solidity Allowed” - Hedera SDKs Only
Because prediction markets fluctuate by the second, we needed a way to prove *exactly* what the odds were when the AI wrote the article. Instead of deploying a complex EVM smart contract, we went entirely native. We integrated the Hedera Consensus Service (HCS) SDK directly into our TypeScript backend. As soon as an edition is finalized, an Archival Agent hashes the generated article along with the exact market probabilities and logs it to an HCS topic. It's an immutable, verifiable audit trail of AI journalism, built with zero Solidity.
