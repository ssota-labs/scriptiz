import type { Transcript } from "@scriptiz/schemas";

export type RawSubtitleFormat = "vtt";

export interface TranscriptStorePort {
  getTranscript(
    resourceId: string,
    language: string,
  ): Promise<Transcript | null>;
  putTranscript(transcript: Transcript): Promise<void>;
  /**
   * Returns path relative to the data root (POSIX slashes), e.g. transcripts/id/raw.ko.vtt
   */
  putRawSubtitle(
    resourceId: string,
    language: string,
    body: string,
    format?: RawSubtitleFormat,
  ): Promise<string>;

  /**
   * `transcripts/{resourceId}/*.json` 기준, 언어 코드 목록(파일 stem).
   */
  listTranscriptLanguageCodes(resourceId: string): Promise<string[]>;
}
