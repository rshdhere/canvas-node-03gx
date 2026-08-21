# Canvas Chess

Play chess in the browser — local pass-and-play or vs computer.

## Getting started

```bash
bun install && bun run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Health check: `GET /health` → `{ "ok": true }`.

## Features

- Full legal-move generation (castling, en passant, promotion)
- Check / checkmate / stalemate detection
- Move history and captured pieces
- Local two-player and vs-computer modes
