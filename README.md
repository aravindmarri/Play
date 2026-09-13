# Play — Aravind’s Game Gallery

A neon 3D arcade featuring [Silent Stairs](https://play.aravindmarri.com/Silent-Stairs/).

## Features

- A full-screen Three.js arcade with an upright game cabinet, neon lights, and a floor grid.
- Scroll-driven camera movement and directional cursor parallax.
- A preview using the actual Silent Stairs staircase and ghost.
- Responsive game details, Play links, and a reduced-motion option.

## Run locally

Serve this folder with a local HTTP server, for example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. No build step is required. JavaScript modules need an HTTP server; opening `index.html` directly from disk will not work.

## Files

- `index.html` — page content and game links
- `style.css` — layout, colors, typography, and mobile styles
- `app.js` — arcade scene and camera interactions
- `geometry.js`, `ghost.js`, `align.js` — preview components from [Silent Stairs](https://github.com/aravindmarri/Silent-Stairs)
- `three.module.js`, `three.core.js` — Three.js runtime
- `THREE-LICENSE.txt` — Three.js license

The arcade screen is a preview. Play opens the full game in a new tab.

Google Fonts supplies Orbitron and Space Grotesk; system fonts are used as fallbacks.

## Publishing games

The Publish Play and games workflow builds the latest main branch of aravindmarri/Silent-Stairs and publishes it under /Silent-Stairs/ alongside the gallery. It runs when this repository changes, or manually from the Actions tab. After updating the separate game repository, run this workflow to publish the latest game here.
