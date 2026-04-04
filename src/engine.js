// ============================================================
// CHESS ENGINE - optimized for search performance
// ============================================================

export const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

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

export function evaluatePawnShield(board, kingSq, side) {
  const [kr, kc] = kingSq;
  const backRank = side === "w" ? 7 : 0;
  if (kr !== backRank) return 0;
  // Only evaluate shield for castled-style king positions (not center)
  if (kc > 2 && kc < 5) return 0;

  const pawn = side === "w" ? "P" : "p";
  const pawnStartRank = side === "w" ? 6 : 1;
  // Direction from king's back rank toward center (away from king)
  const searchStep = side === "w" ? -1 : 1;

  // Determine 3 shield files
  const files = kc >= 5 ? [5, 6, 7] : [0, 1, 2];

  let penalty = 0;
  for (const f of files) {
    // Find friendly pawn on this file, closest to king
    let foundRank = -1;
    // Start at pawn start rank, search away from king (toward opponent)
    for (let r = pawnStartRank; r >= 0 && r <= 7; r += searchStep) {
      if (board[r][f] === pawn) { foundRank = r; break; }
    }
    if (foundRank === -1) {
      penalty -= 25; // missing
    } else {
      const advance = Math.abs(foundRank - pawnStartRank);
      if (advance === 0) penalty -= 0;
      else if (advance === 1) penalty -= 10;
      else if (advance === 2) penalty -= 20;
      else penalty -= 25;
    }
  }
  return penalty;
}

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

export const PASSED_BONUS = [0, 0, 5, 12, 25, 50, 100, 200];

function canEnemyPieceIntercept(board, side, distToPromo, promoRow, promoCol) {
  // Returns true if enemy has any non-king, non-pawn piece close enough to the
  // promotion square to plausibly reach it before the pawn promotes. Uses
  // Chebyshev distance as an upper-bound approximation (exact for queens/king,
  // loose for knights/sliders).
  const enemyNonKingNonPawn = side === "w" ? /[nbrq]/ : /[NBRQ]/;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (!board[r][c] || !enemyNonKingNonPawn.test(board[r][c])) continue;
    const dist = Math.max(Math.abs(r - promoRow), Math.abs(c - promoCol));
    if (dist <= distToPromo) return true;
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
    const unstoppable = (enemyKingDistToPromo - tempo) > distToPromo && !canEnemyPieceIntercept(board, side, distToPromo, promoRow, promoCol);
    total += bonus + Math.round(proximity) + (unstoppable ? 500 : 0);
  }
  return total;
}

const PST = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,27,27,10,5,5,0,0,0,25,25,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-25,-25,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
  k_end: [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50],
};

const OPENING_BOOK = {
  "":[{move:"e2e4",name:"King's Pawn",eval:0.3,freq:0.35},{move:"d2d4",name:"Queen's Pawn",eval:0.25,freq:0.30},{move:"c2c4",name:"English Opening",eval:0.15,freq:0.12},{move:"g1f3",name:"Reti Opening",eval:0.15,freq:0.10}],
  "e2e4":[{move:"e7e5",name:"Open Game",eval:0.0,freq:0.30},{move:"c7c5",name:"Sicilian Defense",eval:-0.05,freq:0.25},{move:"e7e6",name:"French Defense",eval:0.1,freq:0.12},{move:"c7c6",name:"Caro-Kann",eval:0.1,freq:0.10},{move:"d7d5",name:"Scandinavian",eval:0.2,freq:0.05}],
  "e2e4 e7e5":[{move:"g1f3",name:"King's Knight",eval:0.3,freq:0.55},{move:"f2f4",name:"King's Gambit",eval:0.1,freq:0.05},{move:"f1c4",name:"Bishop's Opening",eval:0.2,freq:0.08}],
  "e2e4 e7e5 g1f3":[{move:"b8c6",name:"Two Knights/Ruy Lopez",eval:0.0,freq:0.60},{move:"g8f6",name:"Petrov's Defense",eval:0.05,freq:0.15},{move:"d7d6",name:"Philidor's Defense",eval:0.15,freq:0.08}],
  "e2e4 e7e5 g1f3 b8c6":[{move:"f1b5",name:"Ruy Lopez",eval:0.3,freq:0.45},{move:"f1c4",name:"Italian Game",eval:0.25,freq:0.30},{move:"d2d4",name:"Scotch Game",eval:0.2,freq:0.10}],
  "e2e4 e7e5 g1f3 b8c6 f1b5":[{move:"a7a6",name:"Morphy Defense",eval:0.0,freq:0.55},{move:"g8f6",name:"Berlin Defense",eval:-0.05,freq:0.25}],
  "e2e4 e7e5 g1f3 b8c6 f1c4":[{move:"f8c5",name:"Giuoco Piano",eval:0.0,freq:0.40},{move:"g8f6",name:"Two Knights Defense",eval:0.1,freq:0.35}],
  "e2e4 c7c5":[{move:"g1f3",name:"Open Sicilian",eval:0.25,freq:0.50},{move:"b1c3",name:"Closed Sicilian",eval:0.15,freq:0.10},{move:"c2c3",name:"Alapin Sicilian",eval:0.15,freq:0.08}],
  "e2e4 c7c5 g1f3":[{move:"d7d6",name:"Najdorf/Dragon",eval:0.0,freq:0.35},{move:"b8c6",name:"Classical Sicilian",eval:0.05,freq:0.25},{move:"e7e6",name:"Scheveningen/Kan",eval:0.05,freq:0.20}],
  "e2e4 e7e6":[{move:"d2d4",name:"French Main Line",eval:0.2,freq:0.70}],
  "e2e4 e7e6 d2d4":[{move:"d7d5",name:"French Defense",eval:0.1,freq:0.85}],
  "e2e4 e7e6 d2d4 d7d5":[{move:"b1c3",name:"French Winawer/Classical",eval:0.2,freq:0.35},{move:"b1d2",name:"French Tarrasch",eval:0.15,freq:0.25},{move:"e4e5",name:"French Advance",eval:0.15,freq:0.25}],
  "e2e4 c7c6":[{move:"d2d4",name:"Caro-Kann Main",eval:0.2,freq:0.60}],
  "d2d4":[{move:"d7d5",name:"Queen's Gambit area",eval:0.0,freq:0.30},{move:"g8f6",name:"Indian Defenses",eval:0.0,freq:0.35}],
  "d2d4 d7d5":[{move:"c2c4",name:"Queen's Gambit",eval:0.25,freq:0.55},{move:"g1f3",name:"Queen's Pawn",eval:0.15,freq:0.20}],
  "d2d4 d7d5 c2c4":[{move:"e7e6",name:"QGD",eval:0.1,freq:0.40},{move:"d5c4",name:"QGA",eval:0.15,freq:0.20},{move:"c7c6",name:"Slav Defense",eval:0.05,freq:0.25}],
  "d2d4 g8f6":[{move:"c2c4",name:"Indian Systems",eval:0.2,freq:0.55},{move:"g1f3",name:"Queen's Pawn",eval:0.1,freq:0.20}],
  "d2d4 g8f6 c2c4":[{move:"g7g6",name:"King's Indian",eval:0.1,freq:0.25},{move:"e7e6",name:"Nimzo/Queen's Indian",eval:0.05,freq:0.30}],
  "c2c4":[{move:"e7e5",name:"Reversed Sicilian",eval:0.0,freq:0.20},{move:"g8f6",name:"English/Indian",eval:0.0,freq:0.25}],
};

export const INITIAL_BOARD = [
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"],
];

// ============================================================
// BOARD UTILITIES
// ============================================================

export function cloneBoard(b) { return b.map(r => [...r]); }
export function isWhite(p) { return p && p === p.toUpperCase(); }
export function isBlack(p) { return p && p === p.toLowerCase(); }
export function pieceColor(p) { return !p ? null : isWhite(p) ? "w" : "b"; }
export function coordToAlg(r, c) { return String.fromCharCode(97 + c) + (8 - r); }
export function algToCoord(a) { return [8 - parseInt(a[1]), a.charCodeAt(0) - 97]; }
export function moveToAlg(fr, fc, tr, tc) { return coordToAlg(fr, fc) + coordToAlg(tr, tc); }
export function chebyshevDistance(r1, c1, r2, c2) { return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)); }

// ============================================================
// ATTACK DETECTION (C1: reverse ray-casting, no move generation)
// ============================================================

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const DIAG_DIRS = [[1,1],[1,-1],[-1,1],[-1,-1]];
const STRAIGHT_DIRS = [[0,1],[0,-1],[1,0],[-1,0]];

export function isSquareAttacked(board, r, c, bySide) {
  const own = bySide === "w" ? isWhite : isBlack;

  // Knight attacks
  for (let i = 0; i < 8; i++) {
    const nr = r + KNIGHT_OFFSETS[i][0], nc = c + KNIGHT_OFFSETS[i][1];
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p && own(p) && (p === "n" || p === "N")) return true;
    }
  }

  // Pawn attacks (look for pawns that could capture this square)
  const pawnDir = bySide === "w" ? 1 : -1;
  const pr = r + pawnDir;
  if (pr >= 0 && pr < 8) {
    if (c > 0) { const p = board[pr][c - 1]; if (p && own(p) && (p === "p" || p === "P")) return true; }
    if (c < 7) { const p = board[pr][c + 1]; if (p && own(p) && (p === "p" || p === "P")) return true; }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p && own(p) && (p === "k" || p === "K")) return true;
    }
  }

  // Rook/Queen (straight lines)
  for (let i = 0; i < 4; i++) {
    const dr = STRAIGHT_DIRS[i][0], dc = STRAIGHT_DIRS[i][1];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p) {
        if (own(p)) {
          const t = p.toLowerCase();
          if (t === "r" || t === "q") return true;
        }
        break;
      }
      nr += dr; nc += dc;
    }
  }

  // Bishop/Queen (diagonals)
  for (let i = 0; i < 4; i++) {
    const dr = DIAG_DIRS[i][0], dc = DIAG_DIRS[i][1];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p) {
        if (own(p)) {
          const t = p.toLowerCase();
          if (t === "b" || t === "q") return true;
        }
        break;
      }
      nr += dr; nc += dc;
    }
  }

  return false;
}

function pieceAttacksZone(board, r, c, type, kr, kc) {
  if (type === "n") {
    for (let i = 0; i < 8; i++) {
      const nr = r + KNIGHT_OFFSETS[i][0], nc = c + KNIGHT_OFFSETS[i][1];
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && inKingZone(kr, kc, nr, nc)) return true;
    }
    return false;
  }
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

// ============================================================
// KING / CHECK
// ============================================================

export function findKing(board, side) {
  const k = side === "w" ? "K" : "k";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === k) return [r, c];
  return null;
}

export function isInCheck(board, side) {
  const kp = findKing(board, side);
  if (!kp) return false;
  return isSquareAttacked(board, kp[0], kp[1], side === "w" ? "b" : "w");
}

// ============================================================
// MOVE GENERATION
// ============================================================

export function generateMoves(board, side, enPassant, castling) {
  const moves = [];
  const own = side === "w" ? isWhite : isBlack;
  const enemy = side === "w" ? isBlack : isWhite;

  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!own(p)) continue;
    const type = p.toLowerCase();

    if (type === "p") {
      const dir = side === "w" ? -1 : 1;
      const startRow = side === "w" ? 6 : 1;
      const promoRow = side === "w" ? 0 : 7;
      if (board[r + dir]?.[c] === "") {
        if (r + dir === promoRow) {
          for (let pi = 0; pi < 4; pi++) moves.push({ fr: r, fc: c, tr: r + dir, tc: c, promo: "qrbn"[pi] });
        } else {
          moves.push({ fr: r, fc: c, tr: r + dir, tc: c });
          if (r === startRow && board[r + 2 * dir]?.[c] === "") moves.push({ fr: r, fc: c, tr: r + 2 * dir, tc: c });
        }
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc < 0 || nc > 7) continue;
        if (board[r + dir]?.[nc] && enemy(board[r + dir][nc])) {
          if (r + dir === promoRow) for (let pi = 0; pi < 4; pi++) moves.push({ fr: r, fc: c, tr: r + dir, tc: nc, promo: "qrbn"[pi] });
          else moves.push({ fr: r, fc: c, tr: r + dir, tc: nc });
        }
        if (enPassant && enPassant[0] === r + dir && enPassant[1] === nc) {
          moves.push({ fr: r, fc: c, tr: r + dir, tc: nc, ep: true });
        }
      }
    } else if (type === "n") {
      for (let i = 0; i < 8; i++) {
        const nr = r + KNIGHT_OFFSETS[i][0], nc = c + KNIGHT_OFFSETS[i][1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !own(board[nr][nc])) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
      }
    } else if (type === "k") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !own(board[nr][nc])) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
      }
      if (castling) {
        const row = side === "w" ? 7 : 0;
        if (r === row && c === 4) {
          if (castling[side + "K"] && board[row][5] === "" && board[row][6] === "" && board[row][7]?.toLowerCase() === "r" && own(board[row][7]))
            moves.push({ fr: r, fc: c, tr: row, tc: 6, castle: "K" });
          if (castling[side + "Q"] && board[row][3] === "" && board[row][2] === "" && board[row][1] === "" && board[row][0]?.toLowerCase() === "r" && own(board[row][0]))
            moves.push({ fr: r, fc: c, tr: row, tc: 2, castle: "Q" });
        }
      }
    } else {
      const dirs = type === "r" ? STRAIGHT_DIRS : type === "b" ? DIAG_DIRS : STRAIGHT_DIRS.concat(DIAG_DIRS);
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (own(board[nr][nc])) break;
          moves.push({ fr: r, fc: c, tr: nr, tc: nc });
          if (enemy(board[nr][nc])) break;
          nr += dr; nc += dc;
        }
      }
    }
  }
  return moves;
}

// C7: Dedicated capture/promotion generator for quiescence search
function generateCaptures(board, side) {
  const moves = [];
  const own = side === "w" ? isWhite : isBlack;
  const enemy = side === "w" ? isBlack : isWhite;

  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!own(p)) continue;
    const type = p.toLowerCase();

    if (type === "p") {
      const dir = side === "w" ? -1 : 1;
      const promoRow = side === "w" ? 0 : 7;
      // Non-capture promotions
      if (r + dir === promoRow && board[r + dir]?.[c] === "") {
        for (let pi = 0; pi < 4; pi++) moves.push({ fr: r, fc: c, tr: r + dir, tc: c, promo: "qrbn"[pi] });
      }
      // Captures (including capture-promotions)
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc < 0 || nc > 7) continue;
        if (board[r + dir]?.[nc] && enemy(board[r + dir][nc])) {
          if (r + dir === promoRow) for (let pi = 0; pi < 4; pi++) moves.push({ fr: r, fc: c, tr: r + dir, tc: nc, promo: "qrbn"[pi] });
          else moves.push({ fr: r, fc: c, tr: r + dir, tc: nc });
        }
      }
    } else if (type === "n") {
      for (let i = 0; i < 8; i++) {
        const nr = r + KNIGHT_OFFSETS[i][0], nc = c + KNIGHT_OFFSETS[i][1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && enemy(board[nr][nc])) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
      }
    } else if (type === "k") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && enemy(board[nr][nc])) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
      }
    } else {
      const dirs = type === "r" ? STRAIGHT_DIRS : type === "b" ? DIAG_DIRS : STRAIGHT_DIRS.concat(DIAG_DIRS);
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (own(board[nr][nc])) break;
          if (enemy(board[nr][nc])) { moves.push({ fr: r, fc: c, tr: nr, tc: nc }); break; }
          nr += dr; nc += dc;
        }
      }
    }
  }
  return moves;
}

// ============================================================
// MOVE APPLICATION
// ============================================================

// Immutable version for React UI state updates
export function applyMove(board, move) {
  const nb = cloneBoard(board);
  const piece = nb[move.fr][move.fc];
  nb[move.tr][move.tc] = move.promo ? (isWhite(piece) ? move.promo.toUpperCase() : move.promo.toLowerCase()) : piece;
  nb[move.fr][move.fc] = "";
  if (move.ep) nb[move.fr][move.tc] = "";
  if (move.castle) {
    const row = move.fr;
    if (move.castle === "K") { nb[row][5] = nb[row][7]; nb[row][7] = ""; }
    if (move.castle === "Q") { nb[row][3] = nb[row][0]; nb[row][0] = ""; }
  }
  return nb;
}

// C3: Mutable make/unmake for search - avoids board cloning
function makeMove(board, move) {
  const piece = board[move.fr][move.fc];
  // Store undo info as flat triples: [row, col, piece, row, col, piece, ...]
  const undo = [move.fr, move.fc, piece, move.tr, move.tc, board[move.tr][move.tc]];
  board[move.tr][move.tc] = move.promo ? (isWhite(piece) ? move.promo.toUpperCase() : move.promo.toLowerCase()) : piece;
  board[move.fr][move.fc] = "";
  if (move.ep) {
    undo.push(move.fr, move.tc, board[move.fr][move.tc]);
    board[move.fr][move.tc] = "";
  }
  if (move.castle) {
    const row = move.fr;
    if (move.castle === "K") {
      undo.push(row, 5, board[row][5], row, 7, board[row][7]);
      board[row][5] = board[row][7];
      board[row][7] = "";
    } else {
      undo.push(row, 3, board[row][3], row, 0, board[row][0]);
      board[row][3] = board[row][0];
      board[row][0] = "";
    }
  }
  return undo;
}

function unmakeMove(board, undo) {
  for (let i = undo.length - 3; i >= 0; i -= 3) {
    board[undo[i]][undo[i + 1]] = undo[i + 2];
  }
}

// ============================================================
// LEGAL MOVES (C2: compute in-check once, use make/unmake)
// ============================================================

export function getLegalMoves(board, side, enPassant, castling) {
  const moves = generateMoves(board, side, enPassant, castling);
  const legal = [];
  const opp = side === "w" ? "b" : "w";
  const inCheck = isInCheck(board, side);

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.castle) {
      if (inCheck) continue;
      if (m.castle === "K" && (isSquareAttacked(board, m.fr, 5, opp) || isSquareAttacked(board, m.fr, 6, opp))) continue;
      if (m.castle === "Q" && (isSquareAttacked(board, m.fr, 3, opp) || isSquareAttacked(board, m.fr, 2, opp))) continue;
    }
    const undo = makeMove(board, m);
    const isLegal = !isInCheck(board, side);
    unmakeMove(board, undo);
    if (isLegal) legal.push(m);
  }

  return legal;
}

// ============================================================
// EVALUATION (C6: single pass for material + PST)
// ============================================================

export function evaluate(board, side) {
  let mgScore = 0, egScore = 0;
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
    const phW = PHASE_WEIGHTS[t];
    if (phW) phasePoints += phW;
    const pi = w ? r * 8 + c : (7 - r) * 8 + c;
    const pv = PST[t] ? PST[t][pi] : 0;
    if (w) { mgScore += val + pv; if (t === "b") wB++; }
    else { mgScore -= val + pv; if (t === "b") bB++; }

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

  // Copy material+PST from mg to eg (material/PST unphased for now)
  egScore = mgScore;

  // King PST (different for mg vs eg)
  const phase = Math.round((Math.min(phasePoints, MAX_PHASE) / MAX_PHASE) * 256);
  mgScore += PIECE_VALUES.k + PST.k[wKr * 8 + wKc];
  mgScore -= PIECE_VALUES.k + PST.k[(7 - bKr) * 8 + bKc];
  egScore += PIECE_VALUES.k + PST.k_end[wKr * 8 + wKc];
  egScore -= PIECE_VALUES.k + PST.k_end[(7 - bKr) * 8 + bKc];

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

  // Passed pawns (phase interpolated: mg gets 50%, eg gets 100%)
  const wPassedEg = evaluatePassedPawnBonus(board, "w", [wKr, wKc], [bKr, bKc], side);
  const bPassedEg = evaluatePassedPawnBonus(board, "b", [bKr, bKc], [wKr, wKc], side);
  egScore += wPassedEg;
  egScore -= bPassedEg;
  mgScore += Math.round(wPassedEg * 0.5);
  mgScore -= Math.round(bPassedEg * 0.5);

  // Blend
  const finalScore = Math.round((mgScore * phase + egScore * (256 - phase)) / 256);
  return side === "w" ? finalScore : -finalScore;
}

// ============================================================
// MOVE ORDERING (C4: in-place sort, no intermediate arrays)
// ============================================================

function moveScore(board, m, killer0, killer1) {
  let s = 0;
  const v = board[m.tr][m.tc];
  if (v) s += 10 * (PIECE_VALUES[v.toLowerCase()] || 0) - (PIECE_VALUES[board[m.fr][m.fc].toLowerCase()] || 0) + 100000;
  if (m.promo) s += PIECE_VALUES[m.promo] + 90000;
  if (m.castle) s += 50;
  if ((m.tr === 3 || m.tr === 4) && (m.tc === 3 || m.tc === 4)) s += 20;
  // Killer move bonus (above quiets, below captures)
  if (isSameMove(killer0, m)) s += 9000;
  else if (isSameMove(killer1, m)) s += 8000;
  return s;
}

function sortMoves(board, moves, ply) {
  // Hoist killer lookup out of the per-move scoring loop
  const hasKillers = _killers && ply !== undefined && ply < MAX_PLY;
  const k0 = hasKillers ? _killers[ply][0] : null;
  const k1 = hasKillers ? _killers[ply][1] : null;
  for (let i = 0; i < moves.length; i++) moves[i]._s = moveScore(board, moves[i], k0, k1);
  moves.sort((a, b) => b._s - a._s);
  return moves;
}

// ============================================================
// SEARCH (C3: make/unmake, C5: time abort, C7: capture gen in qsearch)
// ============================================================

let _searchAborted = false;
let _nodeCount = 0;
let _searchStart = 0;
let _searchTimeLimit = 0;

// Finite "infinity" score for search bounds. Real mate scores are around
// ±99999, so this stays safely above them while avoiding JS Infinity
// arithmetic (e.g. -Infinity + 1 === -Infinity, which breaks null-move
// pruning's zero-window construction at the root).
const MATE_SCORE = 1000000;
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

function checkTime() {
  if (++_nodeCount & 4095) return false;
  if (Date.now() - _searchStart > _searchTimeLimit) {
    _searchAborted = true;
    return true;
  }
  return false;
}

function updateCastling(nc, board, m) {
  const t = board[m.fr][m.fc].toLowerCase();
  if (t === "k") {
    const side = isWhite(board[m.fr][m.fc]) ? "w" : "b";
    nc[side + "K"] = false;
    nc[side + "Q"] = false;
  }
  if (t === "r") {
    if (m.fr === 7 && m.fc === 7) nc.wK = false;
    if (m.fr === 7 && m.fc === 0) nc.wQ = false;
    if (m.fr === 0 && m.fc === 7) nc.bK = false;
    if (m.fr === 0 && m.fc === 0) nc.bQ = false;
  }
  // Revoke on rook capture
  if (m.tr === 7 && m.tc === 7) nc.wK = false;
  if (m.tr === 7 && m.tc === 0) nc.wQ = false;
  if (m.tr === 0 && m.tc === 7) nc.bK = false;
  if (m.tr === 0 && m.tc === 0) nc.bQ = false;
}

function hasNonPawnMaterial(board, side) {
  const pieces = side === "w" ? /[NBRQ]/ : /[nbrq]/;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && pieces.test(board[r][c])) return true;
  }
  return false;
}

function quiescence(board, alpha, beta, side, qd) {
  if (_searchAborted) return 0;
  const sp = evaluate(board, side);
  if (qd <= 0) return sp;
  if (sp >= beta) return beta;
  if (sp > alpha) alpha = sp;
  const opp = side === "w" ? "b" : "w";
  const caps = generateCaptures(board, side);
  sortMoves(board, caps);
  for (let i = 0; i < caps.length; i++) {
    if (checkTime()) return 0;
    const m = caps[i];
    const undo = makeMove(board, m);
    if (isInCheck(board, side)) { unmakeMove(board, undo); continue; }
    const sc = -quiescence(board, -beta, -alpha, opp, qd - 1);
    unmakeMove(board, undo);
    if (_searchAborted) return 0;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function alphaBeta(board, depth, alpha, beta, side, ep, cast, extensions = 0, nullAllowed = true, ply = 0) {
  if (_searchAborted) return { score: 0 };
  if (checkTime()) return { score: 0 };

  // Check extension
  const inCheck = isInCheck(board, side);
  if (inCheck && extensions < 6) {
    depth += 1;
    extensions += 1;
  }

  if (depth <= 0) return { score: quiescence(board, alpha, beta, side, 4) };

  // Null move pruning
  if (nullAllowed && !inCheck && depth >= 3 && hasNonPawnMaterial(board, side)) {
    const R = depth > 6 ? 3 : 2;
    const opp = side === "w" ? "b" : "w";
    // Pass null for ep: after a null move, any pending en-passant target from
    // our side becomes stale (en-passant is only valid on the immediate next
    // ply). Our own ep parameter is preserved in this stack frame and applies
    // again when the search resumes on our real moves.
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
  return { score: bestScore, move: bestMove };
}

function searchBestMoves(board, side, ep, cast, tl = 3000) {
  _searchAborted = false;
  _nodeCount = 0;
  _searchStart = Date.now();
  _searchTimeLimit = tl;
  initKillers();

  let all = [];
  let cd = 0;
  for (let d = 1; d <= 8; d++) {
    if (Date.now() - _searchStart > tl * 0.55) break;
    const legal = getLegalMoves(board, side, ep, cast);
    if (legal.length === 0) break;
    const evs = [];
    sortMoves(board, legal, 0);
    _searchAborted = false;
    for (let i = 0; i < legal.length; i++) {
      const m = legal[i];
      if (Date.now() - _searchStart > tl) { _searchAborted = true; break; }
      const nep = (board[m.fr][m.fc].toLowerCase() === "p" && Math.abs(m.tr - m.fr) === 2) ? [(m.fr + m.tr) / 2, m.fc] : null;
      const nc = { ...cast };
      updateCastling(nc, board, m);
      const opp = side === "w" ? "b" : "w";
      const undo = makeMove(board, m);
      const child = alphaBeta(board, d - 1, -MATE_SCORE, MATE_SCORE, opp, nep, nc, 0, true, 1);
      unmakeMove(board, undo);
      if (_searchAborted) break;
      evs.push({ move: m, score: -child.score });
    }
    if (_searchAborted && d > 1) break;
    if (!_searchAborted || d === 1) {
      evs.sort((a, b) => b.score - a.score);
      all = evs;
      cd = d;
    }
  }
  return { results: all.slice(0, 5), depth: cd };
}

// ============================================================
// NOTATION
// ============================================================

export function toSAN(board, move) {
  const piece = board[move.fr][move.fc];
  const type = piece.toLowerCase();
  const target = coordToAlg(move.tr, move.tc);
  const capture = board[move.tr][move.tc] || move.ep ? "x" : "";

  // Check/checkmate suffix via make/unmake
  const opp = isWhite(piece) ? "b" : "w";
  const undo = makeMove(board, move);
  const inCheck = isInCheck(board, opp);
  let suffix = "";
  if (inCheck) {
    suffix = getLegalMoves(board, opp, null, null).length === 0 ? "#" : "+";
  }
  unmakeMove(board, undo);

  if (move.castle === "K") return "O-O" + suffix;
  if (move.castle === "Q") return "O-O-O" + suffix;
  if (type === "p") {
    const prefix = capture ? String.fromCharCode(97 + move.fc) : "";
    const promo = move.promo ? "=" + move.promo.toUpperCase() : "";
    return prefix + capture + target + promo + suffix;
  }

  // Disambiguation for pieces
  let disambig = "";
  const side = isWhite(piece) ? "w" : "b";
  const others = [];
  const allMoves = generateMoves(board, side, null, null);
  for (let i = 0; i < allMoves.length; i++) {
    const m = allMoves[i];
    if (m.fr === move.fr && m.fc === move.fc) continue;
    if (board[m.fr][m.fc].toLowerCase() !== type) continue;
    if (m.tr !== move.tr || m.tc !== move.tc) continue;
    const u = makeMove(board, m);
    const legal = !isInCheck(board, side);
    unmakeMove(board, u);
    if (legal) others.push(m);
  }
  if (others.length > 0) {
    if (others.every(m => m.fc !== move.fc)) disambig = String.fromCharCode(97 + move.fc);
    else if (others.every(m => m.fr !== move.fr)) disambig = String(8 - move.fr);
    else disambig = coordToAlg(move.fr, move.fc);
  }

  return type.toUpperCase() + disambig + capture + target + suffix;
}

// ============================================================
// ANALYSIS (main entry point)
// ============================================================

export function analyzePosition(board, side, ep, cast, hist) {
  const mk = hist.join(" ");
  const bk = OPENING_BOOK[mk];
  if (bk) {
    return bk.map(bm => {
      const [fr, fc] = algToCoord(bm.move.slice(0, 2));
      const [tr, tc] = algToCoord(bm.move.slice(2, 4));
      return {
        move: { fr, fc, tr, tc },
        alg: bm.move,
        san: toSAN(board, { fr, fc, tr, tc }),
        eval: bm.eval * (side === "w" ? 1 : -1),
        name: bm.name,
        source: "book",
        depth: "book",
        reasoning: `Opening theory: ${bm.name}. Played in ${Math.round(bm.freq * 100)}% of master games.`,
      };
    }).sort((a, b) => b.eval - a.eval).slice(0, 5);
  }

  const { results, depth } = searchBestMoves(board, side, ep, cast, 3000);
  const nm = { q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

  return results.map(res => {
    const m = res.move;
    const cap = board[m.tr][m.tc];
    let re = "";
    if (cap) re += `Captures ${nm[cap.toLowerCase()] || "piece"}. `;
    if (m.castle) re += `Castles ${m.castle === "K" ? "kingside" : "queenside"} for king safety. `;
    const undo = makeMove(board, m);
    const opp = side === "w" ? "b" : "w";
    if (isInCheck(board, opp)) {
      const ol = getLegalMoves(board, opp, null, cast);
      re += ol.length === 0 ? "CHECKMATE. " : "Delivers check. ";
    }
    if (cap && !isSquareAttacked(board, m.tr, m.tc, opp)) re += "Piece is undefended. ";
    unmakeMove(board, undo);
    if ((m.tr === 3 || m.tr === 4) && (m.tc === 3 || m.tc === 4)) re += "Controls center. ";
    if (!re) re = "Improves piece activity and position.";
    return {
      move: m,
      alg: moveToAlg(m.fr, m.fc, m.tr, m.tc),
      san: toSAN(board, m),
      eval: res.score / 100,
      source: "engine",
      depth: `d${depth}`,
      reasoning: re.trim(),
    };
  });
}
