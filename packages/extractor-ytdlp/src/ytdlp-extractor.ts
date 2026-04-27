import type { ExtractorPort } from "@scriptiz/ports";
import { access, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { runYtDlp, ytdlpFailed } from "./run-ytdlp.js";
import { YtDlpError } from "./ytdlp-error.js";
import { findVttFiles } from "./find-vtt.js";
import { captionSourceFromTrack } from "./subtitle-lang.js";
import { parseDumpJsonLines } from "./parse-dump-json.js";

export class YtDlpExtractor implements ExtractorPort {
  constructor(
    private readonly options: { ytdlpPath?: string } = {},
  ) {}

  private binary() {
    return this.options.ytdlpPath ?? process.env.YT_DLP_PATH ?? "yt-dlp";
  }

  async getYoutubeMetadataDump(url: string): Promise<unknown> {
    return this.getMetadataDump(url);
  }

  /**
   * `--dump-json` 결과. NDJSON(playlist 등)이면 첫 줄/첫 객체만 아닌 **전체** 파싱이 필요할 때 사용.
   */
  async getMetadataDumpLines(
    url: string,
    options?: { playlistEnd?: number },
  ): Promise<unknown[]> {
    const before = ["--no-warnings", "--dump-json", "--skip-download"];
    if (options?.playlistEnd != null) {
      before.push("--playlist-end", String(options.playlistEnd));
    }
    const r = await runYtDlp(this.binary(), before, url);
    if (r.exitCode !== 0) {
      throw ytdlpFailed({ stderr: r.stderr, exitCode: r.exitCode });
    }
    const lines = parseDumpJsonLines(r.stdout);
    if (lines.length === 0) {
      throw new YtDlpError("PARSE_FAILED", "yt-dlp returned empty dump");
    }
    return lines;
  }

  async getMetadataDump(
    url: string,
    options?: { playlistEnd?: number },
  ): Promise<unknown> {
    const lines = await this.getMetadataDumpLines(url, options);
    return lines[0];
  }

  async writeSubtitleVtt(
    options: {
      url: string;
      language: string;
      outputDir: string;
      track: { isAuto: boolean };
    },
  ): Promise<{ vttPath: string; source: "native_caption" | "auto_caption" }> {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(options.outputDir, { recursive: true });
    const r = await runYtDlp(
      this.binary(),
      [
        "-o",
        "%(id)s",
        "--skip-download",
        "--no-warnings",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        options.language,
        "--convert-subs",
        "vtt",
      ],
      options.url,
      { cwd: options.outputDir },
    );
    if (r.exitCode !== 0) {
      const low = (r.stderr + r.stdout).toLowerCase();
      if (
        low.includes("no subtitles") ||
        (low.includes("subtitle") && low.includes("unavailable")) ||
        (low.includes("does not have subtitles") && low.includes("requested"))
      ) {
        throw new YtDlpError(
          "SUBTITLE_UNAVAILABLE",
          "Subtitle could not be downloaded for this video/language",
          { stderr: r.stderr, exitCode: r.exitCode },
        );
      }
      throw ytdlpFailed({ stderr: r.stderr, exitCode: r.exitCode });
    }
    const vtts = await findVttFiles(options.outputDir);
    if (vtts.length === 0) {
      throw new YtDlpError(
        "SUBTITLE_UNAVAILABLE",
        "No .vtt file was written for this request",
        { stderr: r.stderr, exitCode: r.exitCode },
      );
    }
    const vttPath = vtts[0]!;
    const source = captionSourceFromTrack(options.track);
    return { vttPath, source };
  }

  /**
   * STT용 베스트 오디오를 M4A로 추출한다. `outputDir` 아래 `fileName`(예: `stt.m4a`)으로 쓴다.
   */
  async downloadBestAudioM4a(options: {
    url: string;
    outputDir: string;
    fileName: string;
  }): Promise<{ audioPath: string }> {
    await mkdir(options.outputDir, { recursive: true });
    const r = await runYtDlp(
      this.binary(),
      [
        "-o",
        options.fileName,
        "-f",
        "bestaudio/best",
        "-x",
        "--audio-format",
        "m4a",
        "--no-warnings",
      ],
      options.url,
      { cwd: options.outputDir },
    );
    if (r.exitCode !== 0) {
      throw ytdlpFailed({ stderr: r.stderr, exitCode: r.exitCode });
    }
    const expected = path.join(options.outputDir, options.fileName);
    try {
      await access(expected, fsConstants.F_OK);
      return { audioPath: expected };
    } catch {
      const files = await readdir(options.outputDir);
      const m4a = files.find((f) => f.endsWith(".m4a"));
      if (m4a) {
        return { audioPath: path.join(options.outputDir, m4a) };
      }
      throw new YtDlpError(
        "YTDLP_FAILED",
        "Audio file not found after yt-dlp download",
        { stderr: r.stderr, exitCode: r.exitCode },
      );
    }
  }
}
