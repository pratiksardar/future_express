/**
 * Web research for article enrichment.
 * Set TAVILY_API_KEY or BRAVE_API_KEY for real search; otherwise returns empty context.
 */
export async function searchWeb(query: string, limit = 5): Promise<Array<{ title: string; snippet: string; url?: string }>> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: "basic",
          max_results: limit,
        }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.results ?? [];
      return results.map((r: { title?: string; content?: string; url?: string }) => ({
        title: r.title ?? "",
        snippet: r.content ?? "",
        url: r.url,
      }));
    } catch {
      return [];
    }
  }
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
        {
          headers: { "X-Subscription-Token": braveKey },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.web?.results ?? [];
      return results.map((r: { title?: string; description?: string; url?: string }) => ({
        title: r.title ?? "",
        snippet: r.description ?? "",
        url: r.url,
      }));
    } catch {
      return [];
    }
  }
  return [];
}
