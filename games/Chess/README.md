# Chess

Chess is a self-contained browser game included in the PLAY parent repository. It uses Three.js from the parent site's shared vendor folder and needs no backend or install step.

## Run locally

Serve the assembled `_site/` directory over HTTP and open `/Chess/`. The game uses Three.js, Web Audio, and a module Web Worker; opening its source file directly with `file://` will not work.

## Build and publish

The parent site's `games/Chess/game.json` registration tells the PLAY builder to copy `games/Chess/source/` to the `/Chess/` route. Changes are published together with the parent site.

## Controls

- Click a piece, then a highlighted square to move.
- Drag the empty board area to orbit; scroll to zoom.
- Use **Flip View** or **Top View** for alternate camera angles. Top View is a square, orthographic view.
- Press **H** or use the eye button for Focus mode; the choice is remembered in this browser.
- Single-player difficulty selects the search depth of the local AI worker.

The rules module handles legal moves, check, castling, en passant, promotion, repetition, the fifty-move rule, and insufficient material.
