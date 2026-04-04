# Chess Mate Engine Improvements Design

**Date:** 2026-04-05
**Goal:** Improve engine evaluation and search depth to handle king safety, passed pawn races, and deep tactical sequences within the existing 3-second time budget. Optimized for use as a live companion during 10-minute games.

## Context

In a real game (Caro-Kann Advance, stultusz vs rajasthanroyalsOP), the engine failed in three ways:
1. Could not see a pawn promotion 5 moves ahead (search too shallow)
2. Had no king safety evaluation (recommended moves leading to an exposed king)
3. Valued an unstoppable passed pawn at ~40cp instead of ~500cp

## 1. Game Phase System

All new evaluation terms use phase-interpolated scoring.

**Phase calculation:**
- Phase weights: N=1, B=1, R=2, Q=4
- Starting total: 4N + 4B + 4R + 2Q = 24
- `phase = clamp((totalPhasePoints / 24) * 256, 0, 256)`
- 256 = full middlegame, 0 = pure endgame

**Score blending:**
```
finalScore = (mgScore * phase + egScore * (256 - phase)) / 256
```

New evaluation terms provide separate mg and eg values. Existing PST and material scores remain unphased for now.

## 2. King Safety Evaluation

Phase weighting: mg = full, eg = 0 (king safety is a middlegame concern).

### 2A. Pawn Shield

Check the 3 pawns in front of the castled king (e.g., f2/g2/h2 for kingside-castled white king).

| Pawn state | Penalty |
|---|---|
| On starting rank | 0 cp |
| Advanced one rank | -10 cp |
| Advanced two ranks | -20 cp |
| Missing | -25 cp |

Sum penalties for the 3 shield squares. Only applies when king is on ranks 1 (white) or 8 (black) in the kingside (f-h files) or queenside (a-c files) zones.

### 2B. Open Files Near King

Scan king's file and two adjacent files:

| File state | Penalty |
|---|---|
| Semi-open (no friendly pawn) | -15 cp |
| Fully open (no pawns at all) | -25 cp |

Penalties stack across files.

### 2C. Attacker Counting

During the evaluation piece loop, for each piece, check if any attack squares fall in the enemy king zone (9 squares around the king).

Track per side:
- `attackerCount`: number of distinct pieces attacking the zone
- `attackWeight`: sum of per-piece weights

Per-piece attack weights:
| Piece | Weight |
|---|---|
| Knight | 20 |
| Bishop | 20 |
| Rook | 40 |
| Queen | 80 |

Only apply if `attackerCount >= 2`.

Danger score from an S-curve safety table indexed by `attackWeight`:
```javascript
const SAFETY_TABLE = [
  0,  0,  1,  2,  3,  5,  7,  9, 12, 15,
 18, 22, 26, 30, 35, 39, 44, 50, 56, 62,
 68, 75, 82, 85, 89, 97,105,113,122,131,
140,150,169,180,191,202,213,225,237,248,
260,272,283,295,307,319,330,342,354,366,
378,390,401,413,425,437,449,461,473,485,
497,497,497,497,497,497,497,497,497,497
];
```

Index by `Math.min(attackWeight, SAFETY_TABLE.length - 1)`. Max danger ~500cp.

## 3. Passed Pawn Evaluation

Replace the current linear `(7-rank)*10` bonus.

### 3A. Rank-Based Bonus

Exponential scaling:
```javascript
const PASSED_BONUS = [0, 0, 5, 12, 25, 50, 100, 200]; // indexed by rank (0=promotion square end)
```

For white: index by `7 - row`. For black: index by `row`.

Phase weighting: mg = 50%, eg = 100%.

### 3B. King Proximity

Chebyshev distance (max of rank/file difference):
```
bonus += (enemyKingDist - friendlyKingDist) * 5 * rankFactor
```

`rankFactor = PASSED_BONUS[rank] / 50` (proximity matters more for advanced passers).

Phase weighting: mg = 25%, eg = 100%.

### 3C. Rule of the Square (Unstoppable Pawn)

A pawn is unstoppable if the enemy king cannot reach the promotion square in time:
```
distToPromo = |promoRank - pawnRank|
effectiveKingDist = enemyKingDist - (sideToMove === enemyColor ? 1 : 0)
if (effectiveKingDist > distToPromo) bonus += 500
```

Only apply when no enemy pieces (other than king) can intercept. Avoids false positives.

### 3D. Connected and Protected Passers

Applied as multipliers to the rank-based bonus before phase interpolation:
- Protected (defended by another pawn): 1.5x
- Connected (friendly passer on adjacent file, within 1 rank): 1.3x

## 4. Search Improvements

### 4A. Check Extensions

When the side to move is in check, do not decrement depth (extend by 1 ply). Track cumulative extensions; cap at +16 above nominal depth.

### 4B. Null Move Pruning

Before searching all moves, try passing (null move). If the null-move search still beats beta, prune the node.

- Reduction: `R = depth > 6 ? 3 : 2`
- Search with zero window: `[-beta, -beta+1]`
- Do NOT apply when:
  - Side to move is in check
  - At root node
  - Only king + pawns remain (zugzwang risk)
  - Previous move was also a null move

### 4C. Killer Moves

Store 2 quiet moves per ply that caused beta cutoffs in a `killers[maxPly][2]` array.

Move ordering becomes:
1. Winning captures (existing MVV-LVA)
2. Killer moves
3. Remaining quiet moves

Update killers on beta cutoffs from quiet moves: shift slot 1 to slot 0, store new killer in slot 1. Avoid storing captures as killers.

### 4D. Late Move Reductions (LMR)

After the first 4 moves at a node, reduce remaining moves by 1 ply.

Do NOT reduce when:
- In check
- Captures or promotions
- Killer moves
- Depth < 3

If a reduced search returns score > alpha, re-search at full depth to verify.

## 5. Architecture

### Files changed
- `src/engine.js` only. No UI changes.

### Evaluation restructure

`evaluate()` becomes:
1. Single-pass loop: material, PST, collect piece positions, compute game phase, count attackers on king zones
2. Call `evaluateKingSafety()`: pawn shield + open files + safety table lookup
3. Call `evaluatePassedPawns()`: rank bonus + king proximity + rule of square + connected/protected
4. Blend mg/eg scores using phase, add to existing score

New functions:
- `computePhase(board)` -> 0-256
- `evaluateKingSafety(board, kingSq, side, phase, attackerCount, attackWeight)` -> centipawns
- `evaluatePassedPawns(board, side, phase, wKingSq, bKingSq, sideToMove)` -> centipawns
- `chebyshevDistance(r1, c1, r2, c2)` -> integer

### Search changes

`alphaBeta()` gains parameters:
- `extensions`: cumulative extension count (cap at 16)
- `nullMoveAllowed`: boolean
- `killers`: shared array reference

New module-level state:
- `_killers[MAX_PLY][2]`: killer move table, reset per `searchBestMoves` call

### Constants (module-level, no allocation during search)
- `SAFETY_TABLE`: 70-entry S-curve array
- `PASSED_BONUS`: 8-entry rank bonus array
- `PHASE_WEIGHTS`: piece-type to phase-point mapping

### What stays the same
- Board representation (8x8 array)
- Make/unmake pattern
- Quiescence search (unchanged)
- Opening book
- Worker interface
- All UI code
- `generateMoves`, `generateCaptures`, `getLegalMoves` signatures
