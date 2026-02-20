export { runIngestion } from "./run";
export { fetchPolymarketEvents, parsePolymarketProbability, getPolymarketVolume24h } from "./polymarket";
export { fetchKalshiMarkets, parseKalshiProbability, getKalshiVolume } from "./kalshi";
export { normalizePolymarketEvent, normalizeKalshiMarket, matchScore } from "./normalize";
export type { PolymarketEvent, KalshiMarket, NormalizedMarket, Category } from "./types";
