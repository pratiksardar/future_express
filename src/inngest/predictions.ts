/**
 * Inngest hook that watches for newly-resolved markets and fans out
 * `was_correct` updates to every user's ad-hoc prediction on that market.
 *
 * Fires every 10 minutes — sufficient for the "I Called It" banner to feel
 * fresh on next page load without hammering the DB. The actual "trigger" is
 * `markets.resolutionOutcome` flipping from null → ('yes'|'no'), which we
 * observe via the unresolved-predictions sweep in `resolve.ts`.
 */
import { inngest } from "./client";
import { sweepResolvedMarkets } from "@/lib/predictions/resolve";

export const sweepCalledItPredictions = inngest.createFunction(
  {
    id: "sweep-called-it-predictions",
    name: "Resolve user predictions for newly-settled markets",
    triggers: [{ cron: "*/10 * * * *" }],
  },
  async () => {
    const result = await sweepResolvedMarkets();
    return {
      marketsProcessed: result.marketsProcessed,
      totalResolved: result.totalResolved,
      totalCorrect: result.totalCorrect,
      perMarket: result.perMarket.slice(0, 20),
    };
  },
);

export const predictionFunctions = [sweepCalledItPredictions];
