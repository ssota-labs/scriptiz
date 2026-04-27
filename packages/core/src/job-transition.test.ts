import { describe, it, expect } from "vitest";
import {
  isValidJobTransition,
  requireJobTransition,
} from "./job-transition.js";

describe("job transitions", () => {
  it("allows queued to fetching_metadata", () => {
    expect(
      isValidJobTransition("queued", "fetching_metadata"),
    ).toBe(true);
  });

  it("forbids completed to any", () => {
    expect(isValidJobTransition("completed", "failed")).toBe(false);
  });

  it("allow caption path to completed", () => {
    expect(
      isValidJobTransition("fetching_caption", "completed"),
    ).toBe(true);
  });

  it("requireJobTransition throws on invalid", () => {
    expect(() =>
      requireJobTransition("completed", "fetching_caption"),
    ).toThrow();
  });
});
