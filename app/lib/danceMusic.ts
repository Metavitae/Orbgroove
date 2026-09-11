import beatGridData from "../../assets/data/beat-grids.json";

export type BeatGrid = { file: string; bpm: number; durationSec: number; beatTimesSec: number[] };

const BEAT_GRIDS = beatGridData as Record<string, BeatGrid[]>;

// Metro needs static require() calls (no dynamic paths), so every bundled
// track gets one explicit entry here. Only 3 genres have any music sourced
// so far -- see the Drive Log "Genre music sourcing session" and
// tools/music/README (if one ever gets written) for the rest of the plan.
// When more genres get music, add their require()s here AND rerun
// tools/music/build_beat_grid_asset.py so the matching beat grid exists.
const TRACK_SOURCES: Record<string, number> = {
  "prettyjohn1-house.mp3": require("../../assets/audio/house/prettyjohn1-house.mp3"),
  "aurectheme-house-music.mp3": require("../../assets/audio/house/aurectheme-house-music.mp3"),
  "prettyjohn1-hip-hop-beat.mp3": require("../../assets/audio/hip-hop/prettyjohn1-hip-hop-beat.mp3"),
  "bombinsound-hip-hop-beat.mp3": require("../../assets/audio/hip-hop/bombinsound-hip-hop-beat.mp3"),
  "sub_clair-hip-hop.mp3": require("../../assets/audio/hip-hop/sub_clair-hip-hop.mp3"),
  "bombinsound-start-me-up.mp3": require("../../assets/audio/hip-hop/bombinsound-start-me-up.mp3"),
  "kulakovka-afrobeat.mp3": require("../../assets/audio/afrobeats/kulakovka-afrobeat.mp3"),
  "paoloargento-afrobeat-x-jazz.mp3": require("../../assets/audio/afrobeats/paoloargento-afrobeat-x-jazz.mp3"),
};

export type DanceTrack = { source: number; grid: BeatGrid };

// Genres with any sourced music at all (subset of danceGenreMap's 11 --
// see that file for the full country->genre coverage).
export function hasMusicForGenre(genre: string): boolean {
  return (BEAT_GRIDS[genre]?.length ?? 0) > 0;
}

// Picks one track for the round, deterministically per round rather than
// re-randomizing on every re-render -- caller should call this once and
// hold the result (e.g. in a ref/state), same pattern as capturedFrames.
export function pickTrackForGenre(genre: string): DanceTrack | null {
  const tracks = BEAT_GRIDS[genre];
  if (!tracks || tracks.length === 0) return null;
  const grid = tracks[Math.floor(Math.random() * tracks.length)];
  const source = TRACK_SOURCES[grid.file];
  if (source === undefined) return null; // beat-grids.json and TRACK_SOURCES out of sync
  return { source, grid };
}
