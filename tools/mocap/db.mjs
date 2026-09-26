// Every standing Mixamo clip -> Ribbons' 12 bone directions per frame (30 fps) + hip travel.
import fs from 'fs';
import { extract } from './extract.mjs';
const M = '/mnt/chromeos/shared/GoogleDrive/MyDrive/One_ring/03_Projects/Orbgroove/Art/Mocap';
const KEYS = ['sp', 'nk', 'sl', 'hl', 'uaR', 'faR', 'thR', 'shR', 'uaL', 'faL', 'thL', 'shL'];
const rows = fs.readFileSync(M + '/manifest.tsv', 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const out = [];
for (const [file, genre, name, type] of rows) {
  if (type !== 'standing') continue;
  const r = extract(`${M}/${file}.fbx`);
  out.push({ id: file, genre, name, fps: r.fps, n: r.n, legLen: r.legLen,
    f: r.frames.map((fr) => KEYS.flatMap((k) => fr[k])), hx: r.hx, hy: r.hy, hz: r.hz });
  console.error(file, genre, name, r.n);
}
fs.writeFileSync('db.json', JSON.stringify({ keys: KEYS, clips: out }));
console.error('clips', out.length, (fs.statSync('db.json').size / 1e6).toFixed(1), 'MB');
