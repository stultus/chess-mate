import { useState, useEffect, useRef, useMemo } from "react";
import {
  INITIAL_BOARD,
  cloneBoard,
  isWhite,
  pieceColor,
  coordToAlg,
  moveToAlg,
  findKing,
  isInCheck,
  applyMove,
  getLegalMoves,
  toSAN,
} from "./engine.js";

// ============================================================
// SVG CHESS PIECES
// ============================================================

const SVG_PIECES = {
  K: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke="#222" strokeLinecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/></g></svg>,
  Q: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14L7 14l2 12z" fill="#fff" strokeLinecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#fff" strokeLinecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g></svg>,
  R: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M15 17v7h15v-7" strokeLinecap="butt" strokeLinejoin="miter"/><path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter"/><path d="M14 29.5L11 36h23l-3-6.5H14z" strokeLinecap="butt"/><path d="M11 14h23" fill="none" strokeLinejoin="miter"/></g></svg>,
  B: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#fff" stroke="#222" strokeLinecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#222" strokeLinejoin="miter"/></g></svg>,
  N: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#222"/></g></svg>,
  P: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  k: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.5 11.63V6" stroke="#222"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#222" strokeLinecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#222"/><path d="M20 8h5" stroke="#222"/><path d="M11.5 30c5.5-3 15.5-3 21 0" fill="none" stroke="#fff"/><path d="M11.5 33.5c5.5-3 15.5-3 21 0" fill="none" stroke="#fff"/><path d="M11.5 37c5.5-3 15.5-3 21 0" fill="none" stroke="#fff"/></g></svg>,
  q: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="#222" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke="#fff"/><path d="M11 29a35 35 1 0 1 23 0" fill="none" stroke="#fff"/><path d="M12.5 31.5h20" fill="none" stroke="#fff"/><path d="M11.5 34.5a35 35 1 0 0 22 0" fill="none" stroke="#fff"/></g></svg>,
  r: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="#222" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 39h27v-3H9v3z" strokeLinecap="butt"/><path d="M12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" strokeLinecap="butt"/><path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" strokeLinecap="butt"/><path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter"/></g></svg>,
  b: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#222" strokeLinecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" stroke="#fff" strokeLinejoin="miter"/></g></svg>,
  n: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><g fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#222"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#222"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff" stroke="#fff"/><path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" stroke="#fff"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#fff" stroke="none"/></g></svg>,
  p: (s) => <svg viewBox="0 0 45 45" width={s} height={s}><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#222" stroke="#222" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

// I2: Pre-render pieces at module level (board always uses size 48)
const PIECE_SIZE = 48;
const RENDERED_PIECES = Object.fromEntries(
  Object.entries(SVG_PIECES).map(([k, fn]) => [k, fn(PIECE_SIZE)])
);

// ============================================================
// BOARD COLORS
// ============================================================

const LIGHT_SQ = "#ebecd0";
const DARK_SQ = "#779556";
const LIGHT_HIGHLIGHT = "#f6f669";
const DARK_HIGHLIGHT = "#bbcc44";
const LIGHT_SELECTED = "#f6f669";
const DARK_SELECTED = "#bbcc44";
const LIGHT_SUGGESTION = "#8bbcf0";
const DARK_SUGGESTION = "#5a9bd5";

// I1: Extract static styles to module-level constants
const SQUARE_BASE = {
  width: "12.5%",
  aspectRatio: "1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  transition: "background-color 0.1s",
};
const SQUARE_ACTIVE = { ...SQUARE_BASE, cursor: "pointer" };
const SQUARE_INACTIVE = { ...SQUARE_BASE, cursor: "default" };

const COORD_LIGHT = { position: "absolute", fontSize: 11, fontWeight: 700, color: "#ebecd0", fontFamily: "'Segoe UI',system-ui,sans-serif", lineHeight: 1, userSelect: "none" };
const COORD_DARK = { ...COORD_LIGHT, color: "#779556" };

const LEGAL_DOT = { width: "30%", height: "30%", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.15)" };
const LEGAL_RING = { position: "absolute", inset: 0, borderRadius: "50%", border: "5px solid rgba(0,0,0,0.15)" };
const PIECE_WRAPPER = { display: "flex", alignItems: "center", justifyContent: "center", width: "85%", height: "85%", filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.25))" };
const CHECK_SHADOW = "inset 0 0 16px 6px rgba(220,30,30,0.7)";

// ============================================================
// REACT COMPONENT
// ============================================================

export default function ChessAdvisor() {
  const [userColor, setUserColor] = useState(null);
  const [board, setBoard] = useState(INITIAL_BOARD.map(r => [...r]));
  const [turn, setTurn] = useState("w");
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveList, setMoveList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [highlightedSugg, setHighlightedSugg] = useState(null);
  const [castling, setCastling] = useState({ wK: true, wQ: true, bK: true, bQ: true });
  const [enPassant, setEnPassant] = useState(null);
  const [gameStatus, setGameStatus] = useState("active");
  const [lastMove, setLastMove] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [history, setHistory] = useState([]);
  const moveListRef = useRef(null);
  const workerRef = useRef(null);
  const analysisIdRef = useRef(0);
  const historyRef = useRef([]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // I3: Web Worker for engine analysis
  useEffect(() => {
    const worker = new Worker(new URL("./engine.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      if (e.data.id === analysisIdRef.current) {
        setAnalysis(e.data.analysis);
        setAnalyzing(false);
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (moveListRef.current) moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
  }, [moveList]);

  // Analysis via worker (non-blocking)
  useEffect(() => {
    if (!userColor || gameStatus !== "active") return;
    if (turn === userColor) {
      setAnalyzing(true);
      const id = ++analysisIdRef.current;
      workerRef.current?.postMessage({ id, board, side: turn, enPassant, castling, moveHistory });
    } else {
      setAnalysis([]);
    }
  }, [turn, board, userColor, gameStatus, enPassant, castling, moveHistory]);

  const isFlipped = userColor === "b";

  // I4: Cache legal moves per position
  const allLegalMoves = useMemo(
    () => (gameStatus === "active" ? getLegalMoves(board, turn, enPassant, castling) : []),
    [board, turn, enPassant, castling, gameStatus]
  );

  function checkGameEnd(nb, nt, ep, ca) {
    const l = getLegalMoves(nb, nt, ep, ca);
    if (l.length === 0) {
      if (isInCheck(nb, nt)) setGameStatus(nt === "w" ? "black_wins" : "white_wins");
      else setGameStatus("stalemate");
    }
  }

  function executeMove(fr, fc, tr, tc, promo) {
    const move = { fr, fc, tr, tc };
    const piece = board[fr][fc];
    const type = piece.toLowerCase();
    if (type === "k" && Math.abs(tc - fc) === 2) move.castle = tc > fc ? "K" : "Q";
    if (type === "p" && enPassant && tr === enPassant[0] && tc === enPassant[1]) move.ep = true;
    if (type === "p" && (tr === 0 || tr === 7)) move.promo = promo || "q";
    const newBoard = applyMove(board, move);
    const san = toSAN(board, move);
    const alg = moveToAlg(fr, fc, tr, tc);
    const nh = [...moveHistory, alg];
    const nc = { ...castling };
    if (type === "k") { if (isWhite(piece)) { nc.wK = false; nc.wQ = false; } else { nc.bK = false; nc.bQ = false; } }
    if (type === "r") { if (fr === 7 && fc === 7) nc.wK = false; if (fr === 7 && fc === 0) nc.wQ = false; if (fr === 0 && fc === 7) nc.bK = false; if (fr === 0 && fc === 0) nc.bQ = false; }
    if (tr === 7 && tc === 7) nc.wK = false; if (tr === 7 && tc === 0) nc.wQ = false; if (tr === 0 && tc === 7) nc.bK = false; if (tr === 0 && tc === 0) nc.bQ = false;
    const ne = (type === "p" && Math.abs(tr - fr) === 2) ? [(fr + tr) / 2, fc] : null;
    const nt = turn === "w" ? "b" : "w";
    // Snapshot current state for undo
    setHistory(prev => [...prev, { board, turn, moveHistory, castling, enPassant, gameStatus, lastMove }]);
    setBoard(newBoard); setTurn(nt); setMoveHistory(nh);
    setMoveList(prev => [...prev, { san, turn, moveNum: Math.floor(prev.length / 2) + 1 }]);
    setCastling(nc); setEnPassant(ne); setSelected(null); setLegalTargets([]);
    setHighlightedSugg(null); setLastMove({ fr, fc, tr, tc });
    checkGameEnd(newBoard, nt, ne, nc);
  }

  function undoMove() {
    const stack = historyRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    setHistory(h => h.slice(0, -1));
    setBoard(prev.board);
    setTurn(prev.turn);
    setMoveHistory(prev.moveHistory);
    setMoveList(ml => ml.slice(0, -1));
    setCastling(prev.castling);
    setEnPassant(prev.enPassant);
    setGameStatus(prev.gameStatus);
    setLastMove(prev.lastMove);
    setSelected(null);
    setLegalTargets([]);
    setHighlightedSugg(null);
    setPendingPromo(null);
  }

  function handleSquareClick(r, c) {
    if (pendingPromo) { setPendingPromo(null); return; }
    if (gameStatus !== "active" || !userColor) return;
    if (selected) {
      if (legalTargets.some(t => t.tr === r && t.tc === c)) {
        const piece = board[selected[0]][selected[1]];
        if (piece.toLowerCase() === "p" && (r === 0 || r === 7)) {
          setPendingPromo({ fr: selected[0], fc: selected[1], tr: r, tc: c });
          return;
        }
        executeMove(selected[0], selected[1], r, c);
        return;
      }
    }
    const piece = board[r][c];
    if (piece && pieceColor(piece) === turn) {
      setSelected([r, c]);
      setLegalTargets(allLegalMoves.filter(m => m.fr === r && m.fc === c));
    } else {
      setSelected(null); setLegalTargets([]);
    }
  }

  function resetGame() {
    setBoard(INITIAL_BOARD.map(r => [...r])); setTurn("w"); setMoveHistory([]); setMoveList([]);
    setSelected(null); setLegalTargets([]); setAnalysis([]); setCastling({ wK: true, wQ: true, bK: true, bQ: true });
    setEnPassant(null); setGameStatus("active"); setHighlightedSugg(null); setUserColor(null); setLastMove(null);
    setHistory([]); setPendingPromo(null);
  }

  // Keyboard shortcut: Cmd/Ctrl+Z to undo
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        if (historyRef.current.length > 0) {
          e.preventDefault();
          undoMove();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Compute check state once for the board
  const kp = useMemo(() => findKing(board, turn), [board, turn]);
  const inChk = useMemo(() => isInCheck(board, turn), [board, turn]);

  function renderBoard() {
    const rows = [];
    for (let ri = 0; ri < 8; ri++) {
      const r = isFlipped ? 7 - ri : ri;
      const cells = [];
      for (let ci = 0; ci < 8; ci++) {
        const c = isFlipped ? 7 - ci : ci;
        const isDark = (r + c) % 2 === 1;
        const piece = board[r][c];
        const isSel = selected && selected[0] === r && selected[1] === c;
        const isLT = legalTargets.some(t => t.tr === r && t.tc === c);
        const isSugg = highlightedSugg && ((highlightedSugg.move.fr === r && highlightedSugg.move.fc === c) || (highlightedSugg.move.tr === r && highlightedSugg.move.tc === c));
        const isLM = lastMove && ((lastMove.fr === r && lastMove.fc === c) || (lastMove.tr === r && lastMove.tc === c));
        const isKChk = inChk && kp && kp[0] === r && kp[1] === c;

        let bg = isDark ? DARK_SQ : LIGHT_SQ;
        if (isLM) bg = isDark ? DARK_HIGHLIGHT : LIGHT_HIGHLIGHT;
        if (isSel) bg = isDark ? DARK_SELECTED : LIGHT_SELECTED;
        if (isSugg) bg = isDark ? DARK_SUGGESTION : LIGHT_SUGGESTION;

        const coordStyle = isDark ? COORD_LIGHT : COORD_DARK;

        cells.push(
          <div key={`${r}-${c}`} onClick={() => handleSquareClick(r, c)} style={{
            ...(gameStatus === "active" ? SQUARE_ACTIVE : SQUARE_INACTIVE),
            backgroundColor: bg,
            boxShadow: isKChk ? CHECK_SHADOW : "none",
          }}>
            {ci === 0 && <span style={{ ...coordStyle, top: 2, left: 3 }}>{8 - r}</span>}
            {ri === 7 && <span style={{ ...coordStyle, bottom: 1, right: 3 }}>{String.fromCharCode(97 + c)}</span>}
            {isLT && !piece && <div style={LEGAL_DOT} />}
            {isLT && piece && <div style={LEGAL_RING} />}
            {piece && <div style={PIECE_WRAPPER}>{RENDERED_PIECES[piece]}</div>}
          </div>
        );
      }
      rows.push(<div key={ri} style={{ display: "flex", width: "100%" }}>{cells}</div>);
    }
    return rows;
  }

  // ===== ABOUT PAGE =====
  if (showAbout) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#302e2b", color: "#e8e6e1", padding: 20 }}>
        <div style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48 }}>{SVG_PIECES.k(48)}</div>
            <div style={{ width: 48, height: 48 }}>{SVG_PIECES.K(48)}</div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, textAlign: "center", marginBottom: 24 }}>Chess Mate</h1>
          <div style={{ background: "#262421", border: "1px solid #3c3a37", borderRadius: 6, padding: 24, lineHeight: 1.8, fontSize: 14, color: "#bbb" }}>
            <p style={{ marginBottom: 16 }}>A chess companion that analyzes positions and suggests moves in real time. No servers, no accounts — everything runs in your browser.</p>
            <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace", marginBottom: 16 }}>
              <div style={{ marginBottom: 4, color: "#666", letterSpacing: 1, textTransform: "uppercase", fontSize: 11 }}>Search</div>
              <div>Alpha-beta + quiescence, iterative deepening</div>
              <div>Check extensions, null move pruning, LMR</div>
              <div>Killer-move ordering, MVV-LVA</div>
            </div>
            <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace", marginBottom: 16 }}>
              <div style={{ marginBottom: 4, color: "#666", letterSpacing: 1, textTransform: "uppercase", fontSize: 11 }}>Evaluation</div>
              <div>King safety: pawn shield, open files, attacker weights</div>
              <div>Passed pawns: king proximity, rule of the square</div>
              <div>Middlegame / endgame phase interpolation</div>
              <div>Opening book with common lines</div>
            </div>
            <div style={{ borderTop: "1px solid #3c3a37", paddingTop: 16, fontSize: 13, color: "#999" }}>
              Built by <a href="https://stultus.in" target="_blank" rel="noopener noreferrer" style={{ color: "#81b64c", textDecoration: "none" }}>Hrishi</a>
              <span style={{ color: "#555", margin: "0 8px" }}>/</span>
              <a href="https://github.com/stultus/chess-mate" target="_blank" rel="noopener noreferrer" style={{ color: "#5a9bd5", textDecoration: "none", fontSize: 12, fontFamily: "monospace" }}>source</a>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={() => setShowAbout(false)} style={{ background: "#3c3a37", border: "1px solid #555", color: "#bbb", padding: "8px 24px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== COLOR SELECT =====
  if (!userColor) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#302e2b", color: "#e8e6e1", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48 }}>{SVG_PIECES.k(48)}</div>
            <div style={{ width: 48, height: 48 }}>{SVG_PIECES.K(48)}</div>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>Chess Mate</h1>
          <p style={{ fontSize: 13, color: "#9b9b9b", fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>PREDICTIVE ANALYSIS ENGINE v3</p>
          <p style={{ fontSize: 11, color: "#6b6b6b", fontFamily: "monospace", marginBottom: 40 }}>Tactical Search / Endgame Evaluation / Opening Book</p>
          <p style={{ fontSize: 17, color: "#bbb", marginBottom: 28 }}>Choose your color</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button onClick={() => setUserColor("w")} style={{ width: 150, padding: "24px 16px", background: "#ebecd0", color: "#302e2b", border: "3px solid #779556", borderRadius: 8, cursor: "pointer", fontFamily: "'Segoe UI',system-ui,sans-serif", transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ marginBottom: 8 }}>{SVG_PIECES.K(52)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>WHITE</div>
            </button>
            <button onClick={() => setUserColor("b")} style={{ width: 150, padding: "24px 16px", background: "#302e2b", color: "#e8e6e1", border: "3px solid #555", borderRadius: 8, cursor: "pointer", fontFamily: "'Segoe UI',system-ui,sans-serif", transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              <div style={{ marginBottom: 8 }}>{SVG_PIECES.k(52)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>BLACK</div>
            </button>
          </div>
          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 16, fontSize: 12 }}>
            <span style={{ color: "#666" }}>by <a href="https://stultus.in" target="_blank" rel="noopener noreferrer" style={{ color: "#81b64c", textDecoration: "none" }}>Hrishi</a></span>
            <span style={{ color: "#444" }}>|</span>
            <button onClick={() => setShowAbout(true)} style={{ background: "none", border: "none", color: "#5a9bd5", cursor: "pointer", fontSize: 12, fontFamily: "'Segoe UI',system-ui,sans-serif", padding: 0 }}>About</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN GAME =====
  const isUserTurn = turn === userColor;
  const statusText = gameStatus === "white_wins" ? "Checkmate. White wins." : gameStatus === "black_wins" ? "Checkmate. Black wins." : gameStatus === "stalemate" ? "Stalemate. Draw." : isUserTurn ? "Your turn. Click a piece or pick a suggestion." : "Opponent's turn. Click their piece, then destination.";

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#302e2b", color: "#e8e6e1", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #444", background: "#262421" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28 }}>{userColor === "w" ? SVG_PIECES.K(28) : SVG_PIECES.k(28)}</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: .5 }}>Chess Mate</span>
          <span style={{ fontSize: 11, color: "#7b7b7b", fontFamily: "monospace" }}>v3</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={undoMove} disabled={history.length === 0} title="Undo last move (⌘Z / Ctrl+Z)" style={{ background: history.length === 0 ? "#2a2826" : "#3c3a37", border: "1px solid #555", color: history.length === 0 ? "#555" : "#bbb", padding: "5px 14px", borderRadius: 4, cursor: history.length === 0 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>↶ Undo</button>
          <button onClick={resetGame} style={{ background: "#3c3a37", border: "1px solid #555", color: "#bbb", padding: "5px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>New Game</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", padding: "12px", maxWidth: 1100, margin: "0 auto", width: "100%", gap: 12 }}>
        {/* Board */}
        <div style={{ flex: "1 1 400px", maxWidth: 520, minWidth: 280 }}>
          {/* Status bar */}
          <div style={{ padding: "7px 12px", marginBottom: 8, background: gameStatus !== "active" ? "rgba(220,50,50,0.15)" : isUserTurn ? "rgba(130,180,60,0.12)" : "rgba(90,155,213,0.1)", borderRadius: 4, borderLeft: `3px solid ${gameStatus !== "active" ? "#e04040" : isUserTurn ? "#81b64c" : "#5a9bd5"}` }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#ccc" }}>{statusText}</span>
          </div>

          {/* Board */}
          <div style={{ border: "3px solid #1a1916", borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.6)", position: "relative" }}>
            {renderBoard()}
            {pendingPromo && (() => {
              const promoColor = pieceColor(board[pendingPromo.fr][pendingPromo.fc]);
              const pieces = promoColor === "w" ? ["Q", "R", "B", "N"] : ["q", "r", "b", "n"];
              const col = isFlipped ? 7 - pendingPromo.tc : pendingPromo.tc;
              const fromTop = promoColor === "w" ? !isFlipped : isFlipped;
              return (
                <>
                  <div onClick={() => setPendingPromo(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10 }} />
                  <div style={{ position: "absolute", left: `${col * 12.5}%`, [fromTop ? "top" : "bottom"]: 0, width: "12.5%", zIndex: 11, borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.8)" }}>
                    {pieces.map((p, i) => (
                      <div key={p} onClick={() => { executeMove(pendingPromo.fr, pendingPromo.fc, pendingPromo.tr, pendingPromo.tc, p.toLowerCase()); setPendingPromo(null); }}
                        style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", background: i % 2 === 0 ? "#ebecd0" : "#779556", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f6f669"}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#ebecd0" : "#779556"}>
                        <div style={PIECE_WRAPPER}>{SVG_PIECES[p](PIECE_SIZE)}</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#777" }}>
            <span>{turn === "w" ? "White" : "Black"} to move{!isUserTurn && gameStatus === "active" && <span style={{ color: "#5a9bd5", marginLeft: 6 }}>- click their piece on board</span>}</span>
            <span>Move {Math.floor(moveList.length / 2) + 1}</span>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: "1 1 280px", maxWidth: 440, minWidth: 260, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Analysis */}
          <div style={{ background: "#262421", border: "1px solid #3c3a37", borderRadius: 4, padding: 14, flex: "1 1 auto" }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: 1.5, color: "#888", marginBottom: 10, textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
              <span>{analyzing ? "Analyzing..." : isUserTurn && analysis.length > 0 ? "Suggested Moves" : "Analysis"}</span>
              {analysis.length > 0 && analysis[0].depth && <span style={{ color: "#666" }}>{analysis[0].source === "book" ? "BOOK" : analysis[0].depth}</span>}
            </div>

            {!isUserTurn && gameStatus === "active" && <p style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>Waiting for opponent's move...</p>}

            {isUserTurn && analysis.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {analysis.map((a, i) => {
                  const isTop = i === 0;
                  const evStr = a.eval >= 0 ? `+${a.eval.toFixed(1)}` : a.eval.toFixed(1);
                  const evCol = a.eval > 0.3 ? "#81b64c" : a.eval < -0.3 ? "#e06060" : "#ccc";
                  return (
                    <div key={i}
                      onMouseEnter={() => setHighlightedSugg(a)} onMouseLeave={() => setHighlightedSugg(null)}
                      onClick={() => { if (turn === userColor) executeMove(a.move.fr, a.move.fc, a.move.tr, a.move.tc, a.move.promo); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", background: isTop ? "rgba(129,182,76,0.08)" : "transparent", border: isTop ? "1px solid rgba(129,182,76,0.2)" : "1px solid transparent", borderRadius: 4, cursor: "pointer", transition: "background 0.1s" }}
                      onMouseOver={e => { if (!isTop) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseOut={e => { if (!isTop) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ minWidth: 22, fontFamily: "monospace", fontSize: 11, color: "#555", paddingTop: 3 }}>#{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#e8e6e1" }}>{a.san}</span>
                          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: evCol }}>{evStr}</span>
                          {a.source === "book" && <span style={{ fontSize: 9, fontFamily: "monospace", background: "rgba(139,92,246,0.2)", color: "#a78bfa", padding: "1px 6px", borderRadius: 3, letterSpacing: 1 }}>BOOK</span>}
                          {isTop && <span style={{ fontSize: 9, fontFamily: "monospace", background: "rgba(129,182,76,0.15)", color: "#81b64c", padding: "1px 6px", borderRadius: 3, letterSpacing: 1 }}>BEST</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>{a.reasoning}{a.name && <span style={{ color: "#a78bfa" }}> [{a.name}]</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isUserTurn && analysis.length === 0 && !analyzing && gameStatus === "active" && <p style={{ fontSize: 13, color: "#777" }}>No moves available.</p>}

            {gameStatus !== "active" && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ display: "inline-block", width: 36, height: 36, marginBottom: 8 }}>{gameStatus === "stalemate" ? <span style={{ fontSize: 28 }}>{"="}</span> : gameStatus === "white_wins" ? SVG_PIECES.K(36) : SVG_PIECES.k(36)}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ccc" }}>{statusText}</div>
              </div>
            )}
          </div>

          {/* Move History */}
          <div style={{ background: "#262421", border: "1px solid #3c3a37", borderRadius: 4, padding: 14, maxHeight: 170, overflow: "hidden" }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: 1.5, color: "#888", marginBottom: 8, textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Move History</span>
              {moveList.length > 0 && gameStatus !== "active" && (
                <button onClick={() => {
                  const pgn = moveList.reduce((s, m) => s + (m.turn === "w" ? `${m.moveNum}. ` : "") + m.san + " ", "").trim();
                  const result = gameStatus === "white_wins" ? "1-0" : gameStatus === "black_wins" ? "0-1" : "1/2-1/2";
                  navigator.clipboard.writeText(pgn + " " + result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
                }} style={{ background: copied ? "rgba(129,182,76,0.15)" : "#3c3a37", border: "1px solid #555", color: copied ? "#81b64c" : "#bbb", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontSize: 10, fontFamily: "monospace", letterSpacing: 0.5, transition: "all 0.2s" }}>
                  {copied ? "Copied!" : "Copy PGN"}
                </button>
              )}
            </div>
            <div ref={moveListRef} style={{ maxHeight: 120, overflowY: "auto", fontFamily: "monospace", fontSize: 13 }}>
              {moveList.length === 0 ? <span style={{ color: "#555" }}>No moves yet.</span> : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 0" }}>{moveList.map((m, i) => (
                  <span key={i}>{m.turn === "w" && <span style={{ color: "#666", marginRight: 4 }}>{m.moveNum}.</span>}<span style={{ color: m.turn === "w" ? "#e8e6e1" : "#aaa", marginRight: 8 }}>{m.san}</span></span>
                ))}</div>
              )}
            </div>
          </div>

          {/* Help */}
          <div style={{ background: "#1e1c1a", border: "1px solid #333", borderRadius: 4, padding: 12, fontSize: 11, fontFamily: "monospace", color: "#666", lineHeight: 1.7 }}>
            <div style={{ color: "#888", marginBottom: 4, letterSpacing: 1 }}>HOW TO PLAY</div>
            <span style={{ color: "#81b64c" }}>Your turn:</span> click piece or click suggestion
            <br /><span style={{ color: "#5a9bd5" }}>Opponent:</span> click their piece, then destination
            <br /><span style={{ color: "#a78bfa" }}>Hover</span> suggestions to preview on board
          </div>
        </div>
      </div>
    </div>
  );
}
