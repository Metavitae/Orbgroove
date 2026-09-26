# Mixamo mocap → Ribbons routines

Source clips: Drive `Orbgroove/Art/Mocap/NNN.fbx` + `manifest.tsv` (98 Mixamo clips; `for_players` column
marks head spins/handstands as Ribbons-only).

- `extract.mjs` — samples one FBX (longest take) at 30 fps into Ribbons' 12 bone directions + hip travel.
  Convention matches the canvas: dancer faces +z, Ribbons R = Mixamo *Left*, spine = hip-midpoint → shoulder-midpoint.
  Verified to reproduce the v27 canvas's MOCAP_HIPHOP (clip 021) exactly.
- `beats.mjs` — fits a clip to a song beat from its vertical hip bounce (autocorrelation); low-confidence
  bounces keep natural speed.
- `build.mjs <hiphop|salsa|samba|house> [floor]` — writes `mocap-<genre>.json` (standing clips; clips needing
  >30% speed change are listed under `skipped`). Upload the JSON as a canvas asset and point `GENRES` in
  the canvas's Main.dc.html at the new `/_blob/…` url.
  `build.mjs hiphop floor` writes `mocap-hiphop-floor.json`: the 31 floor moves at natural speed (no bounce to read),
  each clip tagged `forPlayers` from the manifest; the canvas plays them with its floor rig (full-body orientation,
  grounded by the lowest body part).
- `dur.mjs` — prints each FBX's longest animation length.

Setup: `npm i three@0.169` in the folder you run from (FBXLoader runs headless in node).
