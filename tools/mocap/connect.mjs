// "Connect the dots with style and weight": a dance's reference poses are the dots;
// the motion between two dots is borrowed from the Mixamo moment whose start looks
// like dot A and whose end looks like dot B, then bent (in the picture plane) so it
// starts exactly on A and ends exactly on B. Depth, timing, follow-through and weight
// shift all come from the real capture.
import fs from 'fs';

const [, , genre, songFile, beatsPerDot = '2', outFile] = process.argv;
const DB = JSON.parse(fs.readFileSync(new URL('./db.json', import.meta.url)));
const KEYS = DB.keys;
const POSES_DIR = '/home/metavitae/HDYD/tools/pose-extraction/poses/' + genre;
const GRIDS = JSON.parse(fs.readFileSync('/home/metavitae/HDYD/assets/data/beat-grids.json'));
const ASPECT = 16 / 9;
const FPS = 30;
const BPD = +beatsPerDot;

// ---------- reference poses -> 2D bone angles (canvas axes: x viewer-right, y up)
// MediaPipe indices; Ribbons "R" = anatomical left (Mixamo Left), as in extract.mjs.
const BONES = {
  sp: ['hipMid', 'shMid'], sl: [12, 11], hl: [24, 23],
  uaR: [11, 13], faR: [13, 15], thR: [23, 25], shR: [25, 27],
  uaL: [12, 14], faL: [14, 16], thL: [24, 26], shL: [26, 28],
};
const MATCH_KEYS = Object.keys(BONES);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function refPose(file) {
  const d = JSON.parse(fs.readFileSync(file));
  const L = d.landmarks;
  const P = (i) => {
    if (i === 'hipMid') return mid(P(23), P(24));
    if (i === 'shMid') return mid(P(11), P(12));
    return { x: L[i].x * ASPECT, y: -L[i].y, v: L[i].visibility ?? 1 };
  };
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
  // Back view (anatomical left on the picture's left): turn to face the viewer.
  const back = P(11).x < P(12).x;
  const torso = Math.hypot(P('shMid').x - P('hipMid').x, P('shMid').y - P('hipMid').y);
  const ang = {}, w = {};
  for (const k of MATCH_KEYS) {
    const [a, b] = BONES[k].map(P);
    let dx = b.x - a.x; const dy = b.y - a.y;
    if (back) dx = -dx;
    ang[k] = Math.atan2(dy, dx);
    // Low visibility or a bone seen end-on (short in the picture) gives an unreliable angle.
    const len = Math.hypot(dx, dy) / (torso || 1);
    w[k] = Math.min(a.v, b.v) < 0.5 ? 0 : Math.min(1, len / 0.35);
  }
  return { label: d.label.replace(genre + '_', ''), back, ang, w, torso };
}

const refs = fs.readdirSync(POSES_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => refPose(POSES_DIR + '/' + f));

// ---------- mocap frames: 2D angle + projected length per bone
function frameAng(f) {
  const ang = {}, len = {};
  KEYS.forEach((k, ki) => {
    const x = f[ki * 3], y = f[ki * 3 + 1];
    ang[k] = Math.atan2(y, x); len[k] = Math.hypot(x, y);
  });
  return { ang, len };
}
for (const c of DB.clips) c.a = c.f.map(frameAng);

function dist(fa, ref) {
  let s = 0, ws = 0;
  for (const k of MATCH_KEYS) {
    const w = ref.w[k] * Math.min(1, fa.len[k] / 0.35);
    if (!w) continue;
    const d = wrap(fa.ang[k] - ref.ang[k]);
    s += w * d * d; ws += w;
  }
  return ws ? s / ws : 9;
}

// ---------- order of the dots: start on the most "neutral" pose, then nearest next
const pd = (a, b) => { let s = 0, ws = 0; for (const k of MATCH_KEYS) { const w = Math.min(a.w[k], b.w[k]); if (!w) continue; const d = wrap(a.ang[k] - b.ang[k]); s += w * d * d; ws += w; } return ws ? s / ws : 9; };
let start = refs.findIndex((r) => /neutral/.test(r.label)); if (start < 0) start = 0;
const order = [start], left = new Set(refs.map((_, i) => i)); left.delete(start);
while (left.size) { const last = order[order.length - 1]; let best = null; for (const i of left) if (best === null || pd(refs[last], refs[i]) < pd(refs[last], refs[best])) best = i; order.push(best); left.delete(best); }

// ---------- song timing
const grid = GRIDS[genre].find((t) => t.file === songFile) || GRIDS[genre][0];
const bpm = grid.bpm, beatSec = 60 / bpm;
const dotSec = BPD * beatSec, dotFrames = dotSec * FPS;

// ---------- pick a mocap moment for each transition A -> B
const LAMBDA_T = 0.15, LAMBDA_V = 0.6;
const vel = (c, i) => KEYS.map((k, ki) => [0, 1].map((j) => c.f[Math.min(c.n - 1, i + 1)][ki * 3 + j] - c.f[i][ki * 3 + j])).flat();
const segs = [];
let prevVel = null;
for (let t = 0; t < order.length; t++) {
  const A = refs[order[t]], B = refs[order[(t + 1) % order.length]];
  let best = null;
  for (const c of DB.clips) {
    const scale = c.fps / FPS;
    const Lmin = Math.round(dotFrames * 0.7 * scale), Lmax = Math.round(dotFrames * 1.45 * scale);
    const dA = c.a.map((fa) => dist(fa, A)), dB = c.a.map((fa) => dist(fa, B));
    for (let i = 0; i + Lmin < c.n; i++) {
      if (dA[i] > 1.2) continue;
      for (let L = Lmin; L <= Lmax && i + L < c.n; L++) {
        let cost = dA[i] + dB[i + L] + LAMBDA_T * Math.abs(Math.log(L / (dotFrames * scale)));
        if (best && cost >= best.cost) continue;
        if (prevVel) { const v = vel(c, i); let s = 0; for (let j = 0; j < v.length; j++) s += (v[j] - prevVel[j]) ** 2; cost += LAMBDA_V * Math.sqrt(s); }
        if (!best || cost < best.cost) best = { cost, clip: c, i, L, dA: dA[i], dB: dB[i + L] };
      }
    }
  }
  segs.push({ A, B, ...best });
  prevVel = vel(best.clip, best.i + best.L - 1);
}

// ---------- bend each moment onto its dots and resample onto the song
const rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const smooth = (u) => u * u * (3 - 2 * u);
// Even-speed turn from direction a to b (unit vectors).
const slerp = (a, b, t) => {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const th = Math.acos(d);
  if (th < 1e-4) return b;
  const s = Math.sin(th) || 1e-6;
  return norm(a.map((x, q) => (Math.sin((1 - t) * th) * x + Math.sin(t * th) * b[q]) / s));
};
const totalBeats = order.length * BPD;
const n = Math.round(totalBeats * beatSec * FPS);
const frames = [], dx = [], dz = [];
const LEG = 0.889; // store hip travel as if every capture dancer had the reference leg length
// Two moments can make the same shape in the picture while a limb points toward the
// viewer in one and away in the other; cutting straight from one to the next would
// flip that limb. So each moment keeps playing XFADE frames past its dot (bend held)
// and fades into the next moment instead of cutting.
const XFADE = 10;
function segFrame(seg, o) {
  const { clip: c, i, L, off0, off1, f0, f1 } = seg;
  const u = (o - f0) / (f1 - f0);
  const src = Math.min(c.n - 1.001, Math.max(0, i + u * L)), j = Math.floor(src), w = src - j, j1 = Math.min(c.n - 1, j + 1);
  const bu = smooth(Math.min(1, Math.max(0, u)));
  const dirs = KEYS.map((k, ki) => {
    const v = norm([0, 1, 2].map((q) => c.f[j][ki * 3 + q] * (1 - w) + c.f[j1][ki * 3 + q] * w));
    return rotZ(v, off0[k] + wrap(off1[k] - off0[k]) * bu);
  });
  const lk = LEG / c.legLen, uc = Math.min(1, Math.max(0, u));
  const hx = (c.hx[j] * (1 - w) + c.hx[j1] * w - c.hx[i] - uc * (c.hx[i + L] - c.hx[i])) * lk;
  const hz = (c.hz[j] * (1 - w) + c.hz[j1] * w - c.hz[i] - uc * (c.hz[i + L] - c.hz[i])) * lk;
  return { dirs, hx, hz };
}
for (let s = 0; s < segs.length; s++) {
  const seg = segs[s], { clip: c, i, L, A, B } = seg;
  seg.off0 = {}; seg.off1 = {};
  for (const k of KEYS) {
    const bend = (fa, ref) => (MATCH_KEYS.includes(k) && ref.w[k] ? wrap(ref.ang[k] - fa.ang[k]) : 0);
    seg.off0[k] = bend(c.a[i], A); seg.off1[k] = bend(c.a[i + L], B);
  }
  seg.f0 = Math.round(s * dotFrames); seg.f1 = Math.round((s + 1) * dotFrames);
}
for (let s = 0; s < segs.length; s++) {
  const seg = segs[s], prev = segs[(s - 1 + segs.length) % segs.length];
  for (let o = seg.f0; o < seg.f1 && o < n; o++) {
    let { dirs, hx, hz } = segFrame(seg, o);
    const k = o - seg.f0;
    if (k < XFADE) {
      // previous moment, carried on past its dot (its clock continued)
      const po = prev.f1 + k;
      const p = segFrame(prev, po);
      const t = smooth((k + 1) / (XFADE + 1));
      dirs = dirs.map((d, b) => slerp(p.dirs[b], d, t));
      hx = p.hx * (1 - t) + hx * t; hz = p.hz * (1 - t) + hz * t;
    }
    frames.push(dirs.flatMap((d) => d.map((x) => Math.round(x * 100))));
    dx.push(Math.round(hx * 100)); dz.push(Math.round(hz * 100));
  }
}
while (frames.length < n) { frames.push(frames[frames.length - 1]); dx.push(dx[dx.length - 1]); dz.push(dz[dz.length - 1]); }

// ---------- report
console.error(`${genre}: ${refs.length} dots, ${BPD} beats each, ${bpm} bpm, ${totalBeats} beats, ${n} frames`);
console.error('back-view poses turned to face front:', refs.filter((r) => r.back).map((r) => r.label).join(', ') || 'none');
segs.forEach((s, k) => console.error(`${String(k + 1).padStart(2)} ${s.A.label.padEnd(40)} -> ${s.B.label.padEnd(40)} from ${s.clip.id} ${s.clip.name} @${(s.i / s.clip.fps).toFixed(2)}s len ${(s.L / s.clip.fps).toFixed(2)}s  fitA ${s.dA.toFixed(2)} fitB ${s.dB.toFixed(2)}`));

const clip = { id: genre + '-connected', name: genre[0].toUpperCase() + genre.slice(1) + ' (connected dots)', forPlayers: true, fps: FPS, n, legLen: LEG, beats: totalBeats, firstDip: 0, clipBpm: bpm, confidence: null, stretch: 1, f: frames, dx, dz,
  dots: segs.map((s, k) => ({ beat: k * BPD, pose: s.A.label, from: `${s.clip.id} ${s.clip.name}` })) };
fs.writeFileSync(outFile, JSON.stringify({ clip, bpm, beatSec, grid: grid.file, firstBeatSec: grid.beatTimesSec[0] }));
