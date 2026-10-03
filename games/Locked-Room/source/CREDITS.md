# The Locked Room — asset and license record

All room geometry, illustrations, maps and sounds were created procedurally for this project. No commercial game assets, models, textures or recordings are used.

| Asset | Source / author | License | Use |
|---|---|---|---|
| `public/assets/brown_photostudio_01_1k.hdr` | [Brown Photostudio 01 — Sergej Majboroda / Poly Haven](https://polyhaven.com/a/brown_photostudio_01) | CC0 1.0 | Dim image-based lighting, filtered with PMREM |
| Room architecture, furniture, brass mechanisms, safe, keys, bird, clock, curtains | Procedural geometry in `src/levels/level01-the-study/scene.ts` | Original project work | Level 1 |
| Walnut grain, metal brushing, cloth weave, stone/plaster, roughness, tangent normals, edge AO, rug and contact shadows | Procedural canvas textures in `materials.ts` / `scene.ts` | Original project work | PBR surfaces and static contact shading |
| Moon painting, constellation, handwriting, diaries, inscriptions and favicon | Original procedural/vector artwork | Original project work | Narrative clues; no third-party images |
| Rain, room tone, wax crackle, music-box melody, bells and mechanism sounds | Original Web Audio synthesis in `Audio.ts` | Original project work | Positional audio; no recordings |
| 1200×630 social preview | Screenshot of this project's rendered study | Original project work | Open Graph and Twitter preview |
| Cormorant Garamond, Latin variable WOFF2 | Christian Thalmann / [Google Fonts](https://fonts.google.com/specimen/Cormorant+Garamond) | SIL Open Font License 1.1, included as `cormorantgaramond-OFL.txt` | Requested serif typography, self-hosted |
| DM Sans, Latin variable WOFF2 | Colophon Foundry / [Google Fonts](https://fonts.google.com/specimen/DM+Sans) | SIL Open Font License 1.1, included as `dmsans-OFL.txt` | UI typography, self-hosted |

The CC0-only rule is followed for sourced scene assets. The explicitly requested typefaces are open-source fonts under OFL, rather than CC0; their license notices travel with the download.

Software licenses: Three.js (MIT), Vite (MIT), TypeScript (Apache-2.0), camera-controls (MIT), lil-gui (MIT), postprocessing (Zlib). Draco and Basis decoder binaries are supplied by Three.js and retain their upstream Apache-2.0 notices. No external model is shipped, so Draco geometry or KTX2 texture compression is not applicable to Level 1. The glTF/Draco/KTX2 loader is ready for future CC0 models; only the HDRI, fonts and game code are fetched during play.
