import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultScriptizDataDir } from "./default-data-dir.js";

describe("defaultScriptizDataDir", () => {
  it("uses ~/.scriptiz", () => {
    expect(defaultScriptizDataDir()).toBe(
      path.join(homedir(), ".scriptiz"),
    );
  });
});
