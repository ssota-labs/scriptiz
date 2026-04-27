#!/usr/bin/env node
/**
 * Launches the all-in-one Scriptiz Docker image with stdio connected for MCP.
 * Logs and errors go to stderr only; stdout is reserved for MCP protocol.
 */
import { spawn, execFileSync } from "node:child_process";
import process from "node:process";

const FORWARD_ENV_KEYS = [
  "DEFAULT_TRANSCRIPT_LANGUAGE",
  "DEFAULT_LANGUAGE",
  "STT_PROVIDER",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "WORKER_POLL_INTERVAL_MS",
  "WORKER_STALE_JOB_AFTER_MS",
  "YTDLP_TIMEOUT_MS",
  "YTDLP_PROXY",
  "STT_TIMEOUT_MS",
  "STT_MAX_AUDIO_BYTES",
];

function logErr(...args) {
  process.stderr.write(`[@scriptiz/mcp] ${args.join(" ")}\n`);
}

function checkDocker() {
  try {
    execFileSync("docker", ["version"], { stdio: "ignore" });
  } catch {
    logErr(
      "Docker is required. Install Docker Desktop (or Docker Engine) and ensure `docker` is on your PATH.",
    );
    process.exit(1);
  }
}

function buildDockerArgs() {
  const image =
    process.env.SCRIPTIZ_DOCKER_IMAGE?.trim() ||
    "ghcr.io/ssota-labs/scriptiz-mcp:latest";
  const pullRaw = (process.env.SCRIPTIZ_DOCKER_PULL || "missing").toLowerCase();
  const pullFlag =
    pullRaw === "always"
      ? "always"
      : pullRaw === "never"
        ? "never"
        : "missing";

  const namedVolume =
    process.env.SCRIPTIZ_DOCKER_VOLUME?.trim() || "scriptiz-data";
  const bindDir = process.env.SCRIPTIZ_DATA_DIR?.trim();

  /** @type {string[]} */
  const args = ["run", "--rm", "-i", "--pull", pullFlag];

  if (bindDir) {
    args.push("-v", `${bindDir}:/app/data`);
  } else {
    args.push("-v", `${namedVolume}:/app/data`);
  }

  args.push("-e", "DATA_DIR=/app/data");

  for (const key of FORWARD_ENV_KEYS) {
    const v = process.env[key];
    if (v !== undefined && v !== "") {
      args.push("-e", `${key}=${v}`);
    }
  }

  args.push(image);
  return args;
}

function main() {
  checkDocker();
  const dockerArgs = buildDockerArgs();
  const child = spawn("docker", dockerArgs, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  child.on("error", (err) => {
    logErr("failed to start docker:", err.message);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code === null || code === undefined ? 1 : code);
  });
}

main();
