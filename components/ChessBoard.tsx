"use client";

import { clsx } from "clsx";
import type { Board, Coord, Move, Piece } from "@/lib/chess/types";
import { FILES, RANKS } from "@/lib/chess/types";

const GLYPHS: Record<string, string> = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

function glyph(piece: Piece): string {
  return GLYPHS[`${piece.color}${piece.type}`];
}

interface ChessBoardProps {
  board: Board;
  selected: Coord | null;
  legalTargets: Coord[];
  lastMove: Move | null;
  flipped?: boolean;
  onSquareClick: (coord: Coord) => void;
  disabled?: boolean;
}

export function ChessBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  flipped = false,
  onSquareClick,
  disabled,
}: ChessBoardProps) {
  const rows = flipped
    ? [0, 1, 2, 3, 4, 5, 6, 7]
    : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];

  const isLegal = (r: number, c: number) =>
    legalTargets.some((t) => t.row === r && t.col === c);

  const isSelected = (r: number, c: number) =>
    selected?.row === r && selected?.col === c;

  const isLast = (r: number, c: number) =>
    !!lastMove &&
    ((lastMove.from.row === r && lastMove.from.col === c) ||
      (lastMove.to.row === r && lastMove.to.col === c));

  return (
    <div
      className="relative mx-auto w-full max-w-[min(92vw,560px)] select-none"
      role="grid"
      aria-label="Chess board"
    >
      <div className="grid grid-cols-8 overflow-hidden rounded-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/20">
        {rows.map((r) =>
          cols.map((c) => {
            const light = (r + c) % 2 === 0;
            const piece = board[r][c];
            const legal = isLegal(r, c);
            const selectedSq = isSelected(r, c);
            const last = isLast(r, c);

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                role="gridcell"
                disabled={disabled}
                aria-label={`${FILES[c]}${RANKS[r]}${piece ? `, ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
                onClick={() => onSquareClick({ row: r, col: c })}
                className={clsx(
                  "relative aspect-square flex items-center justify-center text-[clamp(1.6rem,7vw,2.85rem)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300 disabled:cursor-default",
                  light ? "bg-[#f0d9b5]" : "bg-[#b58863]",
                  selectedSq && "ring-2 ring-inset ring-amber-400/90",
                  last && !selectedSq && (light ? "bg-[#cdd26a]" : "bg-[#aaa23a]"),
                  !disabled && "hover:brightness-[1.06]",
                )}
              >
                {piece && (
                  <span
                    className={clsx(
                      "leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]",
                      piece.color === "w" ? "text-[#f8f5f0]" : "text-[#1a1510]",
                      piece.color === "w" &&
                        "[text-shadow:0_0_1px_#111,0_1px_2px_rgba(0,0,0,0.45)]",
                    )}
                  >
                    {glyph(piece)}
                  </span>
                )}
                {legal && !piece && (
                  <span className="absolute h-[22%] w-[22%] rounded-full bg-[#1a1a1a]/28" />
                )}
                {legal && piece && (
                  <span className="absolute inset-[8%] rounded-full border-[3px] border-[#1a1a1a]/30" />
                )}
                {/* file / rank labels */}
                {c === (flipped ? 7 : 0) && (
                  <span
                    className={clsx(
                      "absolute left-1 top-0.5 text-[10px] font-semibold opacity-70",
                      light ? "text-[#5b4632]" : "text-[#f3e6d0]",
                    )}
                  >
                    {RANKS[r]}
                  </span>
                )}
                {r === (flipped ? 0 : 7) && (
                  <span
                    className={clsx(
                      "absolute bottom-0.5 right-1 text-[10px] font-semibold opacity-70",
                      light ? "text-[#5b4632]" : "text-[#f3e6d0]",
                    )}
                  >
                    {FILES[c]}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
