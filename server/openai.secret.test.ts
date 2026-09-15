import { describe, expect, it } from "vitest";

describe("OPENAI_API_KEY secret", () => {
  it("authenticates against the lightweight models endpoint", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { data?: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  }, 30_000);
});
