import {
  Board,
  Color,
  Coord,
  FILES,
  GameState,
  Move,
  Piece,
  PieceType,
  RANKS,
  Square,
} from "./types";

const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((sq) => (sq ? { ...sq } : null)));

const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const coordKey = (c: Coord) => `${c.row},${c.col}`;

export function squareName({ row, col }: Coord): string {
  return `${FILES[col]}${RANKS[row]}`;
}

export function createInitialBoard(): Board {
  const empty: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null),
  );

  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    empty[0][c] = { type: back[c], color: "b" };
    empty[1][c] = { type: "p", color: "b" };
    empty[6][c] = { type: "p", color: "w" };
    empty[7][c] = { type: back[c], color: "w" };
  }
  return empty;
}

export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    history: [],
    status: "playing",
    winner: null,
  };
}

function findKing(board: Board, color: Color): Coord | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return { row: r, col: c };
    }
  }
  return null;
}

function isSquareAttacked(board: Board, target: Coord, by: Color): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== by) continue;
      const attacks = rawMoves(board, { row: r, col: c }, piece, null, true);
      if (attacks.some((m) => m.row === target.row && m.col === target.col)) {
        return true;
      }
    }
  }
  return false;
}

export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king, color === "w" ? "b" : "w");
}

function rawMoves(
  board: Board,
  from: Coord,
  piece: Piece,
  enPassant: Coord | null,
  forAttack: boolean,
): Coord[] {
  const moves: Coord[] = [];
  const { row, col } = from;
  const dir = piece.color === "w" ? -1 : 1;

  const addSlide = (dr: number, dc: number) => {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (target.color !== piece.color) moves.push({ row: r, col: c });
        break;
      }
      r += dr;
      c += dc;
    }
  };

  switch (piece.type) {
    case "p": {
      if (!forAttack) {
        const one = row + dir;
        if (inBounds(one, col) && !board[one][col]) {
          moves.push({ row: one, col });
          const start = piece.color === "w" ? 6 : 1;
          const two = row + 2 * dir;
          if (row === start && inBounds(two, col) && !board[two][col]) {
            moves.push({ row: two, col });
          }
        }
      }
      for (const dc of [-1, 1]) {
        const r = row + dir;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (forAttack || (target && target.color !== piece.color)) {
          moves.push({ row: r, col: c });
        } else if (
          enPassant &&
          enPassant.row === r &&
          enPassant.col === c &&
          !forAttack
        ) {
          moves.push({ row: r, col: c });
        }
      }
      break;
    }
    case "n": {
      const deltas = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const [dr, dc] of deltas) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color !== piece.color) moves.push({ row: r, col: c });
      }
      break;
    }
    case "b":
      addSlide(-1, -1);
      addSlide(-1, 1);
      addSlide(1, -1);
      addSlide(1, 1);
      break;
    case "r":
      addSlide(-1, 0);
      addSlide(1, 0);
      addSlide(0, -1);
      addSlide(0, 1);
      break;
    case "q":
      addSlide(-1, -1);
      addSlide(-1, 1);
      addSlide(1, -1);
      addSlide(1, 1);
      addSlide(-1, 0);
      addSlide(1, 0);
      addSlide(0, -1);
      addSlide(0, 1);
      break;
    case "k": {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr;
          const c = col + dc;
          if (!inBounds(r, c)) continue;
          const target = board[r][c];
          if (!target || target.color !== piece.color) moves.push({ row: r, col: c });
        }
      }
      break;
    }
  }
  return moves;
}

function applyMoveOnBoard(
  board: Board,
  from: Coord,
  to: Coord,
  promotion?: PieceType,
  isEnPassant?: boolean,
  isCastle?: boolean,
): Board {
  const next = cloneBoard(board);
  const piece = next[from.row][from.col];
  if (!piece) return next;

  next[from.row][from.col] = null;

  if (isEnPassant) {
    const capRow = piece.color === "w" ? to.row + 1 : to.row - 1;
    next[capRow][to.col] = null;
  }

  if (isCastle) {
    if (to.col === 6) {
      next[to.row][5] = next[to.row][7];
      next[to.row][7] = null;
    } else if (to.col === 2) {
      next[to.row][3] = next[to.row][0];
      next[to.row][0] = null;
    }
  }

  const placed: Piece =
    promotion && piece.type === "p"
      ? { type: promotion, color: piece.color }
      : { ...piece };

  next[to.row][to.col] = placed;
  return next;
}

function pieceLetter(type: PieceType): string {
  return type === "p" ? "" : type.toUpperCase();
}

function buildNotation(
  board: Board,
  from: Coord,
  to: Coord,
  piece: Piece,
  captured: Square,
  promotion: PieceType | undefined,
  isCastle: boolean | undefined,
  isEnPassant: boolean | undefined,
  causesCheck: boolean,
  causesMate: boolean,
): string {
  if (isCastle) return to.col === 6 ? "O-O" : "O-O-O";

  let text = pieceLetter(piece.type);
  if (piece.type !== "p" || captured || isEnPassant) {
    if (piece.type === "p" && (captured || isEnPassant)) {
      text = FILES[from.col];
    }
  }
  if (captured || isEnPassant) text += "x";
  text += squareName(to);
  if (promotion) text += `=${promotion.toUpperCase()}`;
  if (causesMate) text += "#";
  else if (causesCheck) text += "+";
  return text;
}

export function getLegalMoves(state: GameState, from: Coord): Move[] {
  const piece = state.board[from.row][from.col];
  if (!piece || piece.color !== state.turn) return [];

  const candidates = rawMoves(state.board, from, piece, state.enPassant, false);
  const legal: Move[] = [];

  // Castling
  if (piece.type === "k") {
    const row = piece.color === "w" ? 7 : 0;
    const enemy = piece.color === "w" ? "b" : "w";
    if (
      ((piece.color === "w" && state.castling.wK) ||
        (piece.color === "b" && state.castling.bK)) &&
      !state.board[row][5] &&
      !state.board[row][6] &&
      !isInCheck(state.board, piece.color) &&
      !isSquareAttacked(state.board, { row, col: 5 }, enemy) &&
      !isSquareAttacked(state.board, { row, col: 6 }, enemy)
    ) {
      candidates.push({ row, col: 6 });
    }
    if (
      ((piece.color === "w" && state.castling.wQ) ||
        (piece.color === "b" && state.castling.bQ)) &&
      !state.board[row][1] &&
      !state.board[row][2] &&
      !state.board[row][3] &&
      !isInCheck(state.board, piece.color) &&
      !isSquareAttacked(state.board, { row, col: 3 }, enemy) &&
      !isSquareAttacked(state.board, { row, col: 2 }, enemy)
    ) {
      candidates.push({ row, col: 2 });
    }
  }

  for (const to of candidates) {
    const isCastle =
      piece.type === "k" && Math.abs(to.col - from.col) === 2;
    const isEnPassant =
      piece.type === "p" &&
      !!state.enPassant &&
      to.row === state.enPassant.row &&
      to.col === state.enPassant.col &&
      !state.board[to.row][to.col];

    const promotions: (PieceType | undefined)[] =
      piece.type === "p" && (to.row === 0 || to.row === 7)
        ? ["q", "r", "b", "n"]
        : [undefined];

    for (const promotion of promotions) {
      const nextBoard = applyMoveOnBoard(
        state.board,
        from,
        to,
        promotion,
        isEnPassant,
        isCastle,
      );
      if (isInCheck(nextBoard, piece.color)) continue;

      const captured = isEnPassant
        ? state.board[piece.color === "w" ? to.row + 1 : to.row - 1][to.col]
        : state.board[to.row][to.col];

      const enemy = piece.color === "w" ? "b" : "w";
      const causesCheck = isInCheck(nextBoard, enemy);

      // Mate check is approximate here; refined after full move application
      legal.push({
        from,
        to,
        piece,
        captured: captured ?? undefined,
        promotion,
        isCastle,
        isEnPassant,
        notation: buildNotation(
          state.board,
          from,
          to,
          piece,
          captured,
          promotion,
          isCastle,
          isEnPassant,
          causesCheck,
          false,
        ),
      });
    }
  }

  return legal;
}

export function getAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === state.turn) {
        moves.push(...getLegalMoves(state, { row: r, col: c }));
      }
    }
  }
  return moves;
}

function updateCastling(
  state: GameState,
  from: Coord,
  to: Coord,
  piece: Piece,
): GameState["castling"] {
  const castling = { ...state.castling };
  if (piece.type === "k") {
    if (piece.color === "w") {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  if (piece.type === "r") {
    if (piece.color === "w") {
      if (from.row === 7 && from.col === 0) castling.wQ = false;
      if (from.row === 7 && from.col === 7) castling.wK = false;
    } else {
      if (from.row === 0 && from.col === 0) castling.bQ = false;
      if (from.row === 0 && from.col === 7) castling.bK = false;
    }
  }
  // Captured rook on corner
  if (to.row === 0 && to.col === 0) castling.bQ = false;
  if (to.row === 0 && to.col === 7) castling.bK = false;
  if (to.row === 7 && to.col === 0) castling.wQ = false;
  if (to.row === 7 && to.col === 7) castling.wK = false;
  return castling;
}

export function makeMove(state: GameState, move: Move): GameState {
  const board = applyMoveOnBoard(
    state.board,
    move.from,
    move.to,
    move.promotion,
    move.isEnPassant,
    move.isCastle,
  );

  let enPassant: Coord | null = null;
  if (
    move.piece.type === "p" &&
    Math.abs(move.to.row - move.from.row) === 2
  ) {
    enPassant = {
      row: (move.from.row + move.to.row) / 2,
      col: move.from.col,
    };
  }

  const nextTurn: Color = state.turn === "w" ? "b" : "w";
  const halfMoveClock =
    move.piece.type === "p" || move.captured ? 0 : state.halfMoveClock + 1;

  const next: GameState = {
    board,
    turn: nextTurn,
    castling: updateCastling(state, move.from, move.to, move.piece),
    enPassant,
    halfMoveClock,
    fullMoveNumber:
      state.turn === "b" ? state.fullMoveNumber + 1 : state.fullMoveNumber,
    history: [...state.history, move],
    status: "playing",
    winner: null,
  };

  const legal = getAllLegalMoves(next);
  const inCheck = isInCheck(board, nextTurn);

  if (legal.length === 0) {
    if (inCheck) {
      next.status = "checkmate";
      next.winner = state.turn;
    } else {
      next.status = "stalemate";
    }
  } else if (halfMoveClock >= 100) {
    next.status = "draw";
  } else if (inCheck) {
    next.status = "check";
  }

  // Fix notation with mate
  if (next.status === "checkmate" && next.history.length > 0) {
    const last = { ...next.history[next.history.length - 1] };
    last.notation = last.notation.replace(/\+?$/, "#");
    next.history = [...next.history.slice(0, -1), last];
  }

  return next;
}

export function tryMove(
  state: GameState,
  from: Coord,
  to: Coord,
  promotion: PieceType = "q",
): GameState | null {
  const legal = getLegalMoves(state, from);
  const match = legal.find(
    (m) =>
      m.to.row === to.row &&
      m.to.col === to.col &&
      (m.promotion === undefined || m.promotion === promotion),
  );
  if (!match) return null;
  return makeMove(state, match);
}

/** Simple material + mobility evaluation for AI */
const PIECE_VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export function evaluate(state: GameState): number {
  if (state.status === "checkmate") {
    return state.winner === "w" ? 100000 : -100000;
  }
  if (state.status === "stalemate" || state.status === "draw") return 0;

  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const v = PIECE_VALUE[p.type];
      score += p.color === "w" ? v : -v;
    }
  }
  return score;
}

export function chooseAiMove(state: GameState, depth = 2): Move | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  const maximizing = state.turn === "w";
  let best: Move | null = null;
  let bestScore = maximizing ? -Infinity : Infinity;

  // Prefer captures slightly for variety
  const ordered = [...moves].sort((a, b) => {
    const av = a.captured ? PIECE_VALUE[a.captured.type] : 0;
    const bv = b.captured ? PIECE_VALUE[b.captured.type] : 0;
    return bv - av;
  });

  for (const move of ordered) {
    const next = makeMove(state, move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, !maximizing);
    if (maximizing) {
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    } else if (score < bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best ?? ordered[0];
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (
    depth === 0 ||
    state.status === "checkmate" ||
    state.status === "stalemate" ||
    state.status === "draw"
  ) {
    return evaluate(state);
  }

  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return evaluate(state);

  if (maximizing) {
    let value = -Infinity;
    for (const move of moves) {
      value = Math.max(value, minimax(makeMove(state, move), depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of moves) {
    value = Math.min(value, minimax(makeMove(state, move), depth - 1, alpha, beta, true));
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
}

export { coordKey };
