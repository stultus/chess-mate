# Third-Party Notices

Chess Mate's original code is licensed under the MIT License (see `LICENSE`).
This repository also bundles the following third-party assets, which remain
under their original licenses.

## Chess Piece SVGs

The chess piece graphics embedded in `src/ChessAdvisor.jsx` (the SVG path
data inside `SVG_PIECES`) are the "Cburnett" chess set by Colin M.L. Burnett,
from Wikimedia Commons.

- **Source:** https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces
- **License:** triple-licensed under GFDL 1.2+, CC-BY-SA 3.0, and GPL v2+
  (you may pick any one)
- **Attribution:** Colin M.L. Burnett (Cburnett)

## Piece-Square Tables

The piece-square table values in `src/engine.js` (the `PST` constant) are
adapted from Tomasz Michniewski's "Simplified Evaluation Function" published
on the Chess Programming Wiki.

- **Source:** https://www.chessprogramming.org/Simplified_Evaluation_Function
- **Author:** Tomasz Michniewski
- **License:** CC-BY-SA 3.0 (site-wide license of chessprogramming.org)

## King Safety Table

The `SAFETY_TABLE` values in `src/engine.js` are adapted from CPW-Engine's
king safety scoring.

- **Source:** https://www.chessprogramming.org/CPW-Engine_eval
- **License:** CC-BY-SA 3.0 (site-wide license of chessprogramming.org)

---

All other code, including the search implementation (alpha-beta, quiescence,
check extensions, null move pruning, LMR, killer moves), the evaluation
integration (king safety, passed pawn evaluation, phase interpolation),
the React UI, and the Web Worker integration, is original and covered by
the MIT License.
