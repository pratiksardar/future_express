import { describe, it, expect } from "vitest";

/**
 * Tests for pure utility functions in the article generation pipeline.
 * These functions are inlined in generate.ts, so we re-implement them here
 * for testing. In a future refactor, they should be extracted to a utils file.
 */

// ── extractJson (copied from generate.ts for testing) ──

function extractJson(raw: string): string {
    const trimmed = raw.trim();
    const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlock) return jsonBlock[1].trim();

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return trimmed;
}

function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

function qualityGate(
    headline: string,
    body: string,
    minWords = 30,
    maxWords = 600
): { pass: boolean; reason?: string } {
    const wordCount = body.trim().split(/\s+/).length;
    if (wordCount < minWords)
        return { pass: false, reason: `Body too short (${wordCount} words)` };
    if (wordCount > maxWords)
        return { pass: false, reason: `Body too long (${wordCount} words)` };
    if (headline.length < 5) return { pass: false, reason: "Headline too short" };
    if (headline.length > 200)
        return { pass: false, reason: "Headline too long" };
    return { pass: true };
}

// ── extractJson tests ──

describe("extractJson", () => {
    it("extracts JSON from markdown code block", () => {
        const raw = '```json\n{"headline": "Test"}\n```';
        expect(extractJson(raw)).toBe('{"headline": "Test"}');
    });

    it("extracts JSON from code block without language tag", () => {
        const raw = '```\n{"headline": "Test"}\n```';
        expect(extractJson(raw)).toBe('{"headline": "Test"}');
    });

    it("extracts JSON from raw braces", () => {
        const raw = 'Some prefix {"headline": "Test"} some suffix';
        expect(extractJson(raw)).toBe('{"headline": "Test"}');
    });

    it("returns raw input if no JSON found", () => {
        const raw = "just plain text";
        expect(extractJson(raw)).toBe("just plain text");
    });

    it("handles multiline JSON in code blocks", () => {
        const raw = '```json\n{\n  "headline": "Multi",\n  "body": "Line"\n}\n```';
        const result = JSON.parse(extractJson(raw));
        expect(result.headline).toBe("Multi");
        expect(result.body).toBe("Line");
    });
});

// ── slugify tests ──

describe("slugify", () => {
    it("creates a URL-safe slug", () => {
        expect(slugify("Will Bitcoin Reach $100k?")).toBe(
            "will-bitcoin-reach-100k"
        );
    });

    it("handles multiple spaces", () => {
        expect(slugify("hello   world")).toBe("hello-world");
    });

    it("removes special characters", () => {
        expect(slugify("test! @#$ string")).toBe("test-string");
    });

    it("handles empty string", () => {
        expect(slugify("")).toBe("");
    });
});

// ── qualityGate tests ──

describe("qualityGate", () => {
    const longBody = Array(50).fill("word").join(" "); // 50 words

    it("passes valid articles", () => {
        expect(qualityGate("Good Headline", longBody)).toEqual({ pass: true });
    });

    it("rejects too-short body", () => {
        const result = qualityGate("Good Headline", "Too short");
        expect(result.pass).toBe(false);
        expect(result.reason).toContain("too short");
    });

    it("rejects too-long body", () => {
        const veryLong = Array(700).fill("word").join(" ");
        const result = qualityGate("Good Headline", veryLong);
        expect(result.pass).toBe(false);
        expect(result.reason).toContain("too long");
    });

    it("rejects too-short headline", () => {
        const result = qualityGate("Hi", longBody);
        expect(result.pass).toBe(false);
        expect(result.reason).toContain("Headline too short");
    });

    it("rejects too-long headline", () => {
        const longHeadline = "A".repeat(201);
        const result = qualityGate(longHeadline, longBody);
        expect(result.pass).toBe(false);
        expect(result.reason).toContain("Headline too long");
    });

    it("respects custom min/max word counts", () => {
        const shortBody = Array(10).fill("word").join(" ");
        expect(qualityGate("Headline", shortBody, 5, 20)).toEqual({ pass: true });
        expect(qualityGate("Headline", shortBody, 15, 20).pass).toBe(false);
    });
});
