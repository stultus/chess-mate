import { describe, it, expect } from "vitest";
import { INITIAL_BOARD, findKing, computePhase, chebyshevDistance, evaluatePawnShield, evaluateOpenFilesNearKing, inKingZone, SAFETY_TABLE, isPassedPawn, evaluatePassedPawnBonus, PASSED_BONUS, evaluate, analyzePosition } from "./engine.js";

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

describe("evaluateOpenFilesNearKing", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("returns 0 for king with all files covered by friendly pawns", () => {
    const board = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [6, 6, "P"], [6, 7, "P"]
    ]);
    expect(evaluateOpenFilesNearKing(board, [7, 6], "w")).toBe(0);
  });

  it("penalizes semi-open file (no friendly pawn, enemy pawn present)", () => {
    const board = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [3, 6, "p"], [6, 7, "P"]
    ]);
    // g-file has no friendly pawn but has enemy pawn = -15
    expect(evaluateOpenFilesNearKing(board, [7, 6], "w")).toBe(-15);
  });

  it("penalizes fully open file", () => {
    const board = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [6, 7, "P"]
    ]);
    // g-file fully open = -25
    expect(evaluateOpenFilesNearKing(board, [7, 6], "w")).toBe(-25);
  });

  it("stacks penalties across files", () => {
    const board = makeBoard([[7, 6, "K"]]);
    // f, g, h files all fully open = -75
    expect(evaluateOpenFilesNearKing(board, [7, 6], "w")).toBe(-75);
  });
});

describe("inKingZone", () => {
  it("returns true for adjacent squares", () => {
    expect(inKingZone(3, 3, 3, 4)).toBe(true);
    expect(inKingZone(3, 3, 4, 4)).toBe(true);
    expect(inKingZone(3, 3, 2, 2)).toBe(true);
  });
  it("returns true for king square itself", () => {
    expect(inKingZone(3, 3, 3, 3)).toBe(true);
  });
  it("returns false for distant squares", () => {
    expect(inKingZone(3, 3, 5, 5)).toBe(false);
    expect(inKingZone(0, 0, 2, 0)).toBe(false);
  });
});

describe("SAFETY_TABLE", () => {
  it("has 70 entries with monotonic non-decreasing values", () => {
    expect(SAFETY_TABLE.length).toBe(70);
    for (let i = 1; i < SAFETY_TABLE.length; i++) {
      expect(SAFETY_TABLE[i]).toBeGreaterThanOrEqual(SAFETY_TABLE[i - 1]);
    }
  });
  it("caps around 497", () => {
    expect(SAFETY_TABLE[69]).toBe(497);
  });
});

describe("isPassedPawn", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("detects white passed pawn with no blockers", () => {
    const board = makeBoard([[3, 4, "P"]]);
    expect(isPassedPawn(board, 3, 4, "w")).toBe(true);
  });

  it("rejects white pawn blocked on same file", () => {
    const board = makeBoard([[3, 4, "P"], [2, 4, "p"]]);
    expect(isPassedPawn(board, 3, 4, "w")).toBe(false);
  });

  it("rejects white pawn with enemy on adjacent file ahead", () => {
    const board = makeBoard([[3, 4, "P"], [2, 5, "p"]]);
    expect(isPassedPawn(board, 3, 4, "w")).toBe(false);
  });

  it("allows white pawn with enemy pawn on adjacent file BEHIND", () => {
    const board = makeBoard([[3, 4, "P"], [5, 5, "p"]]);
    expect(isPassedPawn(board, 3, 4, "w")).toBe(true);
  });

  it("detects black passed pawn", () => {
    const board = makeBoard([[4, 3, "p"]]);
    expect(isPassedPawn(board, 4, 3, "b")).toBe(true);
  });

  it("rejects black pawn blocked", () => {
    const board = makeBoard([[4, 3, "p"], [5, 2, "P"]]);
    expect(isPassedPawn(board, 4, 3, "b")).toBe(false);
  });
});

describe("evaluatePassedPawnBonus", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("exports exponential bonus array", () => {
    expect(PASSED_BONUS).toEqual([0, 0, 5, 12, 25, 50, 100, 200]);
  });

  it("gives rank-based bonus for white passer on 7th rank (row 1)", () => {
    const board = makeBoard([[1, 3, "P"], [0, 4, "k"], [7, 4, "K"]]);
    const result = evaluatePassedPawnBonus(board, "w", [7, 4], [0, 4], "w");
    // Pawn on row 1 => rank index = 7 - 1 = 6. PASSED_BONUS[6] = 100.
    // King distances: friendly dist(7,4,1,3)=6, enemy dist(0,4,1,3)=1
    // Proximity: (1 - 6) * 5 * (100/50) = -50
    // Bonus = 100 - 50 = 50
    // Not unstoppable (enemy king distance to promo = 1, pawn distance to promo = 1)
    expect(result).toBe(50);
  });

  it("detects unstoppable pawn (rule of the square)", () => {
    // White pawn on row 3 (5th rank from white), enemy king far away in corner
    const board = makeBoard([[3, 0, "P"], [0, 7, "k"], [7, 7, "K"]]);
    const result = evaluatePassedPawnBonus(board, "w", [7, 7], [0, 7], "w");
    // Base bonus 50 (5th rank). King proximity contributes.
    // Plus 500 for unstoppable (enemy king can't reach a8 in 3 moves from h8)
    expect(result).toBeGreaterThan(500);
  });

  it("applies protected multiplier (1.5x)", () => {
    // White passer on d5 (row 3, col 3) protected by pawn on c4 (row 4, col 2).
    // Black pawn on b5 (row 3, col 1) prevents c4 from being passed itself,
    // isolating the 1.5x protected multiplier from the connected-passer bonus.
    const withProtector = makeBoard([
      [3, 3, "P"], [4, 2, "P"], [3, 1, "p"], [0, 4, "k"], [7, 4, "K"]
    ]);
    const withoutProtector = makeBoard([
      [3, 3, "P"], [3, 1, "p"], [0, 4, "k"], [7, 4, "K"]
    ]);
    const protectedResult = evaluatePassedPawnBonus(withProtector, "w", [7, 4], [0, 4], "w");
    const unprotectedResult = evaluatePassedPawnBonus(withoutProtector, "w", [7, 4], [0, 4], "w");
    // Rank-4 bonus = 25. Protected: round(25 * 1.5) = 38. Difference = 13.
    expect(protectedResult - unprotectedResult).toBe(13);
  });

  it("returns 0 when no passed pawns", () => {
    const board = makeBoard([
      [3, 4, "P"], [2, 4, "p"], [0, 4, "k"], [7, 4, "K"]
    ]);
    const result = evaluatePassedPawnBonus(board, "w", [7, 4], [0, 4], "w");
    expect(result).toBe(0);
  });
});

describe("evaluate with new terms", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("prefers castled king with pawn shield over exposed king (middlegame)", () => {
    // Add queens and rooks to both sides so phase > 0 and king safety matters
    const safe = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [6, 6, "P"], [6, 7, "P"],
      [7, 0, "R"], [7, 7, "R"], [7, 3, "Q"],
      [0, 4, "k"], [1, 3, "p"], [1, 4, "p"], [1, 5, "p"],
      [0, 0, "r"], [0, 7, "r"], [0, 3, "q"]
    ]);
    const exposed = makeBoard([
      [4, 4, "K"], [6, 5, "P"], [6, 6, "P"], [6, 7, "P"],
      [7, 0, "R"], [7, 7, "R"], [7, 3, "Q"],
      [0, 4, "k"], [1, 3, "p"], [1, 4, "p"], [1, 5, "p"],
      [0, 0, "r"], [0, 7, "r"], [0, 3, "q"]
    ]);
    expect(evaluate(safe, "w")).toBeGreaterThan(evaluate(exposed, "w"));
  });

  it("values advanced passed pawn higher than blocked pawn", () => {
    const passed = makeBoard([
      [7, 4, "K"], [1, 0, "P"], [0, 7, "k"]
    ]);
    const blocked = makeBoard([
      [7, 4, "K"], [1, 0, "P"], [0, 0, "k"]
    ]);
    expect(evaluate(passed, "w")).toBeGreaterThan(evaluate(blocked, "w"));
  });
});

describe("check extensions", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("finds mate-in-1 reliably", () => {
    // Back rank mate: white rook on a1 plays Ra8#
    // Black king on h8 trapped by pawns on g7, h7
    const board = makeBoard([
      [0, 7, "k"], [1, 6, "p"], [1, 7, "p"],
      [7, 6, "K"], [7, 0, "R"]
    ]);
    const analysis = analyzePosition(board, "w", null, {wK:false,wQ:false,bK:false,bQ:false}, ["x"]);
    // Ra8# is mate. Eval should be very high (mate score).
    expect(analysis[0].eval).toBeGreaterThan(50);
  });
});

describe("null move pruning sanity", () => {
  it("still suggests reasonable opening moves", () => {
    const analysis = analyzePosition(INITIAL_BOARD, "w", null, {wK:true,wQ:true,bK:true,bQ:true}, []);
    expect(analysis.length).toBeGreaterThan(0);
    // Top move should be a known opening
    const topAlg = analysis[0].alg;
    expect(["e2e4", "d2d4", "c2c4", "g1f3"]).toContain(topAlg);
  });
});

describe("endgame passed pawn race", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("values black's unstoppable d-pawn as decisive disadvantage for white", () => {
    // Position roughly from move 47 of a real losing game:
    // Black has a d-pawn on the 5th rank, black king supporting it,
    // white king too far to catch it. Black's pawn is unstoppable.
    const board = makeBoard([
      [3, 7, "K"],  // White king on h5 (far from d-pawn)
      [5, 3, "p"],  // Black pawn on d3 (2 squares from promoting)
      [6, 2, "k"],  // Black king on c2 (supporting the pawn)
    ]);
    const score = evaluate(board, "w");
    // White is evaluated from white's perspective. A decisive black advantage
    // should yield a significantly negative score.
    // Unstoppable pawn gets +500 bonus for black, so white should be deeply negative.
    expect(score).toBeLessThan(-300);
  });
});
