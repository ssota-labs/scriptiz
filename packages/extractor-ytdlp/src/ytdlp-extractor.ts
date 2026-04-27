import type { ExtractorPort } from "@scriptiz/ports";
import { runYtDlp, ytdlpFailed } from "./run-ytdlp.js";
import { YtDlpError } from "./ytdlp-error.js";
import { findVttFiles } from "./find-vtt.js";
import { captionSourceFromTrack } from "./subtitle-lang.js";

export class YtDlpExtractor implements ExtractorPort {
  constructor(
    private readonly options: { ytdlpPath?: string } = {},
  ) {}

  private binary() {
    return this.options.ytdlpPath ?? process.env.YT_DLP_PATH ?? "yt-dlp";
  }

  async getYoutubeMetadataDump(url: string): Promise<unknown> {
    const r = await runYtDlp(
      this.binary(),
      ["--no-warnings", "--dump-json", "--skip-download"],
      url,
    );
    if (r.exitCode !== 0) {
      throw ytdlpFailed({ stderr: r.stderr, exitCode: r.exitCode });
    }
    try {
      return JSON.parse(r.stdout) as unknown;
    } catch {
      throw new YtDlpError("PARSE_FAILED", "yt-dlp did not return valid JSON");
    }
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
}
