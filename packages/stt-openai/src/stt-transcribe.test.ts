import { describe, expect, it, vi, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SttFileTooLargeError,
  SttHttpError,
  SttTimeoutError,
  transcribeWithOpenAI,
} from "./index.js";

const origFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = origFetch;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("transcribeWithOpenAI", () => {
  it("throws SttFileTooLargeError when file exceeds maxAudioBytes", async () => {
    const dir = join(tmpdir(), `stt-openai-size-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const fp = join(dir, "big.m4a");
    await writeFile(fp, Buffer.alloc(32));
    await expect(
      transcribeWithOpenAI({
        filePath: fp,
        language: "en",
        apiKey: "k",
        maxAudioBytes: 16,
        timeoutMs: 30_000,
      }),
    ).rejects.toBeInstanceOf(SttFileTooLargeError);
    await rm(dir, { recursive: true, force: true });
  });

  it("throws SttTimeoutError when fetch aborts (timeout)", async () => {
    const dir = join(tmpdir(), `stt-openai-tmo-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const fp = join(dir, "a.m4a");
    await writeFile(fp, Buffer.from("x"));

    globalThis.fetch = vi.fn(() =>
      Promise.reject(Object.assign(new Error("aborted"), { name: "TimeoutError" })),
    ) as unknown as typeof fetch;

    await expect(
      transcribeWithOpenAI({
        filePath: fp,
        language: "en",
        apiKey: "k",
        maxAudioBytes: 1024,
        timeoutMs: 1,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SttTimeoutError &&
        e.provider === "openai" &&
        e.timeoutMs === 1,
    );
    await rm(dir, { recursive: true, force: true });
  });

  it("throws SttHttpError on non-OK response", async () => {
    const dir = join(tmpdir(), `stt-openai-http-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const fp = join(dir, "a.m4a");
    await writeFile(fp, Buffer.from("x"));

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response("quota", { status: 429, statusText: "Too Many" }),
      ),
    ) as unknown as typeof fetch;

    await expect(
      transcribeWithOpenAI({
        filePath: fp,
        language: "en",
        apiKey: "k",
        maxAudioBytes: 1024,
        timeoutMs: 30_000,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SttHttpError &&
        e.status === 429 &&
        e.responseBody === "quota" &&
        e.provider === "openai",
    );
    await rm(dir, { recursive: true, force: true });
  });
});
