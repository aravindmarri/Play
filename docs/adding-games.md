# Adding a child game to PLAY

Keep each game in its own public GitHub repository. PLAY is the parent gallery and publishing project.

## Register a game

Create `games/Your-Game/game.json`. Copy the fields from [Silent Stairs](../games/Silent-Stairs/game.json), then change the id, title, details, repository, and build settings. Set `featured` to false.

The folder and id must match exactly. The id becomes the public address: `https://play.aravindmarri.com/Your-Game/`. Keep it stable once shared. Use letters, digits, hyphens, or underscores. IDs must be unique, ignoring case, and cannot match a parent asset folder.

## Build settings

- **Vite games:** use `"build": { "type": "vite", "output": "dist" }`. The repository needs a committed package-lock.json and a build script accepting `--base=/Your-Game/`. PLAY runs npm ci and the build script with that base.
- **Static HTML games:** use `"build": { "type": "static", "output": "public" }`, or output `.` for files at the game repository root. Use relative asset links such as `./assets/game.js`. No install command runs.

The output folder must contain index.html. A game requiring its own server or database needs a separate hosting design. SPA games should use hash routing for GitHub Pages.

## Publish

Run `npm run validate`, `npm test`, and `npm run build`. Serve `_site/` over local HTTP to check the gallery and child URL. Push the registration to PLAY/main to publish. Every registered game is assembled by the same workflow; no new workflow is required.

For later changes made only in a child's repository, manually run **Publish Play and games** from PLAY's Actions tab. Child pushes do not automatically publish PLAY.

The library reads games.json generated from the registrations. Search and Show more games support a growing collection without loading every game's runtime into the homepage. The Silent Stairs cabinet preview is a separate curated feature in site/assets/previews/silent-stairs; the featured flag alone does not replace it.

Game repositories own gameplay and dependencies. PLAY owns navigation and publication. Temporary checkouts live in .cache/games; the complete published website lives in _site. Both folders are ignored by Git. A failed game build stops deployment and leaves the current live site available.
