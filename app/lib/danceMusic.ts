import beatGridData from "../../assets/data/beat-grids.json";

export type BeatGrid = { file: string; bpm: number; durationSec: number; beatTimesSec: number[] };

const BEAT_GRIDS = beatGridData as Record<string, BeatGrid[]>;

// Metro needs static require() calls (no dynamic paths), so every bundled
// track gets one explicit entry here. When more genres get music, add their
// require()s here AND rerun tools/music/build_beat_grid_asset.py so the
// matching beat grid exists.
const TRACK_SOURCES: Record<string, number> = {
  "prettyjohn1-house.mp3": require("../../assets/audio/house/prettyjohn1-house.mp3"),
  "aurectheme-house-music.mp3": require("../../assets/audio/house/aurectheme-house-music.mp3"),
  "prettyjohn1-hip-hop-beat.mp3": require("../../assets/audio/hip-hop/prettyjohn1-hip-hop-beat.mp3"),
  "bombinsound-hip-hop-beat.mp3": require("../../assets/audio/hip-hop/bombinsound-hip-hop-beat.mp3"),
  "sub_clair-hip-hop.mp3": require("../../assets/audio/hip-hop/sub_clair-hip-hop.mp3"),
  "bombinsound-start-me-up.mp3": require("../../assets/audio/hip-hop/bombinsound-start-me-up.mp3"),
  "kulakovka-afrobeat.mp3": require("../../assets/audio/afrobeats/kulakovka-afrobeat.mp3"),
  "paoloargento-afrobeat-x-jazz.mp3": require("../../assets/audio/afrobeats/paoloargento-afrobeat-x-jazz.mp3"),
  "samba-latin-brazilian-samba-553714.mp3": require("../../assets/audio/samba/samba-latin-brazilian-samba-553714.mp3"),
  "samba-latin-carnival-in-salvador-486923.mp3": require("../../assets/audio/samba/samba-latin-carnival-in-salvador-486923.mp3"),
  "samba-latin-carnival-samba-energetic-brazilian-party-beat-404793.mp3": require("../../assets/audio/samba/samba-latin-carnival-samba-energetic-brazilian-party-beat-404793.mp3"),
  "samba-latin-siles-calendar-july-16-479764.mp3": require("../../assets/audio/samba/samba-latin-siles-calendar-july-16-479764.mp3"),
  "flamenco-flamenco-fire-537445.mp3": require("../../assets/audio/flamenco/flamenco-flamenco-fire-537445.mp3"),
  "flamenco-flamenco-guitar-536691.mp3": require("../../assets/audio/flamenco/flamenco-flamenco-guitar-536691.mp3"),
  "flamenco-spanish-flamenco-536690.mp3": require("../../assets/audio/flamenco/flamenco-spanish-flamenco-536690.mp3"),
  "folk-flamenco-148421.mp3": require("../../assets/audio/flamenco/folk-flamenco-148421.mp3"),
  "tango-abel-happy-background-tango-for-video-stories-short-music-379506.mp3": require("../../assets/audio/tango/tango-abel-happy-background-tango-for-video-stories-short-music-379506.mp3"),
  "latin-salsa-cubana-01-522536.mp3": require("../../assets/audio/salsa/latin-salsa-cubana-01-522536.mp3"),
  "latin-salsa-estilo-new-york-02-522541.mp3": require("../../assets/audio/salsa/latin-salsa-estilo-new-york-02-522541.mp3"),
  "salsa-old-school-salsa-02-499571.mp3": require("../../assets/audio/salsa/salsa-old-school-salsa-02-499571.mp3"),
  "salsa-old-school-salsa-04-499573.mp3": require("../../assets/audio/salsa/salsa-old-school-salsa-04-499573.mp3"),
  "dance-atlas-dominican-republic-562349.mp3": require("../../assets/audio/merengue/dance-atlas-dominican-republic-562349.mp3"),
  "folk-merengue-350311.mp3": require("../../assets/audio/merengue/folk-merengue-350311.mp3"),
  "samba-latin-latino-x-merengue-x-salsa-piano-x-brass-heartache-292196.mp3": require("../../assets/audio/merengue/samba-latin-latino-x-merengue-x-salsa-piano-x-brass-heartache-292196.mp3"),
  "samba-latin-merengue-buena-vibra-229923.mp3": require("../../assets/audio/merengue/samba-latin-merengue-buena-vibra-229923.mp3"),
  "island-atlas-hawaii-559410.mp3": require("../../assets/audio/hula/island-atlas-hawaii-559410.mp3"),
  "island-hula-breeze-400786.mp3": require("../../assets/audio/hula/island-hula-breeze-400786.mp3"),
  "island-island-of-happiness-194709.mp3": require("../../assets/audio/hula/island-island-of-happiness-194709.mp3"),
  "island-windward-style-154342.mp3": require("../../assets/audio/hula/island-windward-style-154342.mp3"),
  "afrobeat-afro-dancehall-reggaeton-beat-instrumental-iii-188950.mp3": require("../../assets/audio/dancehall/afrobeat-afro-dancehall-reggaeton-beat-instrumental-iii-188950.mp3"),
  "afrobeat-afrobeat-x-african-x-dancehall-x-reggae-type-beat-dope-192363.mp3": require("../../assets/audio/dancehall/afrobeat-afrobeat-x-african-x-dancehall-x-reggae-type-beat-dope-192363.mp3"),
  "afrobeat-afrobeat-x-afro-type-beat-x-dancehall-beat-instrumental-162906.mp3": require("../../assets/audio/dancehall/afrobeat-afrobeat-x-afro-type-beat-x-dancehall-beat-instrumental-162906.mp3"),
  "afrobeat-afrobeat-x-afro-type-beat-x-dancehall-beat-instrumental-lover-194140.mp3": require("../../assets/audio/dancehall/afrobeat-afrobeat-x-afro-type-beat-x-dancehall-beat-instrumental-lover-194140.mp3"),
  "classical-piano-itx27s-waltz-219010.mp3": require("../../assets/audio/waltz/classical-piano-itx27s-waltz-219010.mp3"),
  "main-title-royal-majestic-waltz-music-414666.mp3": require("../../assets/audio/waltz/main-title-royal-majestic-waltz-music-414666.mp3"),
  "folk-balalaika-waltz-4917.mp3": require("../../assets/audio/waltz/folk-balalaika-waltz-4917.mp3"),
  "instrumental-princess-waltz-551681.mp3": require("../../assets/audio/waltz/instrumental-princess-waltz-551681.mp3"),
  "beats-trap-banger-blackpink-x-kpop-molecule-292168.mp3": require("../../assets/audio/kpop/beats-trap-banger-blackpink-x-kpop-molecule-292168.mp3"),
  "dance-kpop-128609.mp3": require("../../assets/audio/kpop/dance-kpop-128609.mp3"),
  "electro-k-pop-girl-3-469756.mp3": require("../../assets/audio/kpop/electro-k-pop-girl-3-469756.mp3"),
  "electronic-kpop-x-blackpink-trap-beat-x-pop-my-mercedes-494708.mp3": require("../../assets/audio/kpop/electronic-kpop-x-blackpink-trap-beat-x-pop-my-mercedes-494708.mp3"),
  "afrobeat-cumbiaton-rompiendo-bocina-espinal-records-remix-139379.mp3": require("../../assets/audio/cumbia/afrobeat-cumbiaton-rompiendo-bocina-espinal-records-remix-139379.mp3"),
  "electronic-midnight-in-the-concrete-571664.mp3": require("../../assets/audio/cumbia/electronic-midnight-in-the-concrete-571664.mp3"),
  "folk-cumbia-tropical-the-sound-breeze-that-will-make-you-dance-371810.mp3": require("../../assets/audio/cumbia/folk-cumbia-tropical-the-sound-breeze-that-will-make-you-dance-371810.mp3"),
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
