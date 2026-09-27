# Eight Ball

A standalone, static browser game for the PLAY gallery. Three.js renders the table and balls as 3D meshes; the local vendor files keep the game self-contained, with no package install or external runtime requests.

## Play

- Move the pointer over the cloth to preview your aim.
- Move to aim, then press anywhere on the table to lock that direction. Pull backward to set power and release to shoot. Sideways movement does not change your aim; pushing forward reduces power to 0%. Release at zero or press Esc to aim again.
- Press **Esc** while pulling to cancel the shot.
- Aim at a cushion to preview the first reflected bank path.
- Use **Hint** once per turn to mark legal target balls. The marks stay visible until the shot starts.
- Use **Hit point** to open the animated cue-ball selector and choose the exact contact point. Select **Change** to choose another spot.
- Use the arrow keys to adjust aim. **Shoot** or Space fires with the last pull strength, or a moderate default before the first pull.
- Pick **Two players** for pass-and-play, or **Solo practice** to play against a simple computer opponent.
- After a foul, drag the cue ball to a clear spot and click to place it.
- Hover over a ball to identify its number and group. Numbered textures spin with each ball as it rolls.

The rack follows familiar 8-ball rules: solids and stripes are assigned by the first legally pocketed ball after the break; clear your group, then pocket the 8. Scratches, contacting the wrong group first, and failing to pocket a ball or send one to a cushion give the other player ball in hand. Pocketing the 8 early loses the rack. An 8-ball sunk on the break is returned to the table.

This folder is the complete game project, including the locally bundled Three.js runtime, and can be published as a static child game. In PLAY, register it as `build.type: "static"` with `build.output: "."` once its separate GitHub repository exists.

