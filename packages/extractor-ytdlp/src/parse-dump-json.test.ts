import { describe, expect, it } from "vitest";
import { parseDumpJsonLines } from "./parse-dump-json.js";

describe("parseDumpJsonLines", () => {
  it("parses single JSON object", () => {
    const r = parseDumpJsonLines(`  {"a":1}  `);
    expect(r).toEqual([{ a: 1 }]);
  });

  it("parses NDJSON", () => {
    const r = parseDumpJsonLines('{"x":1}\n{"x":2}\n');
    expect(r).toEqual([{ x: 1 }, { x: 2 }]);
  });
});
