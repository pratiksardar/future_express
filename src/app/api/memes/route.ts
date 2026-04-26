import { NextRequest, NextResponse } from "next/server";
import { detectDramaticShifts, generateMemeText } from "@/lib/articles/memes";
import { generateMemeCardResponse } from "@/lib/articles/memeCard";

/**
 * GET /api/memes - List recent dramatic probability shifts that qualify for meme cards.
 * GET /api/memes?render=true&marketId=xxx - Render a meme card image for a specific shift.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const render = searchParams.get("render") === "true";
  const marketId = searchParams.get("marketId");
  const threshold = Number(searchParams.get("threshold") ?? "20");

  const shifts = await detectDramaticShifts(threshold);

  // Render a specific meme card as an image
  if (render && marketId) {
    const shift = shifts.find((s) => s.marketId === marketId);
    if (!shift) {
      return NextResponse.json({ error: "No dramatic shift found for this market" }, { status: 404 });
    }

    const memeText = await generateMemeText(shift.title, shift.oldProbability, shift.newProbability);

    return generateMemeCardResponse({
      marketTitle: shift.title,
      oldProbability: shift.oldProbability,
      newProbability: shift.newProbability,
      topText: memeText.topText,
      bottomText: memeText.bottomText,
      category: shift.category,
    });
  }

  // List all qualifying shifts
  return NextResponse.json(
    {
      threshold,
      shifts: shifts.slice(0, 20),
      count: shifts.length,
    },
    { headers: { "Cache-Control": "s-maxage=300" } }
  );
}
