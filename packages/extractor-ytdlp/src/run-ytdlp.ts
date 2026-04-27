import { spawn } from "node:child_process";
import { YtDlpError } from "./ytdlp-error.js";

const MAX_BUFFER = 50 * 1024 * 1024;

/**
 * `argv0` = yt-dlp binary, `url` is passed as the last arg when `url` is set.
 */
export async function runYtDlp(
  argv0: string,
  beforeUrl: string[],
  url?: string,
  options?: { cwd?: string },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const args = url ? [...beforeUrl, url] : beforeUrl;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      fn();
    };
    const p = spawn(argv0, args, {
      cwd: options?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let out = "";
    let err = "";
    let outLen = 0;
    p.stdout?.on("data", (b: Buffer) => {
      out += b.toString("utf8");
      outLen += b.length;
      if (outLen > MAX_BUFFER) {
        p.kill();
        finish(() =>
          reject(
            new YtDlpError("YTDLP_FAILED", "yt-dlp stdout exceeded buffer cap"),
          ),
        );
      }
    });
    p.stderr?.on("data", (b: Buffer) => {
      err += b.toString("utf8");
    });
    p.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") {
        finish(() =>
          reject(
            new YtDlpError("YTDLP_NOT_FOUND", "yt-dlp binary not found or not in PATH", {
              stderr: err,
            }),
          ),
        );
        return;
      }
      finish(() => reject(e));
    });
    p.on("close", (code) => {
      finish(() => resolve({ stdout: out, stderr: err, exitCode: code ?? 1 }));
    });
  });
}

export function ytdlpFailed(
  args: { stderr: string; exitCode: number; exitCodesUnavailable?: number[] },
): YtDlpError {
  const s = (args.stderr + "\n").toLowerCase();
  if (
    args.exitCodesUnavailable?.includes(args.exitCode) ||
    s.includes("unavailable") ||
    s.includes("private video") ||
    s.includes("video unavailable")
  ) {
    return new YtDlpError("VIDEO_UNAVAILABLE", "Video or metadata is unavailable", {
      stderr: args.stderr,
      exitCode: args.exitCode,
    });
  }
  return new YtDlpError("YTDLP_FAILED", "yt-dlp exited with an error", {
    stderr: args.stderr,
    exitCode: args.exitCode,
  });
}
