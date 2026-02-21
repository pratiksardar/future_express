export type Category =
  | "politics"
  | "economy"
  | "crypto"
  | "sports"
  | "science"
  | "entertainment"
  | "world";

export interface PolymarketEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  closed?: boolean;
  volume?: number;
  volume24hr?: number;
  liquidity?: number;
  outcomes?: string;
  outcomePrices?: string;
  markets?: Array<{
    outcomes: string;
    outcomePrices: string;
  }>;
  tags?: Array<{ slug: string; label: string }>;
  [key: string]: unknown;
}

export interface KalshiMarket {
  ticker: string;
  event_ticker?: string;
  title: string;
  subtitle?: string;
  category?: string;
  yes_ask?: number;
  yes_bid?: number;
  no_ask?: number;
  no_bid?: number;
  volume?: number;
  volume_24h?: number;
  open_time?: string;
  close_time?: string;
  status?: string;
  result?: string;
  [key: string]: unknown;
}

export interface NormalizedMarket {
  polymarketId?: string;
  kalshiTicker?: string;
  title: string;
  description?: string;
  category: Category;
  currentProbability: string;
  polymarketProbability?: string;
  kalshiProbability?: string;
  volume24h?: string;
  status: "active" | "closed" | "resolved";
  resolutionOutcome?: string;
  resolvedAt?: Date;
  polymarketSlug?: string;
  kalshiEventTicker?: string;
}
