// Build one routine file per genre: every STANDING clip (floor moves need rig work first),
// each fitted to its song's beat. Directions stored as ints x100 (36 per frame), hip travel in cm.
import fs from 'fs';
import { extract } from './extract.mjs';
import { fitBeats } from './beats.mjs';
const MOCAP = process.env.MOCAP_DIR || '/mnt/chromeos/shared/GoogleDrive/MyDrive/One_ring/03_Projects/Orbgroove/Art/Mocap';
const SONGS = {
  hiphop: { label: 'Hip-Hop', track: 'sub_clair-hip-hop', beats: 40, loopSec: 22.208, audio: '/_blob/6f8ee8fcaabe10716bc78544868a2d91' },
  salsa: { label: 'Salsa', track: 'salsa-old-school-salsa-02', beats: 32, loopSec: 19.19, audio: '/_blob/f60a962a4396176b4f33852b2e7cfa5c' },
  samba: { label: 'Samba', track: 'samba-latin-carnival-in-salvador', beats: 32, loopSec: 16.042, audio: '/_blob/deb6526784faf516b0c2f569b7af1b53' },
  house: { label: 'House', track: 'prettyjohn1-house', beats: 32, loopSec: 15.987, audio: '/_blob/dbb7a1aa8c8fea9d2803f579bf2848b1' },
};
const KEYS = ['sp', 'nk', 'sl', 'hl', 'uaR', 'faR', 'thR', 'shR', 'uaL', 'faL', 'thL', 'shL'];
const rows = fs.readFileSync(MOCAP + '/manifest.tsv', 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
// `node build.mjs hiphop` = standing routine; `node build.mjs hiphop floor` = the floor-move set (own file).
const genre = process.argv[2], wantType = process.argv[3] || 'standing', song = SONGS[genre];
const outName = wantType === 'floor' ? genre + '-floor' : genre;
song.bpm = +(song.beats * 60 / song.loopSec).toFixed(2);
const clips = [], skipped = [];
const MAX_TEMPO_CHANGE = 0.3; // a clip needing more than +/-30% speed change to hit the beat looks wrong: left out
for (const [file, g, name, type, , forPlayers] of rows) {
  if (g !== genre || type !== wantType) continue;
  const r = extract(`${MOCAP}/${file}.fbx`);
  // Floor moves: hips go to the floor, so there is no bounce to read -- keep natural speed, start on a beat.
  const songBeat = 60 / song.bpm, nb = Math.max(1, Math.round(r.n / r.fps / songBeat));
  const fit = wantType === 'floor'
    ? { beats: nb, firstDip: 0, clipBpm: null, confidence: null, stretch: +((nb * songBeat) / (r.n / r.fps)).toFixed(3) }
    : fitBeats(r.hy, r.fps, song.bpm);
  if (wantType === 'standing' && Math.abs(Math.log(fit.stretch)) > Math.log(1 + MAX_TEMPO_CHANGE)) { skipped.push({ id: file, name, stretch: fit.stretch }); console.error(file, name.padEnd(42), 'SKIPPED off-tempo', fit.stretch); continue; }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const mx = mean(r.hx), mz = mean(r.hz);
  clips.push({
    id: file, name, forPlayers: (forPlayers || 'yes') === 'yes', fps: r.fps, n: r.n, legLen: r.legLen, ...fit,
    f: r.frames.map((fr) => KEYS.flatMap((k) => fr[k].map((v) => Math.round(v * 100)))),
    dx: r.hx.map((v) => Math.round((v - mx) * 100)), dz: r.hz.map((v) => Math.round((v - mz) * 100)),
  });
  console.error(file, name.padEnd(42), JSON.stringify(fit));
}
const out = `mocap-${outName}.json`;
fs.writeFileSync(out, JSON.stringify({ genre: outName, floor: wantType === 'floor', ...song, keys: KEYS, clips, skipped }));
console.error('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB,', clips.length, 'clips');
