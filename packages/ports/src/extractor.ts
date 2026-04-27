/**
 * `yt-dlp` 기반 YouTube(단일 video URL) metadata·subtitle 추출.
 * playlist/channel 등은 상위에서 분기.
 */
export type CaptionSourceKind = "native_caption" | "auto_caption";

export interface ExtractorPort {
  /** `yt-dlp --dump-json --skip-download` JSON 루트 */
  getYoutubeMetadataDump(url: string): Promise<unknown>;

  /**
   * VTT를 outputDir에 쓰고 생성된 .vtt 경로를 돌려준다.
   * `yt-dlp --write-subs --write-auto-subs` 사용.
   */
  writeSubtitleVtt(options: {
    url: string;
    language: string;
    outputDir: string;
    /** `selectSubtitleTrack` 결과 — native vs auto 스키마에 사용 */
    track: { isAuto: boolean };
  }): Promise<{ vttPath: string; source: CaptionSourceKind }>;
}
