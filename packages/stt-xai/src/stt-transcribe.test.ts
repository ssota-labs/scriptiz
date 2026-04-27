import { describe, expect, it, vi, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SttFileTooLargeError,
  SttHttpError,
  SttTimeoutError,
  transcribeWithXai,
} from "./index.js";

const origFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = origFetch;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("transcribeWithXai", () => {
  it("throws SttFileTooLargeError when file exceeds maxAudioBytes", async () => {
    const dir = join(tmpdir(), `stt-xai-size-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const fp = join(dir, "big.m4a");
    await writeFile(fp, Buffer.alloc(64));
    await expect(
      transcribeWithXai({
        filePath: fp,
        language: "en",
        apiKey: "k",
        maxAudioBytes: 32,
        timeoutMs: 30_000,
      }),
    ).rejects.toBeInstanceOf(SttFileTooLargeError);
    await rm(dir, { recursive: true, force: true });
  });

  it("throws SttTimeoutError when fetch aborts (timeout)", async () => {
    const dir = join(tmpdir(), `stt-xai-tmo-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const fp = join(dir, "a.m4a");
    await writeFile(fp, Buffer.from("x"));

    globalThis.fetch = vi.fn(() =>
      Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
    ) as unknown as typeof fetch;

    await expect(
      transcribeWithXai({
        filePath: fp,
        language: "en",
        apiKey: "k",
        maxAudioBytes: 1024,
        timeoutMs: 2,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SttTimeoutError &&
        e.provider === "xai" &&
        e.timeoutMs === 2,
    );
    await rm(dir, { recursive: true, force: true });
  });

  it("throws SttHttpError on non-OK response", async () => {
    const dir = join(tmpdir(), `stt-xai-http-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const fp = join(dir, "a.m4a");
    await writeFile(fp, Buffer.from("x"));

    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response("rate limit", { status: 503, statusText: "Service" }),
      ),
    ) as unknown as typeof fetch;

    await expect(
      transcribeWithXai({
        filePath: fp,
        language: "en",
        apiKey: "k",
        maxAudioBytes: 1024,
        timeoutMs: 30_000,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SttHttpError &&
        e.status === 503 &&
        e.responseBody === "rate limit" &&
        e.provider === "xai",
    );
    await rm(dir, { recursive: true, force: true });
  });
});
