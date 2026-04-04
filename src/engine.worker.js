import { analyzePosition } from "./engine.js";

self.onmessage = function (e) {
  const { id, board, side, enPassant, castling, moveHistory } = e.data;
  const analysis = analyzePosition(board, side, enPassant, castling, moveHistory);
  self.postMessage({ id, analysis });
};
