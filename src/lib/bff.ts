/**
 * BFF (Backend-For-Frontend) proxy module.
 *
 * Next.js pages and components should call these functions instead of hitting
 * the database directly. In dev, they call the local API at localhost:4000.
 * In production, they call the deployed Core API URL from `API_BASE_URL`.
 *
 * Usage (in a server component or API route):
 *   import { bff } from "@/lib/bff";
 *   const articles = await bff.getArticles({ category: "crypto", limit: 10 });
 */

import { config } from "@/lib/config";

const API_BASE =
    process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
        // Next.js 15 fetch cache defaults to 'force-cache'; we want fresh data
        next: { revalidate: 0 } as any,
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`BFF fetch failed: ${res.status} ${path} — ${body}`);
    }

    return res.json();
}

// ── Typed BFF methods ──

export const bff = {
    // ── Articles ──
    getArticles(params?: { category?: string; limit?: number }) {
        const sp = new URLSearchParams();
        if (params?.category) sp.set("category", params.category);
        if (params?.limit) sp.set("limit", String(params.limit));
        const qs = sp.toString();
        return apiFetch<any[]>(`/api/articles${qs ? `?${qs}` : ""}`);
    },

    getArticleBySlug(slug: string) {
        return apiFetch<any>(`/api/articles/${encodeURIComponent(slug)}`);
    },

    // ── Editions ──
    getEditions() {
        return apiFetch<{ editions: any[] }>(`/api/editions`);
    },

    getLatestEdition() {
        return apiFetch<{ edition: any | null }>(`/api/editions/latest`);
    },

    // ── Markets ──
    getMarkets(params?: { category?: string; limit?: number }) {
        const sp = new URLSearchParams();
        if (params?.category) sp.set("category", params.category);
        if (params?.limit) sp.set("limit", String(params.limit));
        const qs = sp.toString();
        return apiFetch<any[]>(`/api/markets${qs ? `?${qs}` : ""}`);
    },

    // ── Search ──
    search(q: string, limit?: number) {
        const sp = new URLSearchParams({ q });
        if (limit) sp.set("limit", String(limit));
        return apiFetch<any[]>(`/api/search?${sp}`);
    },

    // ── Ticker ──
    getTicker() {
        return apiFetch<any[]>(`/api/ticker`);
    },

    // ── Agent ──
    getAgentStats() {
        return apiFetch<any>(`/api/agent/stats`);
    },

    // ── Health ──
    health() {
        return apiFetch<{ status: string }>(`/health`);
    },
};
