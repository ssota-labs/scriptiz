import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createScriptizMcpContext } from "./context.js";
import { handleListLists } from "./handlers.js";
import { createUserList } from "@scriptiz/core";

describe("mcp tool handlers (filesystem)", () => {
  it("list_lists and get_content", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "scriptiz-mcp-"));
    try {
      const ctx = createScriptizMcpContext({ dataDir: dir, defaultLanguage: "en" });
      const empty = await handleListLists(ctx, {});
      expect("lists" in empty && (empty as { lists: unknown[] }).lists).toEqual([]);

      const list = createUserList({
        id: "list_test1",
        name: "L",
        now: new Date().toISOString(),
      });
      await mkdir(path.join(dir, "lists"), { recursive: true });
      await ctx.storage.putList(list);

      const listed = await handleListLists(ctx, {});
      expect(
        (listed as { lists: { id: string; name: string }[] }).lists,
      ).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
