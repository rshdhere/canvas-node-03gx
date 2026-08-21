"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  chooseAiMove,
  createInitialState,
  getLegalMoves,
  makeMove,
  tryMove,
} from "@/lib/chess/engine";
import type { Coord, GameState, PieceType } from "@/lib/chess/types";
import { ChessBoard } from "./ChessBoard";

type Mode = "local" | "ai";

const PIECE_NAMES: Record<string, string> = {
  k: "King",
  q: "Queen",
  r: "Rook",
  b: "Bishop",
  n: "Knight",
  p: "Pawn",
};

function statusLabel(state: GameState): string {
  switch (state.status) {
    case "check":
      return `${state.turn === "w" ? "White" : "Black"} is in check`;
    case "checkmate":
      return `Checkmate — ${state.winner === "w" ? "White" : "Black"} wins`;
    case "stalemate":
      return "Stalemate — draw";
    case "draw":
      return "Draw by fifty-move rule";
    default:
      return `${state.turn === "w" ? "White" : "Black"} to move`;
  }
}

function capturedList(state: GameState, color: "w" | "b") {
  const order: PieceType[] = ["q", "r", "b", "n", "p"];
  const glyphs: Record<string, string> = {
    wq: "♕",
    wr: "♖",
    wb: "♗",
    wn: "♘",
    wp: "♙",
    bq: "♛",
    br: "♜",
    bb: "♝",
    bn: "♞",
    bp: "♟",
  };
  const pieces = state.history
    .filter((m) => m.captured?.color === color)
    .map((m) => m.captured!);
  pieces.sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
  );
  return pieces.map((p, i) => (
    <span key={`${p.type}-${i}`} className="text-lg leading-none">
      {glyphs[`${p.color}${p.type}`]}
    </span>
  ));
}

export function ChessGame() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [selected, setSelected] = useState<Coord | null>(null);
  const [mode, setMode] = useState<Mode>("local");
  const [aiThinking, setAiThinking] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{
    from: Coord;
    to: Coord;
  } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [past, setPast] = useState<GameState[]>([]);

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return getLegalMoves(state, selected).map((m) => m.to);
  }, [selected, state]);

  const lastMove =
    state.history.length > 0 ? state.history[state.history.length - 1] : null;

  const gameOver =
    state.status === "checkmate" ||
    state.status === "stalemate" ||
    state.status === "draw";

  const reset = () => {
    setState(createInitialState());
    setPast([]);
    setSelected(null);
    setPromotionPending(null);
    setAiThinking(false);
  };

  const undo = () => {
    if (past.length === 0 || aiThinking) return;
    // In AI mode, undo the AI reply and the human move together when possible
    if (mode === "ai" && past.length >= 2) {
      const target = past[past.length - 2];
      setPast((p) => p.slice(0, -2));
      setState(target);
    } else {
      const target = past[past.length - 1];
      setPast((p) => p.slice(0, -1));
      setState(target);
    }
    setSelected(null);
    setPromotionPending(null);
  };

  const applyHumanMove = useCallback(
    (from: Coord, to: Coord, promotion: PieceType = "q") => {
      setState((prev) => {
        const next = tryMove(prev, from, to, promotion);
        if (!next) return prev;
        setPast((p) => [...p, prev]);
        return next;
      });
      setSelected(null);
      setPromotionPending(null);
    },
    [],
  );

  const onSquareClick = (coord: Coord) => {
    if (gameOver || aiThinking || promotionPending) return;
    if (mode === "ai" && state.turn === "b") return;

    const piece = state.board[coord.row][coord.col];

    if (selected) {
      const moves = getLegalMoves(state, selected);
      const matches = moves.filter(
        (m) => m.to.row === coord.row && m.to.col === coord.col,
      );
      if (matches.length > 0) {
        const needsPromo = matches.some((m) => m.promotion);
        if (needsPromo) {
          setPromotionPending({ from: selected, to: coord });
          return;
        }
        applyHumanMove(selected, coord);
        return;
      }
    }

    if (piece && piece.color === state.turn) {
      setSelected(coord);
    } else {
      setSelected(null);
    }
  };

  // AI move
  useEffect(() => {
    if (mode !== "ai" || state.turn !== "b" || gameOver) return;
    let cancelled = false;
    setAiThinking(true);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const move = chooseAiMove(state, 2);
      if (move) {
        setState((prev) => {
          setPast((p) => [...p, prev]);
          return makeMove(prev, move);
        });
      }
      setAiThinking(false);
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, state, gameOver]);

  const movePairs = useMemo(() => {
    const pairs: { num: number; white?: string; black?: string }[] = [];
    for (let i = 0; i < state.history.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: state.history[i]?.notation,
        black: state.history[i + 1]?.notation,
      });
    }
    return pairs;
  }, [state.history]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-200/70">
              Live board
            </p>
            <p
              className={clsx(
                "mt-1 text-lg font-semibold",
                state.status === "checkmate"
                  ? "text-emerald-300"
                  : state.status === "check"
                    ? "text-amber-300"
                    : "text-stone-100",
              )}
              aria-live="polite"
            >
              {aiThinking ? "Black is thinking…" : statusLabel(state)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Flip board
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={past.length === 0 || aiThinking}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            >
              New game
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-stone-300">
          <div className="flex min-h-7 flex-wrap items-center gap-0.5">
            <span className="mr-2 text-xs uppercase tracking-wide text-stone-500">
              Captured by white
            </span>
            {capturedList(state, "b")}
          </div>
        </div>

        <ChessBoard
          board={state.board}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          flipped={flipped}
          onSquareClick={onSquareClick}
          disabled={gameOver || aiThinking || !!promotionPending}
        />

        <div className="flex items-center justify-between gap-3 text-sm text-stone-300">
          <div className="flex min-h-7 flex-wrap items-center gap-0.5">
            <span className="mr-2 text-xs uppercase tracking-wide text-stone-500">
              Captured by black
            </span>
            {capturedList(state, "w")}
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-5 lg:w-72">
        <section className="rounded-2xl border border-white/10 bg-stone-950/40 p-4 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-400">
            Play mode
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("local");
                reset();
              }}
              className={clsx(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300",
                mode === "local"
                  ? "bg-amber-500 text-stone-950"
                  : "bg-white/5 text-stone-200 hover:bg-white/10",
              )}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("ai");
                reset();
                setFlipped(false);
              }}
              className={clsx(
                "rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300",
                mode === "ai"
                  ? "bg-amber-500 text-stone-950"
                  : "bg-white/5 text-stone-200 hover:bg-white/10",
              )}
            >
              vs Computer
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-stone-400">
            {mode === "local"
              ? "Pass-and-play on one device. White moves first."
              : "You play White. The computer answers with a shallow search."}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-stone-950/40 p-4 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-400">
            Move list
          </h2>
          <div className="mt-3 max-h-64 overflow-y-auto pr-1 font-mono text-sm">
            {movePairs.length === 0 ? (
              <p className="text-stone-500">No moves yet. Click a piece to begin.</p>
            ) : (
              <ol className="space-y-1">
                {movePairs.map((pair) => (
                  <li
                    key={pair.num}
                    className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-stone-200"
                  >
                    <span className="text-stone-500">{pair.num}.</span>
                    <span>{pair.white ?? ""}</span>
                    <span>{pair.black ?? ""}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-stone-950/40 p-4 text-sm leading-relaxed text-stone-400 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-400">
            How to play
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-4">
            <li>Select a piece, then tap a highlighted square.</li>
            <li>Castling, en passant, and promotion are supported.</li>
            <li>Check, checkmate, and stalemate end the game.</li>
          </ul>
        </section>
      </aside>

      {promotionPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Choose promotion piece"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-stone-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-50">Promote pawn</h3>
            <p className="mt-1 text-sm text-stone-400">
              Choose the piece to promote to.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(
                [
                  { type: "q" as const, w: "♕", b: "♛" },
                  { type: "r" as const, w: "♖", b: "♜" },
                  { type: "b" as const, w: "♗", b: "♝" },
                  { type: "n" as const, w: "♘", b: "♞" },
                ] satisfies { type: PieceType; w: string; b: string }[]
              ).map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() =>
                    applyHumanMove(
                      promotionPending.from,
                      promotionPending.to,
                      opt.type,
                    )
                  }
                  className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-3 text-stone-100 transition hover:bg-amber-500 hover:text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  <span className="text-3xl">
                    {state.turn === "w" ? opt.w : opt.b}
                  </span>
                  <span className="text-xs font-medium">
                    {PIECE_NAMES[opt.type]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
