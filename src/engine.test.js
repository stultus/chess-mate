import { describe, it, expect } from "vitest";
import { INITIAL_BOARD, findKing, computePhase } from "./engine.js";

describe("engine smoke test", () => {
  it("finds kings on initial board", () => {
    expect(findKing(INITIAL_BOARD, "w")).toEqual([7, 4]);
    expect(findKing(INITIAL_BOARD, "b")).toEqual([0, 4]);
  });
});

describe("computePhase", () => {
  it("returns 256 for starting position", () => {
    expect(computePhase(INITIAL_BOARD)).toBe(256);
  });

  it("returns 0 for king-and-pawn endgame", () => {
    const board = [
      ["","","","","k","","",""],
      ["p","p","p","","","","",""],
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["","","","","","","",""],
      ["","","","P","P","","",""],
      ["","","","","K","","",""],
    ];
    expect(computePhase(board)).toBe(0);
  });

  it("returns intermediate value when some pieces removed", () => {
    const board = INITIAL_BOARD.map(r => [...r]);
    board[0][3] = ""; // remove black queen
    board[7][3] = ""; // remove white queen
    // 24 - 8 = 16, so phase = 16/24 * 256 = 170 (rounded)
    expect(computePhase(board)).toBe(Math.round(16 / 24 * 256));
  });
});
