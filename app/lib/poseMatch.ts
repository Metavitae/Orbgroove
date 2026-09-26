// Live "are you moving like Ribbons?" match for the lesson screen.
//
// Compares the player's 8 visible limbs (upper arms, forearms, thighs,
// shins) with Ribbons' limbs at the same moment of the video, as 2D
// directions on screen. Deliberately forgiving, because this is a practice
// meter, not the round score:
// - Mirror OR same-side copying both count (whichever matches better), since
//   people follow a teacher both ways and the front camera's mirroring
//   varies by device.
// - The player may lag Ribbons a little: the best match in a short window
//   behind the current moment counts.
// - Limbs Ribbons shows end-on (foreshortened) or the camera can't see
//   count less, and so do limbs just hanging down (standing still would
//   otherwise "match" most of a routine).
import type { RibbonsTimeline } from "./ribbons";

type Lm = { x: number; y: number; visibility?: number };

// MediaPipe pose indices: [shoulder, elbow, wrist, hip, knee, ankle] per side.
const LEFT = { sh: 11, el: 13, wr: 15, hip: 23, kn: 25, an: 27 };
const RIGHT = { sh: 12, el: 14, wr: 16, hip: 24, kn: 26, an: 28 };
const MIN_VIS = 0.4;
const LAG_WINDOW_SEC = 0.5;
const STILL = Array.from({ length: 8 }, () => ({ x: 0, y: -1 }));

// Player limbs in the timeline's order (uaR, faR, uaL, faL, thR, shR, thL, shL),
// `screenRight` = the landmark side that should line up with Ribbons' R.
function playerLimbs(pose: Lm[], screenRight: typeof LEFT, screenLeft: typeof LEFT, flipX: boolean) {
  const seg = (a: number, b: number) => {
    const p = pose[a], q = pose[b];
    if (!p || !q) return null;
    const vis = Math.min(p.visibility ?? 1, q.visibility ?? 1);
    if (vis < MIN_VIS) return null;
    let dx = q.x - p.x;
    const dy = -(q.y - p.y);
    if (flipX) dx = -dx;
    const len = Math.hypot(dx, dy);
    return len > 1e-4 ? { x: dx / len, y: dy / len } : null;
  };
  const r = screenRight, l = screenLeft;
  return [seg(r.sh, r.el), seg(r.el, r.wr), seg(l.sh, l.el), seg(l.el, l.wr), seg(r.hip, r.kn), seg(r.kn, r.an), seg(l.hip, l.kn), seg(l.kn, l.an)];
}

// Per-limb max on-screen length across the whole video, for foreshortening weights.
const maxLenCache = new WeakMap<RibbonsTimeline, number[]>();
function maxLens(t: RibbonsTimeline) {
  let m = maxLenCache.get(t);
  if (!m) {
    m = t.limbs.map((_, i) => Math.max(1, ...t.frames.map((f) => f[i][2])));
    maxLenCache.set(t, m);
  }
  return m;
}

function frameScore(t: RibbonsTimeline, frame: [number, number, number][], limbs: ({ x: number; y: number } | null)[]) {
  const ml = maxLens(t);
  let sum = 0, wsum = 0;
  frame.forEach(([dx, dy, len], i) => {
    const p = limbs[i];
    if (!p) return;
    // A limb hanging straight down says little (standing still does that too):
    // weight each limb by how far Ribbons has moved it away from hanging down.
    const awayFromDown = (1 + dy / 100) / 2; // 0 = pointing down, 1 = pointing up
    const w = Math.max(0.25, len / ml[i]) * (0.08 + awayFromDown);
    sum += w * ((dx / 100) * p.x + (dy / 100) * p.y);
    wsum += w;
  });
  return wsum > 0 ? { cos: sum / wsum, seen: wsum } : null;
}

// 0..1 match at video time `sec`, or null if too little of the player is visible.
export function matchAt(t: RibbonsTimeline, pose: Lm[], sec: number): number | null {
  if (!pose || pose.length < 29) return null;
  const variants = [
    playerLimbs(pose, RIGHT, LEFT, true), // mirror copy (front camera image un-mirrored)
    playerLimbs(pose, LEFT, RIGHT, false), // same-side copy
  ];
  if (variants.every((v) => v.filter(Boolean).length < 4)) return null;
  const i1 = Math.min(t.frames.length - 1, Math.max(0, Math.round(sec * t.fps)));
  const i0 = Math.max(0, i1 - Math.round(LAG_WINDOW_SEC * t.fps));
  let best = -Infinity;
  for (let i = i0; i <= i1; i++) {
    // Yardstick: how well simply standing still (all limbs down) would match
    // this moment. Only doing better than that counts, so a player who stands
    // still scores ~0 however much of the routine is arms-down.
    const still = frameScore(t, t.frames[i], STILL);
    for (const v of variants) {
      const s = frameScore(t, t.frames[i], v);
      if (!s || !still) continue;
      const rel = (s.cos - still.cos) / Math.max(0.15, 1 - still.cos);
      if (rel > best) best = rel;
    }
  }
  if (best === -Infinity) return null;
  // rel 0.1 (barely better than standing still) -> 0, rel 0.8 -> 1
  return Math.max(0, Math.min(1, (best - 0.1) / 0.7));
}

// Which of Ribbons' moves is playing at `sec`.
export function moveAt(t: RibbonsTimeline, sec: number): string {
  let name = t.moves[0]?.name ?? "";
  for (const m of t.moves) if (m.atSec <= sec) name = m.name;
  return name;
}
