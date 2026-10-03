# Study polish — implementation notes

The combination remains **9–2–4–7**. These changes are local until a release is explicitly requested.

| File | Change |
|---|---|
| `src/engine/CameraRig.ts` | Explicit interruptible camera moves; fit subject bounds to both fields of view and the usable HUD area; bounded transition duration; collision-free waypoint routing; dial feedback and transition diagnostics. |
| `src/engine/CameraSafety.ts` | Solid-mesh bounds, camera containment checks, subject raycast checks, visibility-graph detours and a debug viewpoint audit. Thin decorative planes and non-solid light volumes are excluded from navigation obstacles. |
| `src/engine/Game.ts` | Connects the camera audit and framing, preserves the last viewpoint request, renders the inspection pass, and moves through the corridor before completion. |
| `src/engine/Inspector.ts` | Separate foreground scene/pass with cleared depth, so held objects cannot intersect room furniture; responsive inspection distance. |
| `src/engine/Interaction.ts` | Raycast selection and vertical dragging of physical safe dials. |
| `src/engine/PostFX.ts` | Background-only inspection dimming and depth-of-field; the foreground remains sharp. Low quality retains its cheaper rendering path. |
| `src/levels/level01-the-study/scene.ts` | Door opening in the wall, moved bookshelf and chair, correctly scaled match, larger heat-developed mark, drawer item references and a single painting frame. |
| `src/levels/level01-the-study/polish.ts` | Raised-panel door, hinges, lock, lever, corridor, light/dust effects, hinged cage door, knurled numbered safe wheels, retracting bolts, candle lights/wax glow, rain/moon shader, books and fitted viewpoint subjects. |
| `src/levels/level01-the-study/logic.ts` | Key selection flow, key/handle/door choreography, visible drawer contents, slower heat reveal, physical dial detents and non-spoiler clue descriptions. |
| `src/ui/HUD.ts` | Removes mismatched candle/bird glyphs from accessible dial controls. |
| `src/ui/style.css` | Keeps HTML dial controls as a keyboard-accessible fallback rather than a second visible digit panel. |
| `tests/engine.test.ts` | Adds collision-detour and occlusion regression tests. |

Use `?debug` to run the viewpoint check and expose read-only projection/transition diagnostics. Add `&controls` to show the rendering controls. The safe audit runs with its covering painting removed and the drawer open, matching the state in which those sub-views are available.

Browser screenshots and the size-by-size results are linked in the accompanying review sheet in the workspace outputs directory.

## Validation

- Production TypeScript/Vite build succeeds; 9 engine tests pass.
- Complete browser playthroughs at 1440×900, 1280×720, 1024×1024 and 390×844 verify all puzzle steps, mouse dragging and keyboard dials, inventory reload, completion and solved checkmarks.
- Each run records zero debug viewpoint failures and no console errors. The viewport and document dimensions match (no overflow).
- Rapid viewpoint requests finish on the last requested view. Recorded navigation paths have clear collision segments.
- Initial room entry now displays the fitted overview directly, avoiding a camera transition during shader warm-up.
- Low quality omits SSAO, depth of field, transmission and expensive lamp shadows; the inspection foreground remains sharp. Browser-emulated phone results are not a physical-device benchmark.
- Screenshot review: outputs/locked-room-polish-review.html in the workspace (36 required captures).

Final sustained Low-quality sample: 44.3 FPS in headless Chrome at 1024×1024. Early post-entry samples were around 21–23 FPS while warming; this is not a locked-60-FPS result. Final 1280×720 and 1024×1024 navigation records run about 1.15–1.37 seconds with all segments clear. Earlier reports retain the slow initial-entry measurement, which was subsequently removed by presenting the overview without an entry animation.

Final resize audit additionally passed at 1024×768 (4:3) and 390×844. Rapid interrupted requests reached the last view, with completed moves measuring 1.16–1.18 seconds and zero console/audit failures.
