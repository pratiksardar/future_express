# The Future Express

**Tomorrow's News, Today's Odds.**

A retro newspaper–themed web app that turns prediction market data from Polymarket and Kalshi into AI-generated news articles.

## Stack

- **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**
- **PostgreSQL** + **Drizzle ORM**
- **OpenAI** for article generation
- **Inngest** for cron jobs (4-hour edition pipeline, breaking check)

## Setup

1. **Clone and install**
   ```bash
   cd future-express && npm install
   ```

2. **Database (Docker, for local dev)**
   - Start PostgreSQL in Docker (Docker Desktop must be running):
     ```bash
     docker compose up -d
     ```
   - Wait for the DB to be ready (a few seconds), then push the schema:
     ```bash
     npx drizzle-kit push
     ```
   - Connection string is already set in `.env.example`: `postgresql://postgres:postgres@localhost:5432/future_express`
   - To stop: `docker compose down`. Data persists in a Docker volume.

   **Without Docker:** Create a PostgreSQL database and set `DATABASE_URL` in `.env`. Then run `npx drizzle-kit push`.

3. **Environment variables** (see `.env.example`)
   - `DATABASE_URL` – PostgreSQL connection string
   - **Article generation:** `OPENAI_API_KEY` (or for dev use **OpenRouter**: set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, e.g. `arcee-ai/trinity-large-preview:free`)
   - Optional: `TAVILY_API_KEY` or `BRAVE_API_KEY` for web research
   - Optional: `KALSHI_API_KEY` for Kalshi API
   - Optional: `NEXT_PUBLIC_POLYMARKET_AFFILIATE_URL`, `NEXT_PUBLIC_KALSHI_AFFILIATE_URL` for affiliate links

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Populating data

- **Ingest markets:** `POST /api/ingest` (Polymarket + Kalshi).
- **Run edition cron once (ingest + new volume + articles):** `POST /api/cron/edition`. Requires `OPENAI_API_KEY` or `OPENROUTER_API_KEY` for article generation.
- **One-shot: ingest then generate articles for top 10–15 trending:**  
  `POST /api/ingest` with body `{ "generateArticles": true }`. This refreshes market data (sorted by 24h volume), then creates short news articles for up to 15 top-trending markets that don’t already have an article. Those articles appear in the newspaper feed on the homepage.
- **Generate articles only:** `POST /api/articles/generate` with body `{ "morningEdition": true }` (top 10–15 trending) or `{ "marketId": "<uuid>" }`.
- **Latest edition:** `GET /api/editions/latest` returns the most recently published edition.

With Inngest connected, the **edition pipeline** runs every 4 hours: it fetches data from prediction markets **once** (Polymarket/Kalshi), saves markets to the DB, creates a new **edition (volume)** with a sequential volume number, and generates short AI articles for the **top 10–15 trending markets**. Those articles are linked to the edition. When users refresh the newspaper, they see the latest edition's articles; odds and volume on the UI are read from the DB (dynamic). Each edition is **browsable historically** via **Past editions** (/editions) and **/edition/[id]** (e.g. "Vol. 12").

## Project structure

- `src/app/` – Pages and API routes
- `src/components/` – Masthead, ticker, cards, newsletter, etc.
- `src/lib/db/` – Drizzle schema and client
- `src/lib/ingestion/` – Polymarket/Kalshi fetch and normalize
- `src/lib/articles/` – Research, prompts, and generation
- `src/inngest/` – Cron functions

## Deploy (Vercel)

1. Push to GitHub and import in Vercel.
2. Set env vars in the Vercel dashboard.
3. Add a Postgres provider (e.g. Vercel Postgres, Neon) and `DATABASE_URL`.
4. Optionally configure Inngest cloud for cron.
