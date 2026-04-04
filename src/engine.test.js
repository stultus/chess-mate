import { describe, it, expect } from "vitest";
import { INITIAL_BOARD, findKing, computePhase, chebyshevDistance, evaluatePawnShield } from "./engine.js";

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

describe("chebyshevDistance", () => {
  it("returns 0 for same square", () => {
    expect(chebyshevDistance(3, 3, 3, 3)).toBe(0);
  });
  it("returns max of rank/file diff", () => {
    expect(chebyshevDistance(0, 0, 7, 7)).toBe(7);
    expect(chebyshevDistance(0, 0, 3, 7)).toBe(7);
    expect(chebyshevDistance(2, 5, 4, 3)).toBe(2);
  });
});

describe("evaluatePawnShield", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("returns 0 for intact kingside shield", () => {
    const board = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [6, 6, "P"], [6, 7, "P"]
    ]);
    expect(evaluatePawnShield(board, [7, 6], "w")).toBe(0);
  });

  it("penalizes advanced shield pawns", () => {
    // g2 pawn advanced to g3 (one rank) = -10
    const board = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [5, 6, "P"], [6, 7, "P"]
    ]);
    expect(evaluatePawnShield(board, [7, 6], "w")).toBe(-10);
  });

  it("penalizes missing shield pawns", () => {
    // g2 missing, f2 and h2 present = -25
    const board = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [6, 7, "P"]
    ]);
    expect(evaluatePawnShield(board, [7, 6], "w")).toBe(-25);
  });

  it("returns 0 when king is not on back rank", () => {
    const board = makeBoard([[4, 4, "K"]]);
    expect(evaluatePawnShield(board, [4, 4], "w")).toBe(0);
  });

  it("works for black king (kingside castled)", () => {
    const board = makeBoard([
      [0, 6, "k"], [1, 5, "p"], [1, 6, "p"], [1, 7, "p"]
    ]);
    expect(evaluatePawnShield(board, [0, 6], "b")).toBe(0);
  });
});
