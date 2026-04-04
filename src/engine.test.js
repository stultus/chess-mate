import { describe, it, expect } from "vitest";
import { INITIAL_BOARD, findKing } from "./engine.js";

describe("engine smoke test", () => {
  it("finds kings on initial board", () => {
    expect(findKing(INITIAL_BOARD, "w")).toEqual([7, 4]);
    expect(findKing(INITIAL_BOARD, "b")).toEqual([0, 4]);
  });
});
