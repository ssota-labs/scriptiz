import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExtractorPort } from "@scriptiz/ports";
import { LocalJobQueue } from "@scriptiz/queue-local";
import { FilesystemStorage } from "@scriptiz/storage-filesystem";
import { describe, expect, it } from "vitest";
import { createScriptizMcpContext } from "./context.js";
import type { ScriptizMcpContext } from "./context.js";
import { handleExtractChannelLatest, handleExtractPlaylist, handleListLists } from "./handlers.js";
import { createUserList } from "@scriptiz/core";

describe("mcp tool handlers (filesystem)", () => {
  it("list_lists and get_content", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "scriptiz-mcp-"));
    try {
      const ctx = createScriptizMcpContext({ dataDir: dir, defaultLanguage: "en" });
      const empty = await handleListLists(ctx);
      expect("lists" in empty && (empty as { lists: unknown[] }).lists).toEqual([]);

      const list = createUserList({
        id: "list_test1",
        name: "L",
        now: new Date().toISOString(),
      });
      await mkdir(path.join(dir, "lists"), { recursive: true });
      await ctx.storage.putList(list);

      const listed = await handleListLists(ctx);
      expect(
        (listed as { lists: { id: string; name: string }[] }).lists,
      ).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("extract_playlist merges flat NDJSON lines (video per line)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "scriptiz-mcp-pl-"));
    const playlistId = "PLtestflat123456";
    const flatLines = [
      {
        _type: "video",
        id: "vidAAA",
        title: "First",
        webpage_url: "https://www.youtube.com/watch?v=vidAAA",
        duration: 10,
        playlist_id: playlistId,
        playlist_title: "Series",
        playlist_webpage_url: `https://www.youtube.com/playlist?list=${playlistId}`,
        playlist_uploader: "Uploader",
      },
      {
        _type: "video",
        id: "vidBBB",
        title: "Second",
        webpage_url: "https://www.youtube.com/watch?v=vidBBB",
        duration: 20,
        playlist_id: playlistId,
        playlist_title: "Series",
        playlist_webpage_url: `https://www.youtube.com/playlist?list=${playlistId}`,
        playlist_uploader: "Uploader",
      },
    ];
    const extractor: Pick<ExtractorPort, "getMetadataDumpLines"> = {
      async getMetadataDumpLines() {
        return flatLines;
      },
    };
    const ctx: ScriptizMcpContext = {
      dataDir: dir,
      defaultLanguage: "en",
      storage: new FilesystemStorage(dir),
      queue: new LocalJobQueue(dir),
      extractor: extractor as ExtractorPort,
    };
    try {
      const r = await handleExtractPlaylist(ctx, {
        url: `https://www.youtube.com/playlist?list=${playlistId}`,
        maxItems: 10,
      });
      expect("ok" in r && r.ok === false).toBe(false);
      const ok = r as {
        playlistResourceId: string;
        itemCount: number;
        items: { id: string }[];
      };
      expect(ok.playlistResourceId).toBe(`youtube_playlist_${playlistId}`);
      expect(ok.itemCount).toBe(2);
      expect(ok.items.map((i) => i.id)).toEqual([
        "youtube_video_vidAAA",
        "youtube_video_vidBBB",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("extract_channel_latest merges flat NDJSON lines (video per line)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "scriptiz-mcp-ch-"));
    const channelId = "UCByByTestchannel0001";
    const flatLines = [
      {
        _type: "video",
        id: "aaa111",
        title: "Vid one",
        webpage_url: "https://www.youtube.com/watch?v=aaa111",
        duration: 30,
        channel_id: channelId,
        channel: "에읽남 | 테스트",
        uploader: "에읽남 | 테스트",
      },
      {
        _type: "video",
        id: "bbb222decoy",
        title: "Vid two",
        webpage_url: "https://www.youtube.com/watch?v=bbb222decoy",
        duration: 40,
        channel_id: channelId,
        channel: "에읽남 | 테스트",
        uploader: "에읽남 | 테스트",
      },
    ];
    const tabUrl =
      "https://www.youtube.com/@testuser/videos";
    const extractor: Pick<ExtractorPort, "getMetadataDumpLines"> = {
      async getMetadataDumpLines() {
        return flatLines;
      },
    };
    const ctx: ScriptizMcpContext = {
      dataDir: dir,
      defaultLanguage: "en",
      storage: new FilesystemStorage(dir),
      queue: new LocalJobQueue(dir),
      extractor: extractor as ExtractorPort,
    };
    try {
      const r = await handleExtractChannelLatest(ctx, {
        url: tabUrl,
        maxItems: 10,
      });
      expect("ok" in r && r.ok === false).toBe(false);
      const ok = r as {
        channelResourceId: string;
        title: string;
        items: { id: string }[];
      };
      expect(ok.channelResourceId).toBe(`youtube_channel_${channelId}`);
      expect(ok.title).toBe("에읽남 | 테스트");
      expect(ok.items.map((i) => i.id)).toEqual([
        "youtube_video_aaa111",
        "youtube_video_bbb222decoy",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
