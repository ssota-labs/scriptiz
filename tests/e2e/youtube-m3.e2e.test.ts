import { describe, it, expect } from "vitest";
import { YtDlpExtractor } from "@scriptiz/extractor-ytdlp";

const url = process.env.E2E_YOUTUBE_URL;

/**
 * 실제 `yt-dlp`가 PATH에 있을 때만 의미가 있다. 예:
 * `E2E_YOUTUBE_URL='https://www.youtube.com/watch?v=dQw4w9WgXcQ' pnpm test:e2e`
 */
describe("M3 e2e (optional)", () => {
  it.skipIf(!url)("yt-dlp dump-json for one URL", async () => {
    const ex = new YtDlpExtractor();
    const dump = await ex.getYoutubeMetadataDump(url!);
    expect(dump).toBeTruthy();
    if (typeof dump === "object" && dump) {
      expect((dump as { id?: string }).id).toBeTruthy();
    }
  });
});
