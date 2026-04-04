# Chess Mate

A chess playing companion with built-in move analysis. Play against a friend (or yourself) while getting real-time move suggestions powered by a client-side chess engine.

Live at [stultus.in/chess-mate](https://stultus.in/chess-mate/).

## Features

- Interactive chessboard with chess.com-style visuals
- Move suggestions ranked by evaluation, with board-hover preview
- Pawn promotion picker (queen, rook, bishop, knight)
- Copy PGN of finished games for external analysis
- SVG chess pieces that render crisply at any size
- Fully client-side — no server, no account, analysis runs in a Web Worker

## Engine

**Search**
- Alpha-beta with quiescence search, iterative deepening (up to depth 8)
- Check extensions, null move pruning, late move reductions (LMR)
- Killer-move ordering, MVV-LVA capture ordering, make/unmake move pattern

**Evaluation**
- Material + piece-square tables with middlegame/endgame phase interpolation
- King safety: pawn shield, open files near king, multi-attacker danger table
- Passed pawn scoring: exponential rank bonus, king proximity, rule of the square,
  connected/protected multipliers
- Opening book with common lines (Sicilian, Ruy Lopez, Queen's Gambit, etc.)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173/chess-mate/ in your browser.

## Build

```bash
npm run build
```

The production build is output to `dist/`.

## Tests

```bash
npm test
```

Runs the vitest suite covering evaluation terms, search behavior, and
regression tests for known bugs.

## How to Play

1. Choose your color (white or black)
2. On your turn, click a piece then click a destination, or click a suggested move
3. For the opponent's moves, click their piece on the board then the destination square
4. Hover over suggestions to preview them on the board

## Tech Stack

- React 19
- Vite
- Custom chess engine (no external chess libraries)

## Deployment

Deployed automatically to GitHub Pages via GitHub Actions on push to `main`.

## License

MIT — see [LICENSE](LICENSE).

Third-party assets (chess piece SVGs by Cburnett, piece-square tables from
Tomasz Michniewski, king-safety table from CPW-Engine) are licensed under
CC-BY-SA 3.0. See [NOTICE.md](NOTICE.md) for attributions.
