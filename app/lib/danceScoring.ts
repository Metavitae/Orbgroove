// Compares a player's captured pose frames (live MediaPipe landmarks from
// recording.tsx) against the bundled reference poses for the round's dance
// (assets/data/pose-reference.json, sourced via tools/pose-extraction/).
//
// This is a first working version, not a tuned model: the similarity metric
// and the energy/oscillation constants below are reasonable heuristics, not
// values fit to real dancer data. Expect to retune the *_TARGET constants
// once real playtests show scores skewing too generous or too harsh.

export type RawLandmark = { x: number; y: number; z: number; visibility?: number };
export type Pose = RawLandmark[];

// Standard MediaPipe pose-landmarker indices (33 points), matches both the
// live capture order and tools/pose-extraction/extract_pose.py's LANDMARK_NAMES.
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

type NormalizedPoint = { x: number; y: number; w: number };
type NormalizedPose = NormalizedPoint[];

const MIN_VISIBILITY = 0.3;
// Minimum torso span (shoulder-to-hip midpoint distance, in the frame's
// normalized 0-1 coordinates) below which a pose is too small/unreliable to
// normalize meaningfully -- e.g. the dancer is at the frame's edge.
const MIN_TORSO_SPAN = 0.03;

function visOf(lm: RawLandmark): number {
  return lm.visibility ?? 1;
}

// Centers on the hip midpoint and scales by torso span, so pose comparison
// is invariant to the dancer's distance from camera and position in frame.
function normalizePose(pose: Pose): NormalizedPose | null {
  if (pose.length < 33) return null;
  const ls = pose[LEFT_SHOULDER], rs = pose[RIGHT_SHOULDER];
  const lh = pose[LEFT_HIP], rh = pose[RIGHT_HIP];
  if (!ls || !rs || !lh || !rh) return null;
  if (visOf(ls) < MIN_VISIBILITY || visOf(rs) < MIN_VISIBILITY || visOf(lh) < MIN_VISIBILITY || visOf(rh) < MIN_VISIBILITY) {
    return null;
  }
  const hipX = (lh.x + rh.x) / 2, hipY = (lh.y + rh.y) / 2;
  const shoulderX = (ls.x + rs.x) / 2, shoulderY = (ls.y + rs.y) / 2;
  const torsoSpan = Math.hypot(shoulderX - hipX, shoulderY - hipY);
  if (torsoSpan < MIN_TORSO_SPAN) return null;

  return pose.map(lm => ({
    x: (lm.x - hipX) / torsoSpan,
    y: (lm.y - hipY) / torsoSpan,
    w: visOf(lm),
  }));
}

// Visibility-weighted mean landmark distance, converted to a 0-1 similarity
// via exponential falloff. DISTANCE_SCALE is the heuristic here -- a mean
// per-landmark distance of one full DISTANCE_SCALE (in torso-span units)
// maps to ~37% similarity (1/e).
const DISTANCE_SCALE = 0.55;

function poseSimilarity(a: NormalizedPose, b: NormalizedPose): number {
  let weightedDist = 0;
  let totalWeight = 0;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i], pb = b[i];
    if (!pa || !pb) continue;
    const w = Math.min(pa.w, pb.w);
    if (w < MIN_VISIBILITY) continue;
    weightedDist += w * Math.hypot(pa.x - pb.x, pa.y - pb.y);
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  const meanDist = weightedDist / totalWeight;
  return Math.exp(-meanDist / DISTANCE_SCALE);
}

function normalizeAll(frames: Pose[]): NormalizedPose[] {
  const out: NormalizedPose[] = [];
  for (const f of frames) {
    const n = normalizePose(f);
    if (n) out.push(n);
  }
  return out;
}

// "Did you hit these moves at some point?" -- for each reference pose,
// find the player's closest matching moment anywhere in the take, then
// average across all reference poses. Order-agnostic on purpose: reference
// poses are isolated keyframes from tutorials, not a sequence to replicate
// in order, and a casual party game shouldn't punish dancing the moves in
// a different order than the tutorial happened to show them.
export function computeMovesScore(capturedFrames: Pose[], referencePoses: Pose[]): number | null {
  if (referencePoses.length === 0) return null;
  const normCaptured = normalizeAll(capturedFrames);
  if (normCaptured.length === 0) return null;

  const normReference = normalizeAll(referencePoses);
  if (normReference.length === 0) return null;

  let total = 0;
  for (const ref of normReference) {
    let best = 0;
    for (const captured of normCaptured) {
      const sim = poseSimilarity(ref, captured);
      if (sim > best) best = sim;
    }
    total += best;
  }
  return total / normReference.length;
}

// Movement-energy + oscillation proxy for "danced with rhythm," not true
// beat-alignment (we don't have the track's beat grid here). Two signals,
// averaged: (1) mean frame-to-frame landmark displacement rate, rewarding
// sustained motion over standing still; (2) sign-change rate of hip-center
// x-position, rewarding repeated side-to-side motion over one-off gestures.
const ENERGY_TARGET_PER_SEC = 0.35; // torso-spans of mean displacement per second at "full score"
const OSCILLATION_TARGET_PER_SEC = 1.2; // hip direction-changes per second at "full score"

export function computeRhythmScore(capturedFrames: { pose: Pose; timestampMs: number }[]): number | null {
  const withNormalized = capturedFrames
    .map(f => ({ pose: normalizePose(f.pose), timestampMs: f.timestampMs }))
    .filter((f): f is { pose: NormalizedPose; timestampMs: number } => f.pose !== null)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (withNormalized.length < 4) return null;

  const durationSec = (withNormalized[withNormalized.length - 1].timestampMs - withNormalized[0].timestampMs) / 1000;
  if (durationSec <= 0) return null;

  let totalDisplacement = 0;
  let displacementSamples = 0;
  const hipXs: number[] = [];

  for (let i = 0; i < withNormalized.length; i++) {
    const pose = withNormalized[i].pose;
    const lh = pose[LEFT_HIP], rh = pose[RIGHT_HIP];
    hipXs.push((lh.x + rh.x) / 2);

    if (i > 0) {
      const prev = withNormalized[i - 1].pose;
      let frameDisp = 0, count = 0;
      for (let j = 0; j < pose.length; j++) {
        if (pose[j].w < MIN_VISIBILITY || prev[j].w < MIN_VISIBILITY) continue;
        frameDisp += Math.hypot(pose[j].x - prev[j].x, pose[j].y - prev[j].y);
        count++;
      }
      if (count > 0) {
        totalDisplacement += frameDisp / count;
        displacementSamples++;
      }
    }
  }

  const energyRate = displacementSamples > 0 ? totalDisplacement / durationSec : 0;

  let signChanges = 0;
  for (let i = 2; i < hipXs.length; i++) {
    const d1 = hipXs[i - 1] - hipXs[i - 2];
    const d2 = hipXs[i] - hipXs[i - 1];
    if (d1 !== 0 && d2 !== 0 && Math.sign(d1) !== Math.sign(d2)) signChanges++;
  }
  const oscillationRate = signChanges / durationSec;

  const energyScore = Math.min(1, energyRate / ENERGY_TARGET_PER_SEC);
  const oscillationScore = Math.min(1, oscillationRate / OSCILLATION_TARGET_PER_SEC);
  return energyScore * 0.5 + oscillationScore * 0.5;
}
