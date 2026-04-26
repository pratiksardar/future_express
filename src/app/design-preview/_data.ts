// Shared mock data for the 3 design preview variants.
// All values are hardcoded — no DB hits.

export type MockArticle = {
  slug: string;
  category: string;
  headline: string;
  dek: string;
  byline: string;
  date: string;
  readTime: string;
  imageUrl: string;
  probability: number;
  probabilityLabel: string;
  volume: string; // formatted USD
  source: "Polymarket" | "Kalshi";
};

export const edition = {
  volume: 47,
  issue: 12,
  date: "Sunday, April 26, 2026",
  dateShort: "APR 26 2026",
  price: "FREE / DIGITAL EDITION",
  tagline: "Tomorrow's News, Today's Odds",
  strapline: "The Independent Intelligence of the Future",
  city: "NEW YORK",
};

export const breakingTicker =
  "EXTRA · EXTRA · Fed odds of June rate cut climb to 64% on softer CPI · Polymarket flips on AI regulation bill within 48 hours · Kalshi volume surpasses $14M overnight on election futures · Bitcoin halving cycle traders price 71% chance of new ATH by Q3";

export const articles: MockArticle[] = [
  {
    slug: "fed-rate-cut-june-2026",
    category: "Economy",
    headline:
      "Markets Now Price a June Rate Cut as Near-Certain — Even as the Fed Insists Otherwise",
    dek: "After three soft inflation prints, traders are betting the Chair will blink. The Committee, on the record, says the math doesn't add up.",
    byline: "By the Newsroom",
    date: "April 25, 2026",
    readTime: "6 min read",
    imageUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&auto=format&fit=crop",
    probability: 64,
    probabilityLabel: "Likely",
    volume: "$8.2M",
    source: "Polymarket",
  },
  {
    slug: "ai-regulation-bill-flip",
    category: "Politics",
    headline: "The AI Regulation Bill Was Dead on Tuesday. By Friday It Had a 58% Shot.",
    dek: "A Senate cloakroom reversal nobody saw coming — except the four traders who moved first.",
    byline: "By the Politics Desk",
    date: "April 24, 2026",
    readTime: "5 min read",
    imageUrl:
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=80&auto=format&fit=crop",
    probability: 58,
    probabilityLabel: "Lean Yes",
    volume: "$3.1M",
    source: "Kalshi",
  },
  {
    slug: "bitcoin-new-ath-q3",
    category: "Markets",
    headline: "Bitcoin's Halving-Year Pattern Holds. Traders Now Give 71% to a New High by September.",
    dek: "The cycle bulls have history on their side. The bears have a chart that hasn't broken yet.",
    byline: "By the Markets Desk",
    date: "April 24, 2026",
    readTime: "7 min read",
    imageUrl:
      "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1200&q=80&auto=format&fit=crop",
    probability: 71,
    probabilityLabel: "Very Likely",
    volume: "$14.6M",
    source: "Polymarket",
  },
  {
    slug: "open-ai-gpt6-release",
    category: "Technology",
    headline: "GPT-6 Lands Before Christmas? The Quiet Money Says No.",
    dek: "Public talk is breathless. The order book is sober — and shorting the holiday window.",
    byline: "By the Technology Desk",
    date: "April 23, 2026",
    readTime: "4 min read",
    imageUrl:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80&auto=format&fit=crop",
    probability: 28,
    probabilityLabel: "Unlikely",
    volume: "$2.4M",
    source: "Polymarket",
  },
  {
    slug: "knicks-finals-odds",
    category: "Sports",
    headline: "The Knicks Are 33% to Reach the Finals. The Locker Room Says 90.",
    dek: "Confidence is free. Volatility, less so. The futures market splits the difference.",
    byline: "By the Sports Desk",
    date: "April 22, 2026",
    readTime: "5 min read",
    imageUrl:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80&auto=format&fit=crop",
    probability: 33,
    probabilityLabel: "Lean No",
    volume: "$1.8M",
    source: "Kalshi",
  },
  {
    slug: "spacex-mars-window",
    category: "Science",
    headline: "A 2026 Mars Launch Window Is Closing. The Odds Closed With It.",
    dek: "Engineers are still talking. Capital, quietly, has already moved on.",
    byline: "By the Science Desk",
    date: "April 21, 2026",
    readTime: "6 min read",
    imageUrl:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=80&auto=format&fit=crop",
    probability: 12,
    probabilityLabel: "Very Unlikely",
    volume: "$0.9M",
    source: "Polymarket",
  },
];

export type DailyChallengeMarket = {
  question: string;
  category: string;
  yourGuess: number;
  actual: number;
  scoreBlock: "green" | "amber" | "orange" | "red";
};

export const dailyChallenge = {
  date: "April 26, 2026",
  totalScore: 87,
  rank: "FRONT-PAGE EDITOR",
  shareString: "FX 04·26 · 87/100\nGGAYG",
  markets: [
    {
      question: "Will the Fed cut rates in June?",
      category: "Economy",
      yourGuess: 60,
      actual: 64,
      scoreBlock: "green",
    },
    {
      question: "Will the AI Regulation Bill pass committee this week?",
      category: "Politics",
      yourGuess: 62,
      actual: 58,
      scoreBlock: "green",
    },
    {
      question: "Will Bitcoin hit a new ATH by September?",
      category: "Markets",
      yourGuess: 55,
      actual: 71,
      scoreBlock: "amber",
    },
    {
      question: "Will GPT-6 ship before December 25?",
      category: "Technology",
      yourGuess: 35,
      actual: 28,
      scoreBlock: "green",
    },
    {
      question: "Will the Knicks reach the Finals?",
      category: "Sports",
      yourGuess: 40,
      actual: 33,
      scoreBlock: "green",
    },
  ] as DailyChallengeMarket[],
};

export const classifieds = [
  {
    title: "WANTED",
    body: "One (1) discerning reader. Must enjoy double-rule dividers, oldstyle figures, and the quiet dignity of being right early.",
  },
  {
    title: "FOR SALE",
    body: "Half-used pessimism, lightly held. Asking price negotiable. Inquire within Markets Desk.",
  },
  {
    title: "LOST",
    body: "One (1) market consensus on rate cuts, last seen vanishing into Tuesday's CPI print. Reward offered.",
  },
  {
    title: "NOTICE",
    body: "The Future Express is published daily by a machine that has read more newspapers than you.",
  },
];
