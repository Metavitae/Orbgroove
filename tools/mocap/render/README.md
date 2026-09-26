# Ribbons video renderer

Renders Ribbons (the canvas rig) dancing a genre routine, frame by frame with exact timing, to a portrait
540x960 MP4 with the genre's song, plus a 15 fps limb timeline for the lesson screen's match meter
(app/lib/poseMatch.ts). Output goes to app assets: `assets/videos/ribbons/ribbons-<genre>.mp4`,
`assets/data/ribbons/timeline-<genre>.json`.

Needs in this folder (not committed, regenerate):
- `component.js` — the canvas's `<script type="text/x-dc">` body (Component class) prefixed with a
  `class DCLogic { constructor(p){this.props=p||{};this.state={}} setState(s,cb){Object.assign(this.state,s);cb&&cb()} }` stub.
- `three.module.js` from three@0.169, `mocap-<genre>.json` from `../build.mjs`, `song-<genre>.mp4` (the canvas's
  beat-cut song loop assets).
- playwright-core + the Playwright headless Chromium (`~/.cache/ms-playwright`); `render.mjs` points at the local copies.

Run `./renderall.sh` (2 song loops per dance; ~30 min for all four on the Chromebook).
