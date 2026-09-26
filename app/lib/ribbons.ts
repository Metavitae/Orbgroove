// Ribbons, the Orbgroove mascot, dancing each genre that has real motion
// capture (Mixamo clips, beat-fitted on the "Orbgroove Dancer 3D" canvas).
// Each entry is a pre-rendered portrait video (Ribbons + the genre's song,
// two song loops long) and its limb timeline: 15 fps, 8 limbs as seen on
// screen ([dx, dy] unit vector x100 with y up, plus on-screen length in px),
// Ribbons' R = screen right. Rendered by tools/mocap/render/.

export type RibbonsTimeline = {
  genre: string;
  fps: number;
  bpm: number;
  seconds: number;
  limbs: string[];
  moves: { name: string; atSec: number }[];
  frames: [number, number, number][][];
};

type RibbonsDance = { label: string; video: number; timeline: RibbonsTimeline };

export const RIBBONS: Record<string, RibbonsDance> = {
  "hip-hop": {
    label: "Hip-Hop",
    video: require("../../assets/videos/ribbons/ribbons-hiphop.mp4"),
    timeline: require("../../assets/data/ribbons/timeline-hiphop.json"),
  },
  salsa: {
    label: "Salsa",
    video: require("../../assets/videos/ribbons/ribbons-salsa.mp4"),
    timeline: require("../../assets/data/ribbons/timeline-salsa.json"),
  },
  samba: {
    label: "Samba",
    video: require("../../assets/videos/ribbons/ribbons-samba.mp4"),
    timeline: require("../../assets/data/ribbons/timeline-samba.json"),
  },
  house: {
    label: "House",
    video: require("../../assets/videos/ribbons/ribbons-house.mp4"),
    timeline: require("../../assets/data/ribbons/timeline-house.json"),
  },
};

export function ribbonsForGenre(genre: string | null): RibbonsDance | null {
  return genre ? RIBBONS[genre] ?? null : null;
}
