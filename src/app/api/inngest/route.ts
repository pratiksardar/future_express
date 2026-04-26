import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  editionEvery4h,
  fetchMarkets,
  morningEdition,
  checkBreaking,
  detectBreaking,
  sendDailyDigest,
} from "@/inngest/functions";
import { accuracyFunctions } from "@/inngest/accuracy";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    editionEvery4h,
    fetchMarkets,
    morningEdition,
    checkBreaking,
    detectBreaking,
    sendDailyDigest,
    ...accuracyFunctions,
  ],
});
