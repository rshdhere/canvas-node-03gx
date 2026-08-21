export type Color = "w" | "b";
export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = Piece | null;
export type Board = Square[][];

export interface Coord {
  row: number;
  col: number;
}

export interface Move {
  from: Coord;
  to: Coord;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  isCastle?: boolean;
  isEnPassant?: boolean;
  notation: string;
}

export interface GameState {
  board: Board;
  turn: Color;
  castling: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassant: Coord | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  history: Move[];
  status: "playing" | "check" | "checkmate" | "stalemate" | "draw";
  winner: Color | null;
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;
