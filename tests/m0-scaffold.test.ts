import { describe, it, expect } from "vitest";

describe("M0 repository scaffold", () => {
  it("runs tests in the pnpm workspace", () => {
    expect(Number.parseInt(process.versions.node ?? "0", 10)).toBeGreaterThanOrEqual(22);
  });
});
