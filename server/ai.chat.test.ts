import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ai.chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a Yemen-focused system prompt and returns the assistant response", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "يا هلا، صنعاء القديمة حكاية جميلة." } }],
    } as Awaited<ReturnType<typeof invokeLLM>>);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.ai.chat({
      messages: [{ role: "user", content: "احكي لي عن صنعاء القديمة" }],
    });

    expect(result).toContain("صنعاء القديمة");
    expect(invokeLLM).toHaveBeenCalledTimes(1);
    const request = vi.mocked(invokeLLM).mock.calls[0]?.[0];
    expect(request?.messages[0]).toMatchObject({ role: "system" });
    expect(String(request?.messages[0]?.content)).toContain("لهجة يمنية");
    expect(request?.messages.at(-1)).toEqual({ role: "user", content: "احكي لي عن صنعاء القديمة" });
  });

  it("rejects empty questions before calling the model", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.ai.chat({ messages: [{ role: "user", content: "   " }] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(invokeLLM).not.toHaveBeenCalled();
  });
});
