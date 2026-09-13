# PLAY — Aravind’s Game Gallery

PLAY is the parent website. Each game is an independently developed child, registered under games/.

```text
Play/
├── site/                         # 3D gallery and game library
│   ├── index.html
│   └── assets/
│       ├── css/
│       ├── js/
│       ├── vendor/
│       └── previews/silent-stairs/
├── games/
│   └── Silent-Stairs/game.json    # Child settings and source repository
├── scripts/build-games.mjs       # Builds every registered child
├── tests/                        # Publishing checks
├── docs/adding-games.md
├── .github/workflows/publish.yml
├── package.json
└── CNAME
```

The actual game source remains in [Silent-Stairs](https://github.com/aravindmarri/Silent-Stairs). PLAY downloads it when publishing and places the built game at [play.aravindmarri.com/Silent-Stairs/](https://play.aravindmarri.com/Silent-Stairs/). Other children follow the same /Game-Id/ address pattern.

## Develop locally

Use Node.js 22 or newer, npm, and Git. PLAY itself has no npm dependencies.

```sh
npm run validate
npm test
npm run build
```

Serve the generated _site/ directory with a local HTTP server. Do not open HTML directly from disk. Temporary game checkouts and npm downloads live in .cache/; neither .cache/ nor _site/ belongs in Git.

## Add games

Add one games/Your-Game/game.json registration. The shared builder supports Vite and static HTML projects, generates the library catalog, and keeps each child’s assets under its own URL. See [the add-game guide](docs/adding-games.md).

The library supports search and Show more games in batches of 24. The homepage loads only its featured 3D preview, so adding games does not load all their runtimes. The current cabinet is a curated Silent Stairs preview; setting featured in a registration does not automatically create a new 3D preview.

## Publish

Changes pushed to PLAY/main publish automatically. After pushing changes only to a child repository, open PLAY → Actions → Publish Play and games → Run workflow. Game updates remain manual; there is no scheduled polling or cross-repository trigger.

All registered games must build successfully before a complete website is deployed. The current live site stays available if a build fails.

Three.js and its license are in site/assets/vendor/. Google Fonts supplies Orbitron and Space Grotesk with system fallbacks.
