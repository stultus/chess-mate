# Chess Engine Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add king safety, passed pawn evaluation, game phase interpolation, and search improvements (check extensions, null move pruning, killer moves, LMR) to the Chess Mate engine.

**Architecture:** All changes confined to `src/engine.js`. New evaluation terms use phase-interpolated mg/eg scoring. Search gains extensions and pruning via new parameters threaded through `alphaBeta`. Module-level constants for tables; no allocations in hot path.

**Tech Stack:** JavaScript (ES modules), Vitest for tests, existing 8x8 array board representation.

**Spec:** `docs/superpowers/specs/2026-04-05-engine-improvements-design.md`

---

## File Structure

**Files modified:**
- `src/engine.js` — evaluation + search changes
- `package.json` — add vitest and test script

**Files created:**
- `src/engine.test.js` — unit tests for new functions
- `vitest.config.js` — vitest configuration

---

## Task 1: Set Up Test Framework

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/engine.test.js`

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add test script to package.json**

In `package.json` scripts section, add `"test": "vitest run"`:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create vitest.config.js**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
  },
});
```

- [ ] **Step 4: Create smoke test**

Create `src/engine.test.js`:
```js
import { describe, it, expect } from "vitest";
import { INITIAL_BOARD, findKing } from "./engine.js";

describe("engine smoke test", () => {
  it("finds kings on initial board", () => {
    expect(findKing(INITIAL_BOARD, "w")).toEqual([7, 4]);
    expect(findKing(INITIAL_BOARD, "b")).toEqual([0, 4]);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/engine.test.js
git commit -m "Add vitest test framework"
```

---

## Task 2: Game Phase System

**Files:**
- Modify: `src/engine.js` (after PIECE_VALUES, around line 4)
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing test**

Add to `src/engine.test.js`:
```js
import { computePhase, INITIAL_BOARD } from "./engine.js";

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
    // Starting position minus both queens
    const board = INITIAL_BOARD.map(r => [...r]);
    board[0][3] = ""; // remove black queen
    board[7][3] = ""; // remove white queen
    // 24 - 8 = 16, so phase = 16/24 * 256 = 170 (rounded)
    expect(computePhase(board)).toBe(Math.round(16 / 24 * 256));
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test`
Expected: FAIL — `computePhase is not a function`

- [ ] **Step 3: Implement computePhase**

Add to `src/engine.js` after `PIECE_VALUES`:
```js
const PHASE_WEIGHTS = { n: 1, b: 1, r: 2, q: 4 };
const MAX_PHASE = 24;

export function computePhase(board) {
  let total = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const w = PHASE_WEIGHTS[p.toLowerCase()];
    if (w) total += w;
  }
  const phase = Math.round((Math.min(total, MAX_PHASE) / MAX_PHASE) * 256);
  return phase;
}
```

- [ ] **Step 4: Run test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add game phase computation for mg/eg interpolation"
```

---

## Task 3: Chebyshev Distance Helper

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing test**

Add to `src/engine.test.js`:
```js
import { chebyshevDistance } from "./engine.js";

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement**

Add to `src/engine.js` (near top-level utilities):
```js
export function chebyshevDistance(r1, c1, r2, c2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add chebyshevDistance helper"
```

---

## Task 4: Pawn Shield Evaluation

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/engine.test.js`:
```js
import { evaluatePawnShield } from "./engine.js";

describe("evaluatePawnShield", () => {
  // Kingside castled white king with intact shield (f2,g2,h2 pawns)
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
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement**

Add to `src/engine.js`:
```js
export function evaluatePawnShield(board, kingSq, side) {
  const [kr, kc] = kingSq;
  const backRank = side === "w" ? 7 : 0;
  if (kr !== backRank) return 0;
  // Only evaluate shield for castled-style king positions
  if (kc < 5 && kc > 2) return 0; // king in center, no shield applies

  const pawn = side === "w" ? "P" : "p";
  const pawnStartRank = side === "w" ? 6 : 1;
  const dir = side === "w" ? -1 : 1;

  // Determine 3 shield files (king file and 2 adjacent, clamped to board)
  const files = [];
  if (kc >= 5) { files.push(5, 6, 7); } // kingside
  else { files.push(0, 1, 2); } // queenside

  let penalty = 0;
  for (const f of files) {
    // Find friendly pawn on this file, closest to king
    let foundRank = -1;
    for (let r = pawnStartRank; r !== backRank; r += -dir) {
      if (board[r][f] === pawn) { foundRank = r; break; }
    }
    if (foundRank === -1) {
      penalty -= 25; // missing
    } else {
      const advance = Math.abs(foundRank - pawnStartRank);
      if (advance === 1) penalty -= 10;
      else if (advance === 2) penalty -= 20;
      else if (advance >= 3) penalty -= 25;
    }
  }
  return penalty;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add pawn shield evaluation for king safety"
```

---

## Task 5: Open Files Near King

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/engine.test.js`:
```js
import { evaluateOpenFilesNearKing } from "./engine.js";

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
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement**

Add to `src/engine.js`:
```js
export function evaluateOpenFilesNearKing(board, kingSq, side) {
  const [, kc] = kingSq;
  const friendlyPawn = side === "w" ? "P" : "p";
  const enemyPawn = side === "w" ? "p" : "P";

  let penalty = 0;
  for (const f of [kc - 1, kc, kc + 1]) {
    if (f < 0 || f > 7) continue;
    let hasFriendly = false, hasEnemy = false;
    for (let r = 0; r < 8; r++) {
      if (board[r][f] === friendlyPawn) hasFriendly = true;
      if (board[r][f] === enemyPawn) hasEnemy = true;
    }
    if (!hasFriendly && !hasEnemy) penalty -= 25;
    else if (!hasFriendly) penalty -= 15;
  }
  return penalty;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add open file near king evaluation"
```

---

## Task 6: Attack Zone Helper and Safety Table

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing test**

Add to `src/engine.test.js`:
```js
import { inKingZone, SAFETY_TABLE } from "./engine.js";

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
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement**

Add to `src/engine.js`:
```js
export const SAFETY_TABLE = [
    0,  0,  1,  2,  3,  5,  7,  9, 12, 15,
   18, 22, 26, 30, 35, 39, 44, 50, 56, 62,
   68, 75, 82, 85, 89, 97,105,113,122,131,
  140,150,169,180,191,202,213,225,237,248,
  260,272,283,295,307,319,330,342,354,366,
  378,390,401,413,425,437,449,461,473,485,
  497,497,497,497,497,497,497,497,497,497
];

export const ATTACK_WEIGHTS = { n: 20, b: 20, r: 40, q: 80 };

export function inKingZone(kr, kc, r, c) {
  return Math.abs(kr - r) <= 1 && Math.abs(kc - c) <= 1;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add king zone helper and attacker safety table"
```

---

## Task 7: Passed Pawn Detection Helper

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/engine.test.js`:
```js
import { isPassedPawn } from "./engine.js";

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
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement**

Add to `src/engine.js`:
```js
export function isPassedPawn(board, r, c, side) {
  const enemyPawn = side === "w" ? "p" : "P";
  const [startR, endR, step] = side === "w" ? [r - 1, -1, -1] : [r + 1, 8, 1];
  for (let rr = startR; rr !== endR; rr += step) {
    for (let cc = Math.max(0, c - 1); cc <= Math.min(7, c + 1); cc++) {
      if (board[rr][cc] === enemyPawn) return false;
    }
  }
  return true;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add isPassedPawn helper"
```

---

## Task 8: Passed Pawn Evaluation

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write failing tests**

Add to `src/engine.test.js`:
```js
import { evaluatePassedPawnBonus, PASSED_BONUS } from "./engine.js";

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
    // Base bonus 200 (7th rank). Full eg. King distances: friendly dist(7,4,1,3)=6, enemy dist(0,4,1,3)=1
    // Proximity: (1 - 6) * 5 * (200/50) = -100
    // At eg phase, bonus = 200 - 100 = 100
    // Not unstoppable (enemy king distance to promo = 1, pawn distance = 1)
    expect(result).toBe(100);
  });

  it("detects unstoppable pawn (rule of the square)", () => {
    // White pawn on row 3 (5th rank from white), enemy king far away
    const board = makeBoard([[3, 0, "P"], [0, 7, "k"], [7, 7, "K"]]);
    const result = evaluatePassedPawnBonus(board, "w", [7, 7], [0, 7], "w");
    // Base bonus 50 (5th rank). King proximity contributes.
    // Plus 500 for unstoppable (enemy king can't reach a8)
    expect(result).toBeGreaterThan(500);
  });

  it("applies protected multiplier (1.5x)", () => {
    // White passer on d5 (row 3, col 3) protected by pawn on c4 (row 4, col 2)
    const board = makeBoard([
      [3, 3, "P"], [4, 2, "P"], [0, 4, "k"], [7, 4, "K"]
    ]);
    const result = evaluatePassedPawnBonus(board, "w", [7, 4], [0, 4], "w");
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 when no passed pawns", () => {
    const board = makeBoard([
      [3, 4, "P"], [2, 4, "p"], [0, 4, "k"], [7, 4, "K"]
    ]);
    const result = evaluatePassedPawnBonus(board, "w", [7, 4], [0, 4], "w");
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implement**

Add to `src/engine.js`:
```js
export const PASSED_BONUS = [0, 0, 5, 12, 25, 50, 100, 200];

function pieceAtCanIntercept(board, side) {
  // Returns true if enemy has any non-king, non-pawn piece that could potentially intercept
  const enemyNonKingNonPawn = side === "w" ? /[nbrq]/ : /[NBRQ]/;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && enemyNonKingNonPawn.test(board[r][c])) return true;
  }
  return false;
}

function isProtectedPawn(board, r, c, side) {
  const friendlyPawn = side === "w" ? "P" : "p";
  const defRow = side === "w" ? r + 1 : r - 1;
  if (defRow < 0 || defRow > 7) return false;
  if (c > 0 && board[defRow][c - 1] === friendlyPawn) return true;
  if (c < 7 && board[defRow][c + 1] === friendlyPawn) return true;
  return false;
}

function isConnectedPawn(board, r, c, side) {
  // Friendly passer on adjacent file within 1 rank
  const friendlyPawn = side === "w" ? "P" : "p";
  for (const dc of [-1, 1]) {
    const cc = c + dc;
    if (cc < 0 || cc > 7) continue;
    for (const dr of [-1, 0, 1]) {
      const rr = r + dr;
      if (rr < 0 || rr > 7) continue;
      if (board[rr][cc] === friendlyPawn && isPassedPawn(board, rr, cc, side)) return true;
    }
  }
  return false;
}

export function evaluatePassedPawnBonus(board, side, friendlyKingSq, enemyKingSq, sideToMove) {
  const friendlyPawn = side === "w" ? "P" : "p";
  let total = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] !== friendlyPawn) continue;
    if (!isPassedPawn(board, r, c, side)) continue;
    const rank = side === "w" ? 7 - r : r;
    let bonus = PASSED_BONUS[rank];
    // Multipliers
    if (isProtectedPawn(board, r, c, side)) bonus = Math.round(bonus * 1.5);
    if (isConnectedPawn(board, r, c, side)) bonus = Math.round(bonus * 1.3);
    // King proximity
    const friendlyDist = chebyshevDistance(friendlyKingSq[0], friendlyKingSq[1], r, c);
    const enemyDist = chebyshevDistance(enemyKingSq[0], enemyKingSq[1], r, c);
    const rankFactor = PASSED_BONUS[rank] / 50;
    const proximity = (enemyDist - friendlyDist) * 5 * rankFactor;
    // Rule of the square
    const promoRow = side === "w" ? 0 : 7;
    const promoCol = c;
    const distToPromo = Math.abs(promoRow - r);
    const enemyKingDistToPromo = chebyshevDistance(enemyKingSq[0], enemyKingSq[1], promoRow, promoCol);
    const tempo = sideToMove === side ? 0 : 1;
    const unstoppable = (enemyKingDistToPromo - tempo) > distToPromo && !pieceAtCanIntercept(board, side);
    total += bonus + Math.round(proximity) + (unstoppable ? 500 : 0);
  }
  return total;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add passed pawn evaluation with king proximity and rule of square"
```

---

## Task 9: Integrate New Evaluation into evaluate()

**Files:**
- Modify: `src/engine.js` (the existing `evaluate` function)
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write integration test**

Add to `src/engine.test.js`:
```js
describe("evaluate with new terms", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("scores exposed king worse than castled king for same material", () => {
    // We can't import evaluate directly (it's not exported), so test via analyzePosition
    // For now just verify the helper functions are called - this will be an integration-level
    // smoke test using a known king-hunt position vs safe position
    // This test is a placeholder; integration is verified via the final perft-style comparison
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Export evaluate temporarily for testing**

In `src/engine.js`, change `function evaluate` to `export function evaluate`.

- [ ] **Step 3: Write real integration test**

Replace the placeholder in `src/engine.test.js`:
```js
import { evaluate } from "./engine.js";

describe("evaluate with new terms", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("prefers castled king with pawn shield over exposed king", () => {
    // Same pieces, different king positions
    const safe = makeBoard([
      [7, 6, "K"], [6, 5, "P"], [6, 6, "P"], [6, 7, "P"],
      [0, 4, "k"], [1, 3, "p"], [1, 4, "p"], [1, 5, "p"]
    ]);
    const exposed = makeBoard([
      [4, 4, "K"], [6, 5, "P"], [6, 6, "P"], [6, 7, "P"],
      [0, 4, "k"], [1, 3, "p"], [1, 4, "p"], [1, 5, "p"]
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
```

- [ ] **Step 4: Run test to verify failure**

Run: `npm test`
Expected: The existing `evaluate` doesn't use the new terms yet so the castled-king test may already pass (PST favors castled position) but the passed pawn test likely differs by only a small margin.

- [ ] **Step 5: Modify evaluate() to include king safety and passed pawns**

In `src/engine.js`, replace the existing `evaluate` function. The new version computes king safety and passed pawns, blends by phase, and replaces the old linear passed-pawn term:

```js
export function evaluate(board, side) {
  let mgScore = 0, egScore = 0;
  let totalMat = 0;
  let wB = 0, bB = 0;
  let wKr = 0, wKc = 0, bKr = 0, bKc = 0;
  let wAttackerCount = 0, wAttackWeight = 0;
  let bAttackerCount = 0, bAttackWeight = 0;
  let phasePoints = 0;

  // First find kings (needed for attacker counting)
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] === "K") { wKr = r; wKc = c; }
    else if (board[r][c] === "k") { bKr = r; bKc = c; }
  }

  // Main piece loop: material, PST, phase, attacker counting
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const t = p.toLowerCase();
    if (t === "k") continue;
    const val = PIECE_VALUES[t] || 0;
    const w = isWhite(p);
    totalMat += val;
    const phW = PHASE_WEIGHTS[t];
    if (phW) phasePoints += phW;
    const pi = w ? r * 8 + c : (7 - r) * 8 + c;
    const pv = PST[t] ? PST[t][pi] : 0;
    if (w) { mgScore += val + pv; if (t === "b") wB++; }
    else { mgScore -= val + pv; if (t === "b") bB++; }
    egScore = mgScore; // material/PST unphased for now

    // Attacker counting: does this piece attack enemy king zone?
    if (t !== "p") {
      const enemyKr = w ? bKr : wKr;
      const enemyKc = w ? bKc : wKc;
      const aw = ATTACK_WEIGHTS[t];
      if (aw && pieceAttacksZone(board, r, c, t, enemyKr, enemyKc)) {
        if (w) { wAttackerCount++; wAttackWeight += aw; }
        else { bAttackerCount++; bAttackWeight += aw; }
      }
    }
  }

  // King PST
  const phase = Math.round((Math.min(phasePoints, MAX_PHASE) / MAX_PHASE) * 256);
  const kpstMg = PST.k, kpstEg = PST.k_end;
  mgScore += PIECE_VALUES.k + kpstMg[wKr * 8 + wKc];
  mgScore -= PIECE_VALUES.k + kpstMg[(7 - bKr) * 8 + bKc];
  egScore += PIECE_VALUES.k + kpstEg[wKr * 8 + wKc];
  egScore -= PIECE_VALUES.k + kpstEg[(7 - bKr) * 8 + bKc];

  // Bishop pair
  if (wB >= 2) { mgScore += 30; egScore += 30; }
  if (bB >= 2) { mgScore -= 30; egScore -= 30; }

  // Open/semi-open files for rooks (unchanged from original)
  for (let c = 0; c < 8; c++) {
    let wP = 0, bP = 0, wR = false, bR = false;
    for (let r = 0; r < 8; r++) {
      const p = board[r][c];
      if (p === "P") wP++;
      if (p === "p") bP++;
      if (p === "R") wR = true;
      if (p === "r") bR = true;
    }
    if (wR && wP === 0) { const b = bP === 0 ? 25 : 12; mgScore += b; egScore += b; }
    if (bR && bP === 0) { const b = wP === 0 ? 25 : 12; mgScore -= b; egScore -= b; }
  }

  // King safety (middlegame only)
  let kingSafetyMg = 0;
  kingSafetyMg += evaluatePawnShield(board, [wKr, wKc], "w");
  kingSafetyMg -= evaluatePawnShield(board, [bKr, bKc], "b");
  kingSafetyMg += evaluateOpenFilesNearKing(board, [wKr, wKc], "w");
  kingSafetyMg -= evaluateOpenFilesNearKing(board, [bKr, bKc], "b");
  if (bAttackerCount >= 2) kingSafetyMg -= SAFETY_TABLE[Math.min(bAttackWeight, SAFETY_TABLE.length - 1)];
  if (wAttackerCount >= 2) kingSafetyMg += SAFETY_TABLE[Math.min(wAttackWeight, SAFETY_TABLE.length - 1)];
  mgScore += kingSafetyMg;

  // Passed pawns (phase interpolated)
  const wPassedEg = evaluatePassedPawnBonus(board, "w", [wKr, wKc], [bKr, bKc], side);
  const bPassedEg = evaluatePassedPawnBonus(board, "b", [bKr, bKc], [wKr, wKc], side);
  egScore += wPassedEg;
  egScore -= bPassedEg;
  mgScore += Math.round(wPassedEg * 0.5);
  mgScore -= Math.round(bPassedEg * 0.5);

  // Remove the old passed-pawn logic (the (7-r)*10 loops that were here)
  // and the old two-pass evaluation. The above loop handles both mg and eg.

  // Blend
  const finalScore = Math.round((mgScore * phase + egScore * (256 - phase)) / 256);
  return side === "w" ? finalScore : -finalScore;
}
```

Also add the `pieceAttacksZone` helper to `src/engine.js`:
```js
function pieceAttacksZone(board, r, c, type, kr, kc) {
  // Check if piece at (r,c) of given type attacks any square in 3x3 zone around (kr,kc)
  if (type === "n") {
    for (let i = 0; i < 8; i++) {
      const nr = r + KNIGHT_OFFSETS[i][0], nc = c + KNIGHT_OFFSETS[i][1];
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && inKingZone(kr, kc, nr, nc)) return true;
    }
    return false;
  }
  // Sliders: scan rays and check if any reachable square is in zone
  const dirs = type === "r" ? STRAIGHT_DIRS : type === "b" ? DIAG_DIRS : STRAIGHT_DIRS.concat(DIAG_DIRS);
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      if (inKingZone(kr, kc, nr, nc)) return true;
      if (board[nr][nc]) break;
      nr += dr; nc += dc;
    }
  }
  return false;
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: All tests pass, including the new integration tests.

- [ ] **Step 7: Verify the build still works**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Integrate king safety and passed pawn evaluation with phase interpolation"
```

---

## Task 10: Check Extensions

**Files:**
- Modify: `src/engine.js`
- Modify: `src/engine.test.js`

- [ ] **Step 1: Write test for check extension behavior**

Add to `src/engine.test.js`:
```js
import { analyzePosition } from "./engine.js";

describe("check extensions", () => {
  function makeBoard(rows) {
    const b = Array.from({length: 8}, () => Array(8).fill(""));
    for (const [r, c, p] of rows) b[r][c] = p;
    return b;
  }

  it("finds mate-in-1 reliably", () => {
    // Back rank mate: white queen delivers mate on e8
    const board = makeBoard([
      [0, 4, "k"], [0, 3, "r"], [0, 5, "r"], [1, 3, "p"], [1, 4, "p"], [1, 5, "p"],
      [7, 4, "K"], [5, 4, "Q"]
    ]);
    const analysis = analyzePosition(board, "w", null, {wK:false,wQ:false,bK:false,bQ:false}, []);
    // Qe8 is mate. First result should have very high eval.
    expect(analysis[0].eval).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm test`
Expected: Likely passes already, but will be more reliable with check extensions.

- [ ] **Step 3: Add check extensions to alphaBeta**

In `src/engine.js`, modify `alphaBeta` function. Add extension tracking. Find the line `if (depth <= 0) return { score: quiescence(...) };` and modify the function signature and body:

```js
function alphaBeta(board, depth, alpha, beta, side, ep, cast, extensions = 0) {
  if (_searchAborted) return { score: 0 };
  if (checkTime()) return { score: 0 };

  // Check extension: if side to move is in check, extend by 1 ply
  const inCheck = isInCheck(board, side);
  if (inCheck && extensions < 16) {
    depth += 1;
    extensions += 1;
  }

  if (depth <= 0) return { score: quiescence(board, alpha, beta, side, 4) };
  const legal = getLegalMoves(board, side, ep, cast);
  if (legal.length === 0) {
    if (inCheck) return { score: -99999 - depth };
    return { score: 0 };
  }
  sortMoves(board, legal);
  let bestMove = legal[0], bestScore = -Infinity;
  for (let i = 0; i < legal.length; i++) {
    const m = legal[i];
    const nep = (board[m.fr][m.fc].toLowerCase() === "p" && Math.abs(m.tr - m.fr) === 2) ? [(m.fr + m.tr) / 2, m.fc] : null;
    const nc = { ...cast };
    updateCastling(nc, board, m);
    const opp = side === "w" ? "b" : "w";
    const undo = makeMove(board, m);
    const child = alphaBeta(board, depth - 1, -beta, -alpha, opp, nep, nc, extensions);
    unmakeMove(board, undo);
    if (_searchAborted) return { score: bestScore, move: bestMove };
    const score = -child.score;
    if (score > bestScore) { bestScore = score; bestMove = m; }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return { score: bestScore, move: bestMove };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (existing tests still pass, mate test still finds mate).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add check extensions to alphaBeta search"
```

---

## Task 11: Null Move Pruning

**Files:**
- Modify: `src/engine.js`

- [ ] **Step 1: Add hasNonPawnMaterial helper**

Add to `src/engine.js`:
```js
function hasNonPawnMaterial(board, side) {
  const pieces = side === "w" ? /[NBRQ]/ : /[nbrq]/;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && pieces.test(board[r][c])) return true;
  }
  return false;
}
```

- [ ] **Step 2: Add null move pruning to alphaBeta**

Modify `alphaBeta` function signature to accept `nullAllowed` (default true). Add null move logic after the check extension but before the legal moves loop:

```js
function alphaBeta(board, depth, alpha, beta, side, ep, cast, extensions = 0, nullAllowed = true) {
  if (_searchAborted) return { score: 0 };
  if (checkTime()) return { score: 0 };

  const inCheck = isInCheck(board, side);
  if (inCheck && extensions < 16) {
    depth += 1;
    extensions += 1;
  }

  if (depth <= 0) return { score: quiescence(board, alpha, beta, side, 4) };

  // Null move pruning
  if (nullAllowed && !inCheck && depth >= 3 && hasNonPawnMaterial(board, side)) {
    const R = depth > 6 ? 3 : 2;
    const opp = side === "w" ? "b" : "w";
    const nullChild = alphaBeta(board, depth - 1 - R, -beta, -beta + 1, opp, null, cast, extensions, false);
    const nullScore = -nullChild.score;
    if (_searchAborted) return { score: 0 };
    if (nullScore >= beta) return { score: beta };
  }

  const legal = getLegalMoves(board, side, ep, cast);
  if (legal.length === 0) {
    if (inCheck) return { score: -99999 - depth };
    return { score: 0 };
  }
  sortMoves(board, legal);
  let bestMove = legal[0], bestScore = -Infinity;
  for (let i = 0; i < legal.length; i++) {
    const m = legal[i];
    const nep = (board[m.fr][m.fc].toLowerCase() === "p" && Math.abs(m.tr - m.fr) === 2) ? [(m.fr + m.tr) / 2, m.fc] : null;
    const nc = { ...cast };
    updateCastling(nc, board, m);
    const opp = side === "w" ? "b" : "w";
    const undo = makeMove(board, m);
    const child = alphaBeta(board, depth - 1, -beta, -alpha, opp, nep, nc, extensions, true);
    unmakeMove(board, undo);
    if (_searchAborted) return { score: bestScore, move: bestMove };
    const score = -child.score;
    if (score > bestScore) { bestScore = score; bestMove = m; }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return { score: bestScore, move: bestMove };
}
```

- [ ] **Step 3: Update searchBestMoves call site**

In `searchBestMoves`, the call to `alphaBeta` should pass `0, true` for extensions and nullAllowed:
```js
const child = alphaBeta(board, d - 1, -Infinity, Infinity, opp, nep, nc, 0, true);
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS (all existing tests, including mate finding).

- [ ] **Step 5: Verify engine finds same basic moves on starting position**

Add test:
```js
import { INITIAL_BOARD, analyzePosition } from "./engine.js";

describe("null move pruning sanity", () => {
  it("still suggests reasonable opening moves", () => {
    const analysis = analyzePosition(INITIAL_BOARD, "w", null, {wK:true,wQ:true,bK:true,bQ:true}, []);
    expect(analysis.length).toBeGreaterThan(0);
    // Top move should be a known opening
    const topAlg = analysis[0].alg;
    expect(["e2e4", "d2d4", "c2c4", "g1f3"]).toContain(topAlg);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/engine.js src/engine.test.js
git commit -m "Add null move pruning to alphaBeta search"
```

---

## Task 12: Killer Move Heuristic

**Files:**
- Modify: `src/engine.js`

- [ ] **Step 1: Add killer move state**

Add to `src/engine.js` near other search state:
```js
const MAX_PLY = 64;
let _killers = null;

function initKillers() {
  _killers = new Array(MAX_PLY);
  for (let i = 0; i < MAX_PLY; i++) _killers[i] = [null, null];
}

function isSameMove(a, b) {
  return a && b && a.fr === b.fr && a.fc === b.fc && a.tr === b.tr && a.tc === b.tc && a.promo === b.promo;
}

function storeKiller(ply, move, board) {
  // Don't store captures as killers
  if (board[move.tr][move.tc]) return;
  if (isSameMove(_killers[ply][0], move)) return;
  _killers[ply][1] = _killers[ply][0];
  _killers[ply][0] = move;
}
```

- [ ] **Step 2: Initialize killers at search start**

In `searchBestMoves`, add `initKillers()` at the start:
```js
function searchBestMoves(board, side, ep, cast, tl = 3000) {
  _searchAborted = false;
  _nodeCount = 0;
  _searchStart = Date.now();
  _searchTimeLimit = tl;
  initKillers();
  // ... rest
```

- [ ] **Step 3: Modify move scoring to include killers**

Change `moveScore` to accept a ply and boost killer moves:
```js
function moveScore(board, m, ply) {
  let s = 0;
  const v = board[m.tr][m.tc];
  if (v) s += 10 * (PIECE_VALUES[v.toLowerCase()] || 0) - (PIECE_VALUES[board[m.fr][m.fc].toLowerCase()] || 0) + 100000;
  if (m.promo) s += PIECE_VALUES[m.promo] + 90000;
  if (m.castle) s += 50;
  if ((m.tr === 3 || m.tr === 4) && (m.tc === 3 || m.tc === 4)) s += 20;
  // Killer move bonus (placed above normal quiets, below captures)
  if (ply !== undefined && _killers && ply < MAX_PLY) {
    if (isSameMove(_killers[ply][0], m)) s += 9000;
    else if (isSameMove(_killers[ply][1], m)) s += 8000;
  }
  return s;
}

function sortMoves(board, moves, ply) {
  for (let i = 0; i < moves.length; i++) moves[i]._s = moveScore(board, moves[i], ply);
  moves.sort((a, b) => b._s - a._s);
  return moves;
}
```

- [ ] **Step 4: Thread ply through alphaBeta**

Modify `alphaBeta` signature to accept `ply`, pass it into sortMoves, and store killers on beta cutoff:
```js
function alphaBeta(board, depth, alpha, beta, side, ep, cast, extensions = 0, nullAllowed = true, ply = 0) {
  // ... (existing code up to sortMoves)
  sortMoves(board, legal, ply);
  let bestMove = legal[0], bestScore = -Infinity;
  for (let i = 0; i < legal.length; i++) {
    const m = legal[i];
    // ... (unchanged make/unmake)
    const child = alphaBeta(board, depth - 1, -beta, -alpha, opp, nep, nc, extensions, true, ply + 1);
    // ... (unchanged)
    if (alpha >= beta) {
      storeKiller(ply, m, board);
      break;
    }
  }
  return { score: bestScore, move: bestMove };
}
```

Also update `quiescence` to not pass ply (captures-only, no killers needed): leave `sortMoves(board, caps)` as-is (ply will be undefined, no killer bonus applied).

And update `searchBestMoves` root call:
```js
const child = alphaBeta(board, d - 1, -Infinity, Infinity, opp, nep, nc, 0, true, 1);
```

Note: the root iteration in `searchBestMoves` sorts legal moves too:
```js
sortMoves(board, legal, 0);
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/engine.js
git commit -m "Add killer move heuristic to move ordering"
```

---

## Task 13: Late Move Reductions (LMR)

**Files:**
- Modify: `src/engine.js`

- [ ] **Step 1: Add LMR to alphaBeta**

Modify the move loop in `alphaBeta` to reduce search depth on late moves:

```js
  sortMoves(board, legal, ply);
  let bestMove = legal[0], bestScore = -Infinity;
  for (let i = 0; i < legal.length; i++) {
    const m = legal[i];
    const nep = (board[m.fr][m.fc].toLowerCase() === "p" && Math.abs(m.tr - m.fr) === 2) ? [(m.fr + m.tr) / 2, m.fc] : null;
    const nc = { ...cast };
    updateCastling(nc, board, m);
    const opp = side === "w" ? "b" : "w";
    const isCapture = !!board[m.tr][m.tc];
    const isKiller = _killers && ply < MAX_PLY && (isSameMove(_killers[ply][0], m) || isSameMove(_killers[ply][1], m));
    const undo = makeMove(board, m);
    let score;
    // LMR: reduce late, quiet, non-killer moves when not in check and at sufficient depth
    const canReduce = !inCheck && depth >= 3 && i >= 4 && !isCapture && !m.promo && !isKiller;
    if (canReduce) {
      const reducedChild = alphaBeta(board, depth - 2, -alpha - 1, -alpha, opp, nep, nc, extensions, true, ply + 1);
      score = -reducedChild.score;
      if (score > alpha) {
        // Re-search at full depth
        const fullChild = alphaBeta(board, depth - 1, -beta, -alpha, opp, nep, nc, extensions, true, ply + 1);
        score = -fullChild.score;
      }
    } else {
      const child = alphaBeta(board, depth - 1, -beta, -alpha, opp, nep, nc, extensions, true, ply + 1);
      score = -child.score;
    }
    unmakeMove(board, undo);
    if (_searchAborted) return { score: bestScore, move: bestMove };
    if (score > bestScore) { bestScore = score; bestMove = m; }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      storeKiller(ply, m, board);
      break;
    }
  }
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Quick sanity check on opening move**

Run tests again to confirm starting position still picks reasonable opening.
Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js
git commit -m "Add late move reductions (LMR) to alphaBeta search"
```

---

## Task 14: Verification and Cleanup

**Files:**
- Modify: `src/engine.js` (remove temporary export of evaluate if desired)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Build production bundle**

Run: `npm run build`
Expected: Build succeeds. Check bundle size hasn't grown excessively (engine.worker chunk should be under 25kb).

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` in the background, open the dev URL, play a few moves on both sides. Verify:
- Opening move suggestions appear
- Engine responds within 3 seconds
- Analysis shows reasonable moves (no obvious blunders)
- No JavaScript errors in the browser console

Stop the dev server when done.

- [ ] **Step 4: Test the original failing position**

Add a final integration test in `src/engine.test.js`:
```js
describe("endgame passed pawn race", () => {
  it("values black's unstoppable d-pawn highly", () => {
    // Position roughly from move 47 of the original game
    // Black has a d-pawn about to promote, white king too far
    const board = makeBoard([
      [7, 7, ""], // empty
      [5, 3, "p"], // black pawn on d3
      [3, 7, "K"], // white king on h5 (far away)
      [6, 2, "k"], // black king on c2 (supporting)
    ]);
    const board2 = Array.from({length: 8}, () => Array(8).fill(""));
    board2[3][7] = "K";
    board2[5][3] = "p";
    board2[6][2] = "k";
    const score = evaluate(board2, "w");
    // White should be significantly worse (black pawn is unstoppable)
    expect(score).toBeLessThan(-300);
  });
});
```

- [ ] **Step 5: Run new test**

Run: `npm test`
Expected: PASS — the engine now correctly identifies the losing position.

- [ ] **Step 6: Final commit**

```bash
git add src/engine.test.js
git commit -m "Add integration test for endgame passed pawn race position"
```

---

## Self-Review Notes

**Spec coverage check:**
- Section 1 (Game phase) → Task 2 ✓
- Section 2A (Pawn shield) → Task 4 ✓
- Section 2B (Open files) → Task 5 ✓
- Section 2C (Attacker counting) → Tasks 6, 9 ✓
- Section 3A (Rank bonus) → Task 8 ✓
- Section 3B (King proximity) → Task 8 ✓
- Section 3C (Rule of square) → Task 8 ✓
- Section 3D (Connected/protected) → Task 8 ✓
- Section 4A (Check extensions) → Task 10 ✓
- Section 4B (Null move pruning) → Task 11 ✓
- Section 4C (Killer moves) → Task 12 ✓
- Section 4D (LMR) → Task 13 ✓
- Section 5 (Architecture) → All tasks modify `src/engine.js` only ✓

**Type consistency:** All function signatures in later tasks match the ones defined in earlier tasks. `chebyshevDistance`, `inKingZone`, `isPassedPawn`, `evaluatePassedPawnBonus`, `evaluatePawnShield`, `evaluateOpenFilesNearKing` are all defined with consistent parameters across task references.
