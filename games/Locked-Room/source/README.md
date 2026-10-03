# The Locked Room

An original, procedural 3D escape-room game for Aravind's Game Gallery. Level 1 is **The Study**; Level 2 is a locked, non-playable teaser. Public base: `/Locked-Room/`.

## Run

```sh
npm ci
npm run dev -- --port 4183
npm run build
npm run preview -- --port 4184
npm test
```

Use `/Locked-Room/?level=1`. Invalid or unavailable levels fall back to 1. Append `&debug` for the rendering panel. Debug UI is never shown otherwise. Builds are type-checked.

## Controls

Click a room object or use the labelled viewpoint strip. Drag/swipe the room to look around. Back, Escape or right-click returns from inspection, then to the overview. Drag an inspected object to turn it; scroll or pinch to zoom. Select an inventory item and use the matching contextual action, or drag it onto the scene object. The viewpoint strip is also a touch-friendly alternative to small 3D hotspots.

Safe dials: drag vertically, tap the arrows, or focus a dial and use arrow keys. H reveals one hint tier. Pause includes resume, restart, levels, audio, captions, quality, invert look and reduced motion.

## Level 1 solution

Desk → look underneath → release latch → drawer → matchbox → strike → candle → light → inspect letter → hold near candle (II) → lamp off → ceiling (9) → cage → open → wind and count seven chimes/bobs → key board (empty hook 4) → straighten painting → slide aside → safe 9247 → turn handle → iron key → oak door. The letter reveals gradually from its actual distance to the flame; the safe can also be opened by a player who already knows its code. The clock and diaries are narrative, not hidden prerequisites.

## Engine boundaries

`src/engine/`: renderer factory, post-processing, asset loading, camera rig, raycast/touch input, inspector, inventory, event-driven puzzle graph, hint progression, positional sound synthesis, defensive saves, quality adaptation and tweening. `src/ui/`: accessible HTML controls and responsive styling. `src/levels/level01-the-study/`: scene, materials, declarative level definition, hints and stateful interactions.

Level controllers own mechanism behavior; the engine owns rendering, camera, inventory, saving, hints, UI routing and completion. State changes persist inventory, puzzle flags, elapsed active time, hint depth and dial values. Pause/background tabs do not count toward elapsed time. All storage access is guarded; a blocked or corrupt store falls back to a playable in-memory session. Saves use `aravind.locked-room.v1`.

## Add Level 2

1. Add `src/levels/level02-the-clock-tower/` with a definition and controller following the study's files. Export the required contract: `id`, `title`, `subtitle`, `assets`, `build(scene)`, `puzzleGraph`, `hints`, `onComplete`.
2. Return a `BuiltRoom` from `build`: keyed scene objects, named camera views (including `title` and `room`), raycast hotspots, bloom selection, and update/quality callbacks. Room-specific state stays in the controller. If a future level does not use heat, return a no-op heat uniform.
3. Define graph steps as `{ id, requirements: string[], unlock: string }`. Completing actions calls `game.puzzle.set(flag)`. Each step gets three hint strings. The first unresolved step drives hints. Add new inventory descriptors to `engine/Inventory.ts`.
4. Implement controller `action`, `view`, `tick`, `restore` (and optional `drag`). Restore **all** mechanisms from persisted flags. Use `game.motion.to` for cancel-safe UI-gated mechanisms; `game.finish()` stores completion and shows results.
5. Add the definition/controller to the registry in `src/levels/index.ts`. The engine's `SaveSystem.unlocked(id)` permits level 2 only after 1 is solved. The coming-soon card, chapter labels and next-room button update from the registry.
6. Add browser playthrough coverage and a graph test. Verify restart, reload, out-of-order clues, muted/caption play and both viewport sizes.

### Future external assets

Only CC0 Poly Haven or ambientCG models/textures may be added; list each exact asset URL in CREDITS.md. Use glTF Transform's `draco` transform on geometry and `uastc` or `etc1s` for KTX2 textures (KTX-Software must be installed). The included `Assets.gltf` loader has DRACOLoader and KTX2Loader attached; current Three.js bundles decoder URLs. Prefer 1K textures and keep the production directory below 25 MB. Level 1 has no downloaded model to compress.

## Rendering and performance

WebGL2, ACES tone mapping, sRGB output, low-intensity CC0 PMREM environment, physical materials, VSM lamp shadows, rect-area moonlight, static edge/contact AO plus post SSAO, selected bloom, inspection-only DOF, SMAA, fine grain, vignette, shader rain/flames/rays and 300 instanced dust motes. Low disables SSAO, DOF, bloom, dynamic shadows, glass transmission and rays, and reduces dust to 80. Automatic quality starts from viewport/GPU limits/CPU count and lowers its tier after measured low frame rate; a manual choice is stable. Pixel ratio is capped per tier. Reduced motion removes title drift/grain and shortens transitions.

The renderer factory is the backend boundary for a future WebGPU implementation. No incomplete WebGPU path is shipped. Three.js r186 removed PCFSoftShadowMap, so this project uses supported VSM shadows. A narrowly scoped PMREM adapter snaps sub-float-precision trigonometric residues in r186's GGX shader to zero to avoid ANGLE constant-folding warnings; normal shader error reporting stays enabled. Re-check that adapter when upgrading Three.js.

## Gallery integration

`../game.json` registers `/Locked-Room/`. The parent builder supports `build.directory` for nested Vite games and assembles this project's `dist` beside the other games. The gallery's searchable library picks up the registration automatically. Run the normal parent build after committing both the registration and source. Publishing stays manual in this work session; no deployment is initiated by the game.
