// On the POCO M6 Pro the pose model's landmarks come back rotated 180°
// (head below hips) even though the camera preview on screen is upright --
// the frame processor sees the sensor image in the opposite landscape
// orientation. Found 2026-09-26: YOUR MOVES drew the player upside down and
// real dancing scored ~5% MOVES against upright reference poses.
//
// Fix it on the data instead of chasing device orientation: if the shoulders
// are below the hips, rotate the whole pose 180° back. Safe because players
// never do handstands or head spins (see Decision Log, Sep 25), so a real
// upright dancer never trips it.
type Lm = { x: number; y: number };

const SHOULDERS = [11, 12];
const HIPS = [23, 24];

export function uprightPose<T extends Lm>(pose: T[]): T[] {
  if (!pose || pose.length < 25) return pose;
  const mean = (idx: number[]) => idx.reduce((s, i) => s + pose[i].y, 0) / idx.length;
  if (mean(SHOULDERS) <= mean(HIPS)) return pose;
  return pose.map((p) => ({ ...p, x: 1 - p.x, y: 1 - p.y }));
}
