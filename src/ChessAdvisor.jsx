import { useState, useEffect, useRef } from "react";

// ============================================================
// SVG CHESS PIECES - crisp, high-contrast, works on any background
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

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

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

// ============================================================
// BOARD LOGIC (unchanged engine)
// ============================================================
const INITIAL_BOARD = [["r","n","b","q","k","b","n","r"],["p","p","p","p","p","p","p","p"],["","","","","","","",""],["","","","","","","",""],["","","","","","","",""],["","","","","","","",""],["P","P","P","P","P","P","P","P"],["R","N","B","Q","K","B","N","R"]];

function cloneBoard(b){return b.map(r=>[...r])}
function isWhite(p){return p&&p===p.toUpperCase()}
function isBlack(p){return p&&p===p.toLowerCase()}
function pieceColor(p){return!p?null:isWhite(p)?"w":"b"}
function coordToAlg(r,c){return String.fromCharCode(97+c)+(8-r)}
function algToCoord(a){return[8-parseInt(a[1]),a.charCodeAt(0)-97]}
function moveToAlg(fr,fc,tr,tc){return coordToAlg(fr,fc)+coordToAlg(tr,tc)}

function generateMoves(board,side,enPassant,castling){
  const moves=[];const isOwn=side==="w"?isWhite:isBlack;const isEnemy=side==="w"?isBlack:isWhite;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!isOwn(p))continue;const type=p.toLowerCase();
    if(type==="p"){const dir=side==="w"?-1:1;const startRow=side==="w"?6:1;const promoRow=side==="w"?0:7;
      if(board[r+dir]?.[c]===""){if(r+dir===promoRow){["q","r","b","n"].forEach(pp=>moves.push({fr:r,fc:c,tr:r+dir,tc:c,promo:pp}))}else{moves.push({fr:r,fc:c,tr:r+dir,tc:c});if(r===startRow&&board[r+2*dir]?.[c]==="")moves.push({fr:r,fc:c,tr:r+2*dir,tc:c})}}
      for(const dc of[-1,1]){const nc=c+dc;if(nc<0||nc>7)continue;if(board[r+dir]?.[nc]&&isEnemy(board[r+dir][nc])){if(r+dir===promoRow)["q","r","b","n"].forEach(pp=>moves.push({fr:r,fc:c,tr:r+dir,tc:nc,promo:pp}));else moves.push({fr:r,fc:c,tr:r+dir,tc:nc})}if(enPassant&&enPassant[0]===r+dir&&enPassant[1]===nc)moves.push({fr:r,fc:c,tr:r+dir,tc:nc,ep:true})}
    }else if(type==="n"){for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const nr=r+dr,nc=c+dc;if(nr<0||nr>7||nc<0||nc>7)continue;if(!isOwn(board[nr][nc]))moves.push({fr:r,fc:c,tr:nr,tc:nc})}
    }else if(type==="k"){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(dr===0&&dc===0)continue;const nr=r+dr,nc=c+dc;if(nr<0||nr>7||nc<0||nc>7)continue;if(!isOwn(board[nr][nc]))moves.push({fr:r,fc:c,tr:nr,tc:nc})}
      if(castling){const row=side==="w"?7:0;if(r===row&&c===4){if(castling[side+"K"]&&board[row][5]===""&&board[row][6]===""&&board[row][7]?.toLowerCase()==="r"&&isOwn(board[row][7]))moves.push({fr:r,fc:c,tr:row,tc:6,castle:"K"});if(castling[side+"Q"]&&board[row][3]===""&&board[row][2]===""&&board[row][1]===""&&board[row][0]?.toLowerCase()==="r"&&isOwn(board[row][0]))moves.push({fr:r,fc:c,tr:row,tc:2,castle:"Q"})}}
    }else{const dirs=type==="r"?[[0,1],[0,-1],[1,0],[-1,0]]:type==="b"?[[1,1],[1,-1],[-1,1],[-1,-1]]:[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];for(const[dr,dc]of dirs){let nr=r+dr,nc=c+dc;while(nr>=0&&nr<=7&&nc>=0&&nc<=7){if(isOwn(board[nr][nc]))break;moves.push({fr:r,fc:c,tr:nr,tc:nc});if(isEnemy(board[nr][nc]))break;nr+=dr;nc+=dc}}}}
  return moves;
}

function findKing(board,side){const k=side==="w"?"K":"k";for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===k)return[r,c];return null}
function isSquareAttacked(board,r,c,bySide){return generateMoves(board,bySide,null,null).some(m=>m.tr===r&&m.tc===c)}
function isInCheck(board,side){const kp=findKing(board,side);if(!kp)return false;return isSquareAttacked(board,kp[0],kp[1],side==="w"?"b":"w")}
function applyMove(board,move){const nb=cloneBoard(board);const piece=nb[move.fr][move.fc];nb[move.tr][move.tc]=move.promo?(isWhite(piece)?move.promo.toUpperCase():move.promo.toLowerCase()):piece;nb[move.fr][move.fc]="";if(move.ep)nb[move.fr][move.tc]="";if(move.castle){const row=move.fr;if(move.castle==="K"){nb[row][5]=nb[row][7];nb[row][7]=""}if(move.castle==="Q"){nb[row][3]=nb[row][0];nb[row][0]=""}}return nb}
function getLegalMoves(board,side,enPassant,castling){return generateMoves(board,side,enPassant,castling).filter(m=>{if(m.castle){if(isInCheck(board,side))return false;const opp=side==="w"?"b":"w";if(m.castle==="K"&&(isSquareAttacked(board,m.fr,5,opp)||isSquareAttacked(board,m.fr,6,opp)))return false;if(m.castle==="Q"&&(isSquareAttacked(board,m.fr,3,opp)||isSquareAttacked(board,m.fr,2,opp)))return false}return!isInCheck(applyMove(board,m),side)})}

// ============================================================
// EVALUATION + SEARCH (unchanged)
// ============================================================
function evaluate(board,side){let score=0;let totalMat=0;let wB=0,bB=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;const t=p.toLowerCase();if(t!=="k")totalMat+=PIECE_VALUES[t]||0}const isEnd=totalMat<2600;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;const t=p.toLowerCase();const val=PIECE_VALUES[t]||0;const pk=(t==="k"&&isEnd)?"k_end":t;const pi=isWhite(p)?r*8+c:(7-r)*8+c;const pv=PST[pk]?PST[pk][pi]:0;if(isWhite(p)){score+=val+pv;if(t==="b")wB++}else{score-=val+pv;if(t==="b")bB++}}if(wB>=2)score+=30;if(bB>=2)score-=30;for(let c=0;c<8;c++){let wP=0,bP=0,wR=false,bR=false;for(let r=0;r<8;r++){if(board[r][c]==="P")wP++;if(board[r][c]==="p")bP++;if(board[r][c]==="R")wR=true;if(board[r][c]==="r")bR=true}if(wR&&wP===0)score+=bP===0?25:12;if(bR&&bP===0)score-=wP===0?25:12}for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(board[r][c]==="P"){let ps=true;for(let rr=r-1;rr>=0&&ps;rr--)for(let cc=Math.max(0,c-1);cc<=Math.min(7,c+1);cc++)if(board[rr][cc]==="p"){ps=false;break}if(ps)score+=(7-r)*10}if(board[r][c]==="p"){let ps=true;for(let rr=r+1;rr<=7&&ps;rr++)for(let cc=Math.max(0,c-1);cc<=Math.min(7,c+1);cc++)if(board[rr][cc]==="P"){ps=false;break}if(ps)score-=r*10}}return side==="w"?score:-score}

function moveScore(board,m){let s=0;const v=board[m.tr][m.tc];if(v)s+=10*(PIECE_VALUES[v.toLowerCase()]||0)-(PIECE_VALUES[board[m.fr][m.fc].toLowerCase()]||0)+100000;if(m.promo)s+=PIECE_VALUES[m.promo]+90000;if(m.castle)s+=50;if((m.tr===3||m.tr===4)&&(m.tc===3||m.tc===4))s+=20;return s}
function sortMoves(board,moves){return moves.map(m=>({m,s:moveScore(board,m)})).sort((a,b)=>b.s-a.s).map(x=>x.m)}

function quiescence(board,alpha,beta,side,qd){const sp=evaluate(board,side);if(qd<=0)return sp;if(sp>=beta)return beta;if(sp>alpha)alpha=sp;const opp=side==="w"?"b":"w";const caps=generateMoves(board,side,null,null).filter(m=>board[m.tr][m.tc]||m.promo||m.ep);for(const m of sortMoves(board,caps)){const nb=applyMove(board,m);if(isInCheck(nb,side))continue;const sc=-quiescence(nb,-beta,-alpha,opp,qd-1);if(sc>=beta)return beta;if(sc>alpha)alpha=sc}return alpha}

function alphaBeta(board,depth,alpha,beta,side,ep,cast){if(depth<=0)return{score:quiescence(board,alpha,beta,side,4)};const legal=getLegalMoves(board,side,ep,cast);if(legal.length===0){if(isInCheck(board,side))return{score:-99999-depth};return{score:0}}const sorted=sortMoves(board,legal);let bestMove=sorted[0],bestScore=-Infinity;for(const m of sorted){const nb=applyMove(board,m);const nep=(board[m.fr][m.fc].toLowerCase()==="p"&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;const nc={...cast};const t=board[m.fr][m.fc].toLowerCase();if(t==="k"){if(side==="w"){nc.wK=false;nc.wQ=false}else{nc.bK=false;nc.bQ=false}}if(t==="r"){if(m.fr===7&&m.fc===7)nc.wK=false;if(m.fr===7&&m.fc===0)nc.wQ=false;if(m.fr===0&&m.fc===7)nc.bK=false;if(m.fr===0&&m.fc===0)nc.bQ=false}if(m.tr===7&&m.tc===7)nc.wK=false;if(m.tr===7&&m.tc===0)nc.wQ=false;if(m.tr===0&&m.tc===7)nc.bK=false;if(m.tr===0&&m.tc===0)nc.bQ=false;const opp=side==="w"?"b":"w";const child=alphaBeta(nb,depth-1,-beta,-alpha,opp,nep,nc);const score=-child.score;if(score>bestScore){bestScore=score;bestMove=m}if(score>alpha)alpha=score;if(alpha>=beta)break}return{score:bestScore,move:bestMove}}

function searchBestMoves(board,side,ep,cast,tl=3000){const start=Date.now();let all=[];let cd=0;for(let d=1;d<=8;d++){if(Date.now()-start>tl*0.55)break;const legal=getLegalMoves(board,side,ep,cast);if(legal.length===0)break;const evs=[];const sorted=sortMoves(board,legal);let to=false;for(const m of sorted){if(Date.now()-start>tl){to=true;break}const nb=applyMove(board,m);const nep=(board[m.fr][m.fc].toLowerCase()==="p"&&Math.abs(m.tr-m.fr)===2)?[(m.fr+m.tr)/2,m.fc]:null;const nc={...cast};const t=board[m.fr][m.fc].toLowerCase();if(t==="k"){if(side==="w"){nc.wK=false;nc.wQ=false}else{nc.bK=false;nc.bQ=false}}if(t==="r"){if(m.fr===7&&m.fc===7)nc.wK=false;if(m.fr===7&&m.fc===0)nc.wQ=false;if(m.fr===0&&m.fc===7)nc.bK=false;if(m.fr===0&&m.fc===0)nc.bQ=false}if(m.tr===7&&m.tc===7)nc.wK=false;if(m.tr===7&&m.tc===0)nc.wQ=false;if(m.tr===0&&m.tc===7)nc.bK=false;if(m.tr===0&&m.tc===0)nc.bQ=false;const opp=side==="w"?"b":"w";const child=alphaBeta(nb,d-1,-Infinity,Infinity,opp,nep,nc);evs.push({move:m,score:-child.score})}if(to&&d>1)break;evs.sort((a,b)=>b.score-a.score);all=evs;cd=d}return{results:all.slice(0,5),depth:cd}}

function toSAN(board,move){const piece=board[move.fr][move.fc];const type=piece.toLowerCase();const target=coordToAlg(move.tr,move.tc);const capture=board[move.tr][move.tc]||move.ep?"x":"";const nb=applyMove(board,move);const opp=isWhite(piece)?"b":"w";const suffix=isInCheck(nb,opp)?(getLegalMoves(nb,opp,null,null).length===0?"#":"+"):"";if(move.castle==="K")return"O-O"+suffix;if(move.castle==="Q")return"O-O-O"+suffix;if(type==="p"){const prefix=capture?String.fromCharCode(97+move.fc):"";const promo=move.promo?"="+move.promo.toUpperCase():"";return prefix+capture+target+promo+suffix}let disambig="";const side=isWhite(piece)?"w":"b";const others=generateMoves(board,side,null,null).filter(m=>m.fr!==move.fr||m.fc!==move.fc).filter(m=>board[m.fr][m.fc].toLowerCase()===type&&m.tr===move.tr&&m.tc===move.tc).filter(m=>!isInCheck(applyMove(board,m),side));if(others.length>0){if(others.every(m=>m.fc!==move.fc))disambig=String.fromCharCode(97+move.fc);else if(others.every(m=>m.fr!==move.fr))disambig=String(8-move.fr);else disambig=coordToAlg(move.fr,move.fc)}return type.toUpperCase()+disambig+capture+target+suffix}

function analyzePosition(board,side,ep,cast,hist){const mk=hist.join(" ");const bk=OPENING_BOOK[mk];if(bk)return bk.map(bm=>{const[fr,fc]=algToCoord(bm.move.slice(0,2));const[tr,tc]=algToCoord(bm.move.slice(2,4));return{move:{fr,fc,tr,tc},alg:bm.move,san:toSAN(board,{fr,fc,tr,tc}),eval:bm.eval*(side==="w"?1:-1),name:bm.name,source:"book",depth:"book",reasoning:`Opening theory: ${bm.name}. Played in ${Math.round(bm.freq*100)}% of master games.`}}).sort((a,b)=>b.eval-a.eval).slice(0,5);
  const{results,depth}=searchBestMoves(board,side,ep,cast,3000);return results.map(r=>{const m=r.move;const cap=board[m.tr][m.tc];let re="";const nm={q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"};if(cap)re+=`Captures ${nm[cap.toLowerCase()]||"piece"}. `;if(m.castle)re+=`Castles ${m.castle==="K"?"kingside":"queenside"} for king safety. `;const ab=applyMove(board,m);const opp=side==="w"?"b":"w";if(isInCheck(ab,opp)){const ol=getLegalMoves(ab,opp,null,cast);re+=ol.length===0?"CHECKMATE. ":"Delivers check. "}if(cap&&!isSquareAttacked(ab,m.tr,m.tc,opp))re+="Piece is undefended. ";if((m.tr===3||m.tr===4)&&(m.tc===3||m.tc===4))re+="Controls center. ";if(!re)re="Improves piece activity and position.";return{move:m,alg:moveToAlg(m.fr,m.fc,m.tr,m.tc),san:toSAN(board,m),eval:r.score/100,source:"engine",depth:`d${depth}`,reasoning:re.trim()}})}

// ============================================================
// REACT UI - chess.com inspired theme, SVG pieces
// ============================================================

// Board colors - chess.com style
const LIGHT_SQ = "#ebecd0";
const DARK_SQ = "#779556";
const LIGHT_HIGHLIGHT = "#f6f669";
const DARK_HIGHLIGHT = "#bbcc44";
const LIGHT_SELECTED = "#f6f669";
const DARK_SELECTED = "#bbcc44";
const LIGHT_SUGGESTION = "#8bbcf0";
const DARK_SUGGESTION = "#5a9bd5";

export default function ChessAdvisor() {
  const [userColor, setUserColor] = useState(null);
  const [board, setBoard] = useState(INITIAL_BOARD.map(r=>[...r]));
  const [turn, setTurn] = useState("w");
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveList, setMoveList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [highlightedSugg, setHighlightedSugg] = useState(null);
  const [castling, setCastling] = useState({wK:true,wQ:true,bK:true,bQ:true});
  const [enPassant, setEnPassant] = useState(null);
  const [gameStatus, setGameStatus] = useState("active");
  const [lastMove, setLastMove] = useState(null);
  const moveListRef = useRef(null);

  useEffect(()=>{if(moveListRef.current)moveListRef.current.scrollTop=moveListRef.current.scrollHeight},[moveList]);
  useEffect(()=>{if(!userColor||gameStatus!=="active")return;if(turn===userColor){setAnalyzing(true);setTimeout(()=>{setAnalysis(analyzePosition(board,turn,enPassant,castling,moveHistory));setAnalyzing(false)},50)}else setAnalysis([])},[turn,board,userColor,gameStatus,enPassant,castling,moveHistory]);

  const isFlipped = userColor === "b";
  const PIECE_SIZE = 48;

  function checkGameEnd(nb,nt,ep,ca){const l=getLegalMoves(nb,nt,ep,ca);if(l.length===0){if(isInCheck(nb,nt))setGameStatus(nt==="w"?"black_wins":"white_wins");else setGameStatus("stalemate")}}

  function executeMove(fr,fc,tr,tc,promo){
    const move={fr,fc,tr,tc};const piece=board[fr][fc];const type=piece.toLowerCase();
    if(type==="k"&&Math.abs(tc-fc)===2)move.castle=tc>fc?"K":"Q";
    if(type==="p"&&enPassant&&tr===enPassant[0]&&tc===enPassant[1])move.ep=true;
    if(type==="p"&&(tr===0||tr===7))move.promo=promo||"q";
    const newBoard=applyMove(board,move);const san=toSAN(board,move);const alg=moveToAlg(fr,fc,tr,tc);
    const nh=[...moveHistory,alg];const nc={...castling};
    if(type==="k"){if(isWhite(piece)){nc.wK=false;nc.wQ=false}else{nc.bK=false;nc.bQ=false}}
    if(type==="r"){if(fr===7&&fc===7)nc.wK=false;if(fr===7&&fc===0)nc.wQ=false;if(fr===0&&fc===7)nc.bK=false;if(fr===0&&fc===0)nc.bQ=false}
    if(tr===7&&tc===7)nc.wK=false;if(tr===7&&tc===0)nc.wQ=false;if(tr===0&&tc===7)nc.bK=false;if(tr===0&&tc===0)nc.bQ=false;
    const ne=(type==="p"&&Math.abs(tr-fr)===2)?[(fr+tr)/2,fc]:null;const nt=turn==="w"?"b":"w";
    setBoard(newBoard);setTurn(nt);setMoveHistory(nh);setMoveList(prev=>[...prev,{san,turn,moveNum:Math.floor(prev.length/2)+1}]);
    setCastling(nc);setEnPassant(ne);setSelected(null);setLegalTargets([]);setHighlightedSugg(null);setLastMove({fr,fc,tr,tc});
    checkGameEnd(newBoard,nt,ne,nc);
  }

  function handleSquareClick(r,c){
    if(gameStatus!=="active"||!userColor)return;
    if(selected){if(legalTargets.some(t=>t.tr===r&&t.tc===c)){executeMove(selected[0],selected[1],r,c);return}}
    const piece=board[r][c];
    if(piece&&pieceColor(piece)===turn){setSelected([r,c]);setLegalTargets(getLegalMoves(board,turn,enPassant,castling).filter(m=>m.fr===r&&m.fc===c))}
    else{setSelected(null);setLegalTargets([])}
  }

  function resetGame(){setBoard(INITIAL_BOARD.map(r=>[...r]));setTurn("w");setMoveHistory([]);setMoveList([]);setSelected(null);setLegalTargets([]);setAnalysis([]);setCastling({wK:true,wQ:true,bK:true,bQ:true});setEnPassant(null);setGameStatus("active");setHighlightedSugg(null);setUserColor(null);setLastMove(null)}

  function renderBoard(){
    const rows=[];
    const kp=findKing(board,turn);const inChk=isInCheck(board,turn);
    for(let ri=0;ri<8;ri++){
      const r=isFlipped?7-ri:ri;const cells=[];
      for(let ci=0;ci<8;ci++){
        const c=isFlipped?7-ci:ci;const isDark=(r+c)%2===1;const piece=board[r][c];
        const isSel=selected&&selected[0]===r&&selected[1]===c;
        const isLT=legalTargets.some(t=>t.tr===r&&t.tc===c);
        const isSugg=highlightedSugg&&((highlightedSugg.move.fr===r&&highlightedSugg.move.fc===c)||(highlightedSugg.move.tr===r&&highlightedSugg.move.tc===c));
        const isLM=lastMove&&((lastMove.fr===r&&lastMove.fc===c)||(lastMove.tr===r&&lastMove.tc===c));
        const isKChk=inChk&&kp&&kp[0]===r&&kp[1]===c;

        let bg=isDark?DARK_SQ:LIGHT_SQ;
        if(isLM)bg=isDark?DARK_HIGHLIGHT:LIGHT_HIGHLIGHT;
        if(isSel)bg=isDark?DARK_SELECTED:LIGHT_SELECTED;
        if(isSugg)bg=isDark?DARK_SUGGESTION:LIGHT_SUGGESTION;

        cells.push(
          <div key={`${r}-${c}`} onClick={()=>handleSquareClick(r,c)} style={{
            width:"12.5%",aspectRatio:"1",backgroundColor:bg,display:"flex",alignItems:"center",justifyContent:"center",
            position:"relative",cursor:gameStatus==="active"?"pointer":"default",
            boxShadow:isKChk?"inset 0 0 16px 6px rgba(220,30,30,0.7)":"none",
            transition:"background-color 0.1s",
          }}>
            {ci===0&&<span style={{position:"absolute",top:2,left:3,fontSize:11,fontWeight:700,color:isDark?"#ebecd0":"#779556",fontFamily:"'Segoe UI',system-ui,sans-serif",lineHeight:1,userSelect:"none"}}>{8-r}</span>}
            {ri===7&&<span style={{position:"absolute",bottom:1,right:3,fontSize:11,fontWeight:700,color:isDark?"#ebecd0":"#779556",fontFamily:"'Segoe UI',system-ui,sans-serif",lineHeight:1,userSelect:"none"}}>{String.fromCharCode(97+c)}</span>}
            {isLT&&!piece&&<div style={{width:"30%",height:"30%",borderRadius:"50%",backgroundColor:"rgba(0,0,0,0.15)"}}/>}
            {isLT&&piece&&<div style={{position:"absolute",inset:0,borderRadius:"50%",border:"5px solid rgba(0,0,0,0.15)"}}/>}
            {piece&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"85%",height:"85%",filter:"drop-shadow(1px 2px 2px rgba(0,0,0,0.25))"}}>{SVG_PIECES[piece](PIECE_SIZE)}</div>}
          </div>
        );
      }
      rows.push(<div key={ri} style={{display:"flex",width:"100%"}}>{cells}</div>);
    }
    return rows;
  }

  // ===== COLOR SELECT =====
  if(!userColor){
    return(
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#302e2b",color:"#e8e6e1",padding:20}}>
        <div style={{textAlign:"center",maxWidth:500}}>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:16}}>
            <div style={{width:48,height:48}}>{SVG_PIECES.k(48)}</div>
            <div style={{width:48,height:48}}>{SVG_PIECES.K(48)}</div>
          </div>
          <h1 style={{fontSize:32,fontWeight:700,letterSpacing:1,marginBottom:6}}>Chess Advisor</h1>
          <p style={{fontSize:13,color:"#9b9b9b",fontFamily:"monospace",letterSpacing:1,marginBottom:6}}>PREDICTIVE ANALYSIS ENGINE v2</p>
          <p style={{fontSize:11,color:"#6b6b6b",fontFamily:"monospace",marginBottom:40}}>Quiescence Search / Iterative Deepening / Opening Book</p>
          <p style={{fontSize:17,color:"#bbb",marginBottom:28}}>Choose your color</p>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            <button onClick={()=>setUserColor("w")} style={{width:150,padding:"24px 16px",background:"#ebecd0",color:"#302e2b",border:"3px solid #779556",borderRadius:8,cursor:"pointer",fontFamily:"'Segoe UI',system-ui,sans-serif",transition:"transform 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{marginBottom:8}}>{SVG_PIECES.K(52)}</div>
              <div style={{fontSize:14,fontWeight:700,letterSpacing:1}}>WHITE</div>
            </button>
            <button onClick={()=>setUserColor("b")} style={{width:150,padding:"24px 16px",background:"#302e2b",color:"#e8e6e1",border:"3px solid #555",borderRadius:8,cursor:"pointer",fontFamily:"'Segoe UI',system-ui,sans-serif",transition:"transform 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <div style={{marginBottom:8}}>{SVG_PIECES.k(52)}</div>
              <div style={{fontSize:14,fontWeight:700,letterSpacing:1}}>BLACK</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN GAME =====
  const isUserTurn=turn===userColor;
  const statusText=gameStatus==="white_wins"?"Checkmate. White wins.":gameStatus==="black_wins"?"Checkmate. Black wins.":gameStatus==="stalemate"?"Stalemate. Draw.":isUserTurn?"Your turn. Click a piece or pick a suggestion.":"Opponent's turn. Click their piece, then destination.";

  return(
    <div style={{minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#302e2b",color:"#e8e6e1",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #444",background:"#262421"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28}}>{userColor==="w"?SVG_PIECES.K(28):SVG_PIECES.k(28)}</div>
          <span style={{fontSize:15,fontWeight:700,letterSpacing:.5}}>Chess Advisor</span>
          <span style={{fontSize:11,color:"#7b7b7b",fontFamily:"monospace"}}>v2</span>
        </div>
        <button onClick={resetGame} style={{background:"#3c3a37",border:"1px solid #555",color:"#bbb",padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:600}}>New Game</button>
      </div>

      <div style={{flex:1,display:"flex",flexWrap:"wrap",padding:"12px",maxWidth:1100,margin:"0 auto",width:"100%",gap:12}}>
        {/* Board */}
        <div style={{flex:"1 1 400px",maxWidth:520,minWidth:280}}>
          {/* Status bar */}
          <div style={{padding:"7px 12px",marginBottom:8,background:gameStatus!=="active"?"rgba(220,50,50,0.15)":isUserTurn?"rgba(130,180,60,0.12)":"rgba(90,155,213,0.1)",borderRadius:4,borderLeft:`3px solid ${gameStatus!=="active"?"#e04040":isUserTurn?"#81b64c":"#5a9bd5"}`}}>
            <span style={{fontSize:13,fontWeight:500,color:"#ccc"}}>{statusText}</span>
          </div>

          {/* Board */}
          <div style={{border:"3px solid #1a1916",borderRadius:4,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.6)"}}>
            {renderBoard()}
          </div>

          <div style={{marginTop:6,display:"flex",justifyContent:"space-between",fontSize:11,color:"#777"}}>
            <span>{turn==="w"?"White":"Black"} to move{!isUserTurn&&gameStatus==="active"&&<span style={{color:"#5a9bd5",marginLeft:6}}>- click their piece on board</span>}</span>
            <span>Move {Math.floor(moveList.length/2)+1}</span>
          </div>
        </div>

        {/* Right panel */}
        <div style={{flex:"1 1 280px",maxWidth:440,minWidth:260,display:"flex",flexDirection:"column",gap:10}}>
          {/* Analysis */}
          <div style={{background:"#262421",border:"1px solid #3c3a37",borderRadius:4,padding:14,flex:"1 1 auto"}}>
            <div style={{fontSize:11,fontFamily:"monospace",letterSpacing:1.5,color:"#888",marginBottom:10,textTransform:"uppercase",display:"flex",justifyContent:"space-between"}}>
              <span>{analyzing?"Analyzing...":isUserTurn&&analysis.length>0?"Suggested Moves":"Analysis"}</span>
              {analysis.length>0&&analysis[0].depth&&<span style={{color:"#666"}}>{analysis[0].source==="book"?"BOOK":analysis[0].depth}</span>}
            </div>

            {!isUserTurn&&gameStatus==="active"&&<p style={{fontSize:13,color:"#666",fontStyle:"italic"}}>Waiting for opponent's move...</p>}

            {isUserTurn&&analysis.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {analysis.map((a,i)=>{
                  const isTop=i===0;
                  const evStr=a.eval>=0?`+${a.eval.toFixed(1)}`:a.eval.toFixed(1);
                  const evCol=a.eval>0.3?"#81b64c":a.eval<-0.3?"#e06060":"#ccc";
                  return(
                    <div key={i}
                      onMouseEnter={()=>setHighlightedSugg(a)} onMouseLeave={()=>setHighlightedSugg(null)}
                      onClick={()=>{if(turn===userColor)executeMove(a.move.fr,a.move.fc,a.move.tr,a.move.tc,a.move.promo)}}
                      style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",background:isTop?"rgba(129,182,76,0.08)":"transparent",border:isTop?"1px solid rgba(129,182,76,0.2)":"1px solid transparent",borderRadius:4,cursor:"pointer",transition:"background 0.1s"}}
                      onMouseOver={e=>{if(!isTop)e.currentTarget.style.background="rgba(255,255,255,0.03)"}}
                      onMouseOut={e=>{if(!isTop)e.currentTarget.style.background="transparent"}}
                    >
                      <div style={{minWidth:22,fontFamily:"monospace",fontSize:11,color:"#555",paddingTop:3}}>#{i+1}</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                          <span style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:"#e8e6e1"}}>{a.san}</span>
                          <span style={{fontFamily:"monospace",fontSize:12,fontWeight:600,color:evCol}}>{evStr}</span>
                          {a.source==="book"&&<span style={{fontSize:9,fontFamily:"monospace",background:"rgba(139,92,246,0.2)",color:"#a78bfa",padding:"1px 6px",borderRadius:3,letterSpacing:1}}>BOOK</span>}
                          {isTop&&<span style={{fontSize:9,fontFamily:"monospace",background:"rgba(129,182,76,0.15)",color:"#81b64c",padding:"1px 6px",borderRadius:3,letterSpacing:1}}>BEST</span>}
                        </div>
                        <div style={{fontSize:12,color:"#888",lineHeight:1.4}}>{a.reasoning}{a.name&&<span style={{color:"#a78bfa"}}> [{a.name}]</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isUserTurn&&analysis.length===0&&!analyzing&&gameStatus==="active"&&<p style={{fontSize:13,color:"#777"}}>No moves available.</p>}

            {gameStatus!=="active"&&(
              <div style={{textAlign:"center",padding:20}}>
                <div style={{display:"inline-block",width:36,height:36,marginBottom:8}}>{gameStatus==="stalemate"?<span style={{fontSize:28}}>{"="}</span>:gameStatus==="white_wins"?SVG_PIECES.K(36):SVG_PIECES.k(36)}</div>
                <div style={{fontSize:14,fontWeight:600,color:"#ccc"}}>{statusText}</div>
              </div>
            )}
          </div>

          {/* Move History */}
          <div style={{background:"#262421",border:"1px solid #3c3a37",borderRadius:4,padding:14,maxHeight:170,overflow:"hidden"}}>
            <div style={{fontSize:11,fontFamily:"monospace",letterSpacing:1.5,color:"#888",marginBottom:8,textTransform:"uppercase"}}>Move History</div>
            <div ref={moveListRef} style={{maxHeight:120,overflowY:"auto",fontFamily:"monospace",fontSize:13}}>
              {moveList.length===0?<span style={{color:"#555"}}>No moves yet.</span>:(
                <div style={{display:"flex",flexWrap:"wrap",gap:"2px 0"}}>{moveList.map((m,i)=>(
                  <span key={i}>{m.turn==="w"&&<span style={{color:"#666",marginRight:4}}>{m.moveNum}.</span>}<span style={{color:m.turn==="w"?"#e8e6e1":"#aaa",marginRight:8}}>{m.san}</span></span>
                ))}</div>
              )}
            </div>
          </div>

          {/* Help */}
          <div style={{background:"#1e1c1a",border:"1px solid #333",borderRadius:4,padding:12,fontSize:11,fontFamily:"monospace",color:"#666",lineHeight:1.7}}>
            <div style={{color:"#888",marginBottom:4,letterSpacing:1}}>HOW TO PLAY</div>
            <span style={{color:"#81b64c"}}>Your turn:</span> click piece or click suggestion
            <br/><span style={{color:"#5a9bd5"}}>Opponent:</span> click their piece, then destination
            <br/><span style={{color:"#a78bfa"}}>Hover</span> suggestions to preview on board
          </div>
        </div>
      </div>
    </div>
  );
}
