import { describe, expect, it } from "vitest";
import { resolveSttProvider } from "./stt-config.js";

describe("resolveSttProvider", () => {
  it("prefers openai when both keys and no STT_PROVIDER", () => {
    const r = resolveSttProvider({
      OPENAI_API_KEY: " o ",
      XAI_API_KEY: "x",
    } as NodeJS.ProcessEnv);
    expect(r?.provider).toBe("openai");
  });

  it("uses xai when only XAI_API_KEY is set", () => {
    const r = resolveSttProvider({ XAI_API_KEY: "k" } as NodeJS.ProcessEnv);
    expect(r?.provider).toBe("xai");
  });

  it("STT_PROVIDER forces provider", () => {
    expect(
      resolveSttProvider({
        STT_PROVIDER: "xai",
        XAI_API_KEY: "k",
        OPENAI_API_KEY: "o",
      } as NodeJS.ProcessEnv)?.provider,
    ).toBe("xai");
  });

  it("returns null when explicit openai but no key", () => {
    expect(
      resolveSttProvider({
        STT_PROVIDER: "openai",
        XAI_API_KEY: "k",
      } as NodeJS.ProcessEnv),
    ).toBeNull();
  });
});
