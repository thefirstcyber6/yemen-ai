import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

const context = (): TrpcContext => ({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("specialist tools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calculates local cost, customs, and suggested selling price transparently", async () => {
    const caller = appRouter.createCaller(context());
    const result = await caller.market.quote({ quantity: 10, unitPrice: 25, exchangeRate: 530, customsRate: 5, marginRate: 20 });

    expect(result.baseLocal).toBe(132500);
    expect(result.customs).toBe(6625);
    expect(result.totalCost).toBe(139125);
    expect(result.suggestedUnitPrice).toBe(16695);
    expect(result.disclaimer).toContain("تقديرية");
  });

  it("uses the Yemen dialect coaching prompt for local-language analysis", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({ choices: [{ message: { content: "الفهم: معناها هل وصلت أم ستأتي؟" } }] } as Awaited<ReturnType<typeof invokeLLM>>);
    const caller = appRouter.createCaller(context());
    const result = await caller.dialect.coach({ text: "عادك وصلت ولا باتجي؟" });

    expect(result).toContain("هل وصلت");
    expect(vi.mocked(invokeLLM).mock.calls[0]?.[0].messages[0]).toMatchObject({ role: "system" });
    expect(String(vi.mocked(invokeLLM).mock.calls[0]?.[0].messages[0]?.content)).toContain("لغويات يمنية");
  });

  it("rejects an audio payload that is not a data URL", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.voice.transcribe({ audioData: "not-audio" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
