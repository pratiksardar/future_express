import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { editionEvery4h, fetchMarkets, morningEdition, checkBreaking } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [editionEvery4h, fetchMarkets, morningEdition, checkBreaking],
});
