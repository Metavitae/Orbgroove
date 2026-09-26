import { View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import type { CapturedFrame } from "../context/GameContext";

// Replays the player's own captured pose landmarks as a looping stick figure
// (Reveal's YOUR MOVES card). Built from plain rotated Views, no drawing
// library. Only frames where the torso was visible are used.

const BONES: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24], // torso
  [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [23, 25], [25, 27], [24, 26], [26, 28], // legs
];
const TORSO = [11, 12, 23, 24];
const MIN_VIS = 0.4;
// MediaPipe x/y are normalized separately to the camera frame's width and
// height; the round records a 1280x720 landscape frame.
const FRAME_ASPECT = 16 / 9;

export function StickFigureReplay({ frames, width, height, color }: { frames: CapturedFrame[]; width: number; height: number; color: string }) {
  const usable = useMemo(
    () => frames.filter((f) => f.pose.length >= 29 && TORSO.every((i) => (f.pose[i].visibility ?? 1) >= MIN_VIS)),
    [frames]
  );

  // One fixed box around every visible joint of the whole take, so the figure
  // moves and travels inside the card instead of being re-centred each frame.
  const fit = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const f of usable) for (const [a, b] of BONES) for (const i of [a, b]) {
      const p = f.pose[i];
      if ((p.visibility ?? 1) < MIN_VIS) continue;
      x0 = Math.min(x0, p.x * FRAME_ASPECT); x1 = Math.max(x1, p.x * FRAME_ASPECT);
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    if (!isFinite(x0)) return null;
    const scale = Math.min(width / Math.max(1e-3, x1 - x0), height / Math.max(1e-3, y1 - y0)) * 0.9;
    return { scale, ox: (width - (x1 - x0) * scale) / 2 - x0 * scale, oy: (height - (y1 - y0) * scale) / 2 - y0 * scale };
  }, [usable, width, height]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (usable.length < 2) return;
    const t0 = usable[0].timestampMs, span = usable[usable.length - 1].timestampMs - t0 || 1;
    const start = Date.now();
    const timer = setInterval(() => {
      const t = t0 + ((Date.now() - start) % span);
      let i = 0;
      while (i < usable.length - 1 && usable[i + 1].timestampMs <= t) i++;
      setIdx(i);
    }, 50);
    return () => clearInterval(timer);
  }, [usable]);

  if (!fit || usable.length === 0) return null;
  const pose = usable[Math.min(idx, usable.length - 1)].pose;
  const pt = (i: number) => ({ x: pose[i].x * FRAME_ASPECT * fit.scale + fit.ox, y: pose[i].y * fit.scale + fit.oy });
  const thick = Math.max(3, Math.min(width, height) * 0.03);

  return (
    <View style={{ width, height }}>
      {BONES.map(([a, b]) => {
        if ((pose[a].visibility ?? 1) < MIN_VIS || (pose[b].visibility ?? 1) < MIN_VIS) return null;
        const p = pt(a), q = pt(b);
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const ang = Math.atan2(q.y - p.y, q.x - p.x);
        return (
          <View
            key={`${a}-${b}`}
            style={{
              position: "absolute",
              left: (p.x + q.x) / 2 - len / 2,
              top: (p.y + q.y) / 2 - thick / 2,
              width: len,
              height: thick,
              borderRadius: thick / 2,
              backgroundColor: color,
              transform: [{ rotate: `${ang}rad` }],
            }}
          />
        );
      })}
      {(pose[0].visibility ?? 1) >= MIN_VIS && (() => {
        const h = pt(0), r = thick * 2.6;
        return <View style={{ position: "absolute", left: h.x - r, top: h.y - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: thick * 0.8, borderColor: color }} />;
      })()}
    </View>
  );
}
