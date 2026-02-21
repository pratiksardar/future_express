# Future Express: Phase 4 Demo Guide (The "Wow" Factor)

This document details the final technical integrations for Phase 4 of the "Trustless AI Financial Syndicate" ETHDenver hack. This phase focuses on spatial context and real-time streaming data, targeting the **Blockade Labs** and **QuickNode** bounties.

## 1. Blockade Labs: Solving the Homeless Agent Problem ($2,000 Bounty)

**The Problem:** Agents typically exist purely in text output and code execution loops. They lack persistent spatial memory or environments to "inhabit". 
**Our Solution:** The Future Express Editor Agent now has a verifiable, spatial home—a 1930s vintage newsroom.

### Implementation Details:
- **Skybox AI API**: We dynamically queried the Blockade Labs Skybox API (`POST /api/v1/skybox`) using an AI prompt requesting a "1930s vintage newsroom with typewriters...".
- **Spatial Viewer**: We integrated `@react-three/fiber` and `@react-three/drei` to build the `<SkyboxViewer />` component. This renders the high-fidelity equirectangular output of the API natively via hardware-accelerated WebGL.
- **The Editor HQ (`/hq`)**: We established a new persistent route in the Next.js application. Users can click `[Visit Editor HQ]` in the masthead to transition from reading the 2D newspaper to "stepping into" the 3D newsroom where the AI "works". It proves the agent can generate and maintain its own 360° environment.

### How to Demo:
1. From the homepage, look at the top-right of the Masthead.
2. Click the **`[Visit Editor HQ]`** link.
3. You will immediately enter the 3D space. Click and drag your mouse to explore the 360° environment.
4. Note the overlay explaining the spatial memory context to the judges.

---

## 2. QuickNode: Hyperliquid HyperCore Streams ($1,000 Bounty)

**The Problem:** Blockchains move fast, and static prediction market polling isn't enough to capture real-time sudden market shifts.
**Our Solution:** We modified the primary application ticker to directly ingest real-time QuickNode Hyperliquid streams via a Webhook.

### Implementation Details:
- **Webhook Ingestion (`/api/quicknode/webhook`)**: We created a dedicated API route that acts directly as a QuickNode Stream destination. It accepts bulk JSON payloads representing Hyperliquid L2 datasets (trades, liquidations, blocks).
- **Streams Indexing (`quicknode_streams` table)**: As the stream data hits the webhook, we immediately pipe it into our PostgreSQL database, establishing an indexed Streams-powered dataset.
- **Breaking Ticker Transformation**: We upgraded `/api/ticker` (which powers the rotating `<BreakingTicker />` component). It now intercepts the latest QuickNode `hyperliquid` stream entries from the database, transforms them, and injects them directly to the front of the ticker feed in real-time.

### How to Demo:
1. Ensure the development server is running (`npm run dev`).
2. We have provided a QuickNode stream simulator snippet: `scripts/test-quicknode-stream.ts`.
3. Run the script:
   ```bash
   npx tsx scripts/test-quicknode-stream.ts
   ```
4. This script strictly mocks a QuickNode Streams `POST` request payload. It pushes a "Massive Buy Wall" on `ETH` and a "Spike +400%" on `BTC` via the Hyperliquid network tags.
5. In your browser homepage, look at the Red **◆ BREAKING ◆** ticker across the top.
6. You will instantly see the latest items parsed directly from the incoming stream:
   `[QUICKNODE STREAM] HYPERLIQUID: ETH Volume Massive Buy Wall`

---

## Bounty Summary
Using these two integrations, we successfully satisfied the criteria of providing an AI with spatial awareness and creatively embedding QuickNode Streams as a real-time blockchain data ingestion engine for front-end workflows.
