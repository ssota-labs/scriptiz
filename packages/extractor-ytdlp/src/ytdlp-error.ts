export type YtDlpErrorCode =
  | "YTDLP_NOT_FOUND"
  | "YTDLP_FAILED"
  | "YTDLP_TIMEOUT"
  | "PARSE_FAILED"
  | "VIDEO_UNAVAILABLE"
  | "SUBTITLE_UNAVAILABLE"
  | "UNSUPPORTED_URL"
  | "DOWNLOAD_FAILED";

export class YtDlpError extends Error {
  override readonly name = "YtDlpError";

  constructor(
    public readonly code: YtDlpErrorCode,
    message: string,
    public readonly details?: { stderr?: string; exitCode?: number },
  ) {
    super(message);
  }
}
