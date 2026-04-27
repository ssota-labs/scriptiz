import { describe, it, expect } from "vitest";
import {
  addResourceToList,
  createUserList,
  removeListItem,
  updateListMetadata,
} from "./list.js";

const now = "2026-04-27T12:00:00.000Z";

describe("user list", () => {
  it("create and add", () => {
    let list = createUserList({
      id: "list_1",
      name: "N",
      now,
    });
    list = addResourceToList(list, {
      resourceId: "youtube_video_x",
      itemId: "item_1",
      now: "2026-04-27T12:01:00.000Z",
    });
    expect(list.items).toHaveLength(1);
    expect(list.updatedAt).toBe("2026-04-27T12:01:00.000Z");
  });

  it("remove", () => {
    let list = createUserList({ id: "l", name: "n", now });
    list = addResourceToList(list, {
      resourceId: "r1",
      itemId: "i1",
      now,
    });
    list = removeListItem(list, "i1", "2026-04-27T12:02:00.000Z");
    expect(list.items).toHaveLength(0);
  });

  it("update metadata", () => {
    let list = createUserList({ id: "l", name: "n", now });
    list = updateListMetadata(list, { name: "new" }, "2026-04-27T12:03:00.000Z");
    expect(list.name).toBe("new");
  });
});
