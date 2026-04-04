# Chess Mate

A chess playing companion with built-in move analysis. Play against a friend (or yourself) while getting real-time move suggestions powered by a client-side chess engine.

## Features

- Interactive chessboard with chess.com-style visuals
- Built-in chess engine with alpha-beta pruning and quiescence search
- Opening book with common lines (Sicilian, Ruy Lopez, Queen's Gambit, etc.)
- Move suggestions ranked by evaluation
- SVG chess pieces that render crisply at any size
- Fully client-side - no server required

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
