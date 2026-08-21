import { ChessGame } from "@/components/ChessGame";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 sm:mb-10">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-200/60">
          Canvas Chess
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
          A clean board for real games
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-400 sm:text-lg">
          Play pass-and-play on one device, or challenge the built-in computer.
          Legal moves, castling, promotion, and checkmate are all handled.
        </p>
      </header>
      <ChessGame />
    </main>
  );
}
