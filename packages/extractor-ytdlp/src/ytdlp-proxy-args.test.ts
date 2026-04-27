import { afterEach, describe, expect, it } from "vitest";
import { ytDlpProxyArgsFromEnv } from "./ytdlp-extractor.js";

describe("ytDlpProxyArgsFromEnv", () => {
  const saved = process.env.YTDLP_PROXY;

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.YTDLP_PROXY;
    } else {
      process.env.YTDLP_PROXY = saved;
    }
  });

  it("returns empty when unset", () => {
    delete process.env.YTDLP_PROXY;
    expect(ytDlpProxyArgsFromEnv()).toEqual([]);
  });

  it("returns empty when only whitespace", () => {
    process.env.YTDLP_PROXY = "   ";
    expect(ytDlpProxyArgsFromEnv()).toEqual([]);
  });

  it("returns --proxy and trimmed URL when set", () => {
    process.env.YTDLP_PROXY = "  http://user:pass@superproxy.example.com:1337  ";
    expect(ytDlpProxyArgsFromEnv()).toEqual([
      "--proxy",
      "http://user:pass@superproxy.example.com:1337",
    ]);
  });
});
