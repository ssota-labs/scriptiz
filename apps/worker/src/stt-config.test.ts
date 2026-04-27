import { describe, expect, it } from "vitest";
import { resolveSttProvider } from "./stt-config.js";

describe("resolveSttProvider", () => {
  it("prefers openai when both keys and no STT_PROVIDER", () => {
    const r = resolveSttProvider({
      OPENAI_API_KEY: " o ",
      XAI_API_KEY: "x",
    } as NodeJS.ProcessEnv);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.provider).toBe("openai");
    }
  });

  it("uses xai when only XAI_API_KEY is set", () => {
    const r = resolveSttProvider({ XAI_API_KEY: "k" } as NodeJS.ProcessEnv);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.provider).toBe("xai");
    }
  });

  it("STT_PROVIDER forces provider", () => {
    const r = resolveSttProvider({
      STT_PROVIDER: "xai",
      XAI_API_KEY: "k",
      OPENAI_API_KEY: "o",
    } as NodeJS.ProcessEnv);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.provider).toBe("xai");
    }
  });

  it("returns missing_api_key when explicit openai but no OpenAI key", () => {
    const r = resolveSttProvider({
      STT_PROVIDER: "openai",
      XAI_API_KEY: "k",
    } as NodeJS.ProcessEnv);
    expect(r).toEqual({ kind: "missing_api_key", provider: "openai" });
  });

  it("returns invalid_provider for unknown STT_PROVIDER", () => {
    const r = resolveSttProvider({
      STT_PROVIDER: "groq",
      OPENAI_API_KEY: "k",
    } as NodeJS.ProcessEnv);
    expect(r).toEqual({ kind: "invalid_provider", raw: "groq" });
  });

  it("returns no_api_key_available when no keys", () => {
    expect(resolveSttProvider({} as NodeJS.ProcessEnv)).toEqual({
      kind: "no_api_key_available",
    });
  });

  it("treats empty STT_PROVIDER as auto (openai first)", () => {
    const r = resolveSttProvider({
      STT_PROVIDER: "",
      OPENAI_API_KEY: "a",
    } as NodeJS.ProcessEnv);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") expect(r.provider).toBe("openai");
  });
});
