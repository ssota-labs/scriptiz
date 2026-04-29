#!/usr/bin/env node
/**
 * End-to-end MCP stdio smoke against the all-in-one Docker image via @scriptiz/mcp launcher.
 * Protocol on child stdout only; all diagnostics go to stderr.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const REQUIRED_TOOLS = [
  "extract_content",
  "get_extraction_status",
  "get_timed_transcript",
  "get_transcript_chunk",
  "list_available_languages",
];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAUNCHER = path.join(ROOT, "packages/mcp-launcher/bin/scriptiz-mcp.js");

function logErr(...args) {
  process.stderr.write(`[mcp-docker-smoke] ${args.join(" ")}\n`);
}

function sleep(ms) {
  return delay(ms);
}

function parseToolJson(result) {
  if (!result?.content?.length) {
    return null;
  }
  const textBlock = result.content.find((c) => c.type === "text");
  if (!textBlock || typeof textBlock.text !== "string") {
    return null;
  }
  try {
    return JSON.parse(textBlock.text);
  } catch {
    return null;
  }
}

function assertToolOk(result, label) {
  if (result.isError) {
    const body = parseToolJson(result);
    throw new Error(
      `${label}: MCP tool error (isError=true): ${JSON.stringify(body)}`,
    );
  }
}

async function callToolJson(client, name, args, label) {
  const result = await client.callTool({ name, arguments: args ?? {} });
  assertToolOk(result, label ?? name);
  const parsed = parseToolJson(result);
  if (parsed === null) {
    throw new Error(`${label ?? name}: could not parse tool JSON from content`);
  }
  return { result, parsed };
}

async function main() {
  const smokeUrl =
    process.env.DOCKER_SMOKE_YOUTUBE_URL?.trim() ||
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const lang =
    process.env.DEFAULT_TRANSCRIPT_LANGUAGE?.trim() ||
    process.env.DEFAULT_LANGUAGE?.trim() ||
    "en";
  const jobTimeoutMs = Number(
    process.env.DOCKER_SMOKE_JOB_TIMEOUT_MS ?? 300_000,
  );
  if (!Number.isFinite(jobTimeoutMs) || jobTimeoutMs < 5_000) {
    throw new Error("DOCKER_SMOKE_JOB_TIMEOUT_MS must be a number >= 5000");
  }

  const image =
    process.env.SCRIPTIZ_DOCKER_IMAGE?.trim() || "scriptiz-mcp:local";
  const volume =
    process.env.SCRIPTIZ_DOCKER_VOLUME?.trim() ||
    `scriptiz-smoke-${process.pid}`;

  logErr(`image=${image} volume=${volume} url=${smokeUrl} language=${lang}`);

  const client = new Client({
    name: "scriptiz-docker-smoke",
    version: "0.0.1",
  });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [LAUNCHER],
    env: {
      ...process.env,
      SCRIPTIZ_DOCKER_IMAGE: image,
      SCRIPTIZ_DOCKER_VOLUME: volume,
      SCRIPTIZ_DOCKER_PULL: process.env.SCRIPTIZ_DOCKER_PULL ?? "never",
      DEFAULT_TRANSCRIPT_LANGUAGE: lang,
      WORKER_POLL_INTERVAL_MS: process.env.WORKER_POLL_INTERVAL_MS ?? "500",
    },
    stderr: "pipe",
  });

  transport.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    for (const n of REQUIRED_TOOLS) {
      if (!names.has(n)) {
        throw new Error(
          `tools/list missing required tool "${n}". Got: ${[...names].sort().join(", ")}`,
        );
      }
    }
    logErr("tools/list ok");

    const { parsed: ext } = await callToolJson(
      client,
      "extract_content",
      { url: smokeUrl, language: lang, forceRefresh: true },
      "extract_content",
    );

    if (ext.alreadyExtracted) {
      throw new Error(
        "extract_content: expected new job with forceRefresh=true, got alreadyExtracted",
      );
    }
    const jobId = ext.jobId;
    const resourceIdQueued = ext.resourceId;
    if (!jobId || !resourceIdQueued) {
      throw new Error(
        `extract_content: missing jobId/resourceId: ${JSON.stringify(ext)}`,
      );
    }

    const started = Date.now();
    /** @type {string | undefined} */
    let resourceId = resourceIdQueued;
    for (;;) {
      const { parsed: st } = await callToolJson(
        client,
        "get_extraction_status",
        { jobId },
        "get_extraction_status",
      );
      if (st.status === "completed") {
        resourceId = st.resourceId ?? resourceId;
        logErr(`job ${jobId} completed in ${Date.now() - started}ms`);
        break;
      }
      if (st.status === "failed") {
        throw new Error(
          `job failed: ${st.errorCode ?? "?"} ${st.errorMessage ?? ""}`,
        );
      }
      if (Date.now() - started > jobTimeoutMs) {
        throw new Error(
          `job timed out after ${jobTimeoutMs}ms (last status=${st.status})`,
        );
      }
      await sleep(1000);
    }

    if (!resourceId) {
      throw new Error("no resourceId after job completion");
    }

    const { parsed: timed } = await callToolJson(
      client,
      "get_timed_transcript",
      { resourceId, language: lang, limit: 15 },
      "get_timed_transcript",
    );
    if (!Array.isArray(timed.segments) || timed.segments.length === 0) {
      throw new Error(
        `get_timed_transcript: expected segments: ${JSON.stringify(timed)}`,
      );
    }

    if (timed.nextCursor) {
      await callToolJson(
        client,
        "get_transcript_chunk",
        {
          resourceId,
          language: lang,
          cursor: timed.nextCursor,
          limitSegments: 8,
          includeTimestamps: true,
        },
        "get_transcript_chunk",
      );
    }

    await callToolJson(
      client,
      "list_available_languages",
      { url: smokeUrl },
      "list_available_languages",
    );

    logErr("mcp-docker-smoke: all checks passed");
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  logErr(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
