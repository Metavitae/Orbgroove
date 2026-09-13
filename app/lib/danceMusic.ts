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
  "celtic-traditional-celtic-music-01-481020.mp3": require("../../assets/audio/riverdance/celtic-traditional-celtic-music-01-481020.mp3"),
  "celtic-celtic-591333.mp3": require("../../assets/audio/riverdance/celtic-celtic-591333.mp3"),
  "adventure-pirate-celtic-528827.mp3": require("../../assets/audio/riverdance/adventure-pirate-celtic-528827.mp3"),
  "celtic-celtic-melody-b7-506185.mp3": require("../../assets/audio/riverdance/celtic-celtic-melody-b7-506185.mp3"),
  "folk-classical-turkish-music-203983.mp3": require("../../assets/audio/halay/folk-classical-turkish-music-203983.mp3"),
  "upbeat-turkish-turkey-istanbul-music-400476.mp3": require("../../assets/audio/halay/upbeat-turkish-turkey-istanbul-music-400476.mp3"),
  "folk-ember-yildiz-turkish-folk-412841.mp3": require("../../assets/audio/halay/folk-ember-yildiz-turkish-folk-412841.mp3"),
  "india-indian-440089.mp3": require("../../assets/audio/bharatanatyam/india-indian-440089.mp3"),
  "acoustic-group-russian-life-88762.mp3": require("../../assets/audio/cossack-dance/acoustic-group-russian-life-88762.mp3"),
  "folk-russian-fest-108669.mp3": require("../../assets/audio/cossack-dance/folk-russian-fest-108669.mp3"),
  "folk-russian-folk-353879.mp3": require("../../assets/audio/cossack-dance/folk-russian-folk-353879.mp3"),
  "arabic-atlas-egypt-559404.mp3": require("../../assets/audio/belly-dance/arabic-atlas-egypt-559404.mp3"),
  "arabic-dabke-fusion-theme-588122.mp3": require("../../assets/audio/belly-dance/arabic-dabke-fusion-theme-588122.mp3"),
  "arabic-melodic-dabke-fusion-theme-588123.mp3": require("../../assets/audio/belly-dance/arabic-melodic-dabke-fusion-theme-588123.mp3"),
  "china-by-the-quiet-water-30-sec-edit-traditional-chinese-style-music-383314.mp3": require("../../assets/audio/chinese-fan-dance/china-by-the-quiet-water-30-sec-edit-traditional-chinese-style-music-383314.mp3"),
  "afrobeat-cumbiaton-rompiendo-bocina-espinal-records-remix-139379.mp3": require("../../assets/audio/cumbia/afrobeat-cumbiaton-rompiendo-bocina-espinal-records-remix-139379.mp3"),
  "electronic-midnight-in-the-concrete-571664.mp3": require("../../assets/audio/cumbia/electronic-midnight-in-the-concrete-571664.mp3"),
  "adventure-african-background-music-350105.mp3": require("../../assets/audio/gumboot-dance/adventure-african-background-music-350105.mp3"),
  "afrobeat-inspiring-african-music-579509.mp3": require("../../assets/audio/gumboot-dance/afrobeat-inspiring-african-music-579509.mp3"),
  "cartoons-africa-african-music-349503.mp3": require("../../assets/audio/gumboot-dance/cartoons-africa-african-music-349503.mp3"),
  "acoustic-group-israel-music-jewish-hebrew-klezmer-hanukkah-background-intro-theme-284416.mp3": require("../../assets/audio/hora/acoustic-group-israel-music-jewish-hebrew-klezmer-hanukkah-background-intro-theme-284416.mp3"),
  "cartoons-hanukkah-piano-jewish-comedy-30-sec-534938.mp3": require("../../assets/audio/hora/cartoons-hanukkah-piano-jewish-comedy-30-sec-534938.mp3"),
  "cartoons-klezmer-guitar-comedy-background-ending-30-sec-534924.mp3": require("../../assets/audio/hora/cartoons-klezmer-guitar-comedy-background-ending-30-sec-534924.mp3"),
  "cartoons-oseh-shalom-bimromav-gypsy-upbeat-klezmer-30-sec-534966.mp3": require("../../assets/audio/hora/cartoons-oseh-shalom-bimromav-gypsy-upbeat-klezmer-30-sec-534966.mp3"),
  "acoustic-group-andean-breeze-342605.mp3": require("../../assets/audio/marinera/acoustic-group-andean-breeze-342605.mp3"),
  "folk-andean-echoes-332667.mp3": require("../../assets/audio/marinera/folk-andean-echoes-332667.mp3"),
  "folk-el-condor-pasa-peruvian-folk-song-bossa-nova-style-3547.mp3": require("../../assets/audio/marinera/folk-el-condor-pasa-peruvian-folk-song-bossa-nova-style-3547.mp3"),
  "folk-aggressive-polka-instrumental-welding-271615.mp3": require("../../assets/audio/polka/folk-aggressive-polka-instrumental-welding-271615.mp3"),
  "polka-eat-your-polka-fast-polka-instrumental-393929.mp3": require("../../assets/audio/polka/polka-eat-your-polka-fast-polka-instrumental-393929.mp3"),
  "polka-fun-polka-song-for-dancing-221380.mp3": require("../../assets/audio/polka/polka-fun-polka-song-for-dancing-221380.mp3"),
  "comedy-happy-german-bavarian-accordion-569637.mp3": require("../../assets/audio/schuhplattler/comedy-happy-german-bavarian-accordion-569637.mp3"),
  "folk-bavarian-beer-fest-316616.mp3": require("../../assets/audio/schuhplattler/folk-bavarian-beer-fest-316616.mp3"),
  "folk-bavarian-beer-fest-317856.mp3": require("../../assets/audio/schuhplattler/folk-bavarian-beer-fest-317856.mp3"),
  "acoustic-group-greek-greece-athens-music-400919.mp3": require("../../assets/audio/sirtaki/acoustic-group-greek-greece-athens-music-400919.mp3"),
  "acoustic-group-mediterranean-joy-335025.mp3": require("../../assets/audio/sirtaki/acoustic-group-mediterranean-joy-335025.mp3"),
  "folk-aegean-indie-folk-pop-bouzouki-amp-nylon-guitar-sparkle-422971.mp3": require("../../assets/audio/sirtaki/folk-aegean-indie-folk-pop-bouzouki-amp-nylon-guitar-sparkle-422971.mp3"),
  "acoustic-group-folk-474052.mp3": require("../../assets/audio/tinikling/acoustic-group-folk-474052.mp3"),
  "folk-acoustic-folk-573464.mp3": require("../../assets/audio/tinikling/folk-acoustic-folk-573464.mp3"),
  "folk-acoustic-folk-580577.mp3": require("../../assets/audio/tinikling/folk-acoustic-folk-580577.mp3"),
  "folk-yonder-yoga-indonesian-folk-582106.mp3": require("../../assets/audio/saman/folk-yonder-yoga-indonesian-folk-582106.mp3"),
  "pop-ku-peluk-bayangmu-hybrid-gamelan-amp-keroncong-582364.mp3": require("../../assets/audio/saman/pop-ku-peluk-bayangmu-hybrid-gamelan-amp-keroncong-582364.mp3"),
  "ambient-thai-thailand-bali-background-music-501998.mp3": require("../../assets/audio/thai-classical-dance/ambient-thai-thailand-bali-background-music-501998.mp3"),
  "meditationspiritual-atlas-thailand-562340.mp3": require("../../assets/audio/thai-classical-dance/meditationspiritual-atlas-thailand-562340.mp3"),
  "ambient-japan-japanese-music-502006.mp3": require("../../assets/audio/bon-odori/ambient-japan-japanese-music-502006.mp3"),
  "lofi-japan-japanese-music-560316.mp3": require("../../assets/audio/bon-odori/lofi-japan-japanese-music-560316.mp3"),
  "electronic-mexican-mexico-music-434632.mp3": require("../../assets/audio/folklorico/electronic-mexican-mexico-music-434632.mp3"),
  "world-turkey-turkish-istanbul-music-433541.mp3": require("../../assets/audio/halay/world-turkey-turkish-istanbul-music-433541.mp3"),
  "india-indian-classical-music-598117.mp3": require("../../assets/audio/bharatanatyam/india-indian-classical-music-598117.mp3"),
  "india-indian-classical-raga-537491.mp3": require("../../assets/audio/bharatanatyam/india-indian-classical-raga-537491.mp3"),
  "china-breezes-through-the-golden-bamboo-full-version-576160.mp3": require("../../assets/audio/chinese-fan-dance/china-breezes-through-the-golden-bamboo-full-version-576160.mp3"),
  "china-ascent-to-the-azure-cloud-full-version-576167.mp3": require("../../assets/audio/chinese-fan-dance/china-ascent-to-the-azure-cloud-full-version-576167.mp3"),
  "folk-cumbia-tropical-the-sound-breeze-that-will-make-you-dance-371810.mp3": require("../../assets/audio/cumbia/folk-cumbia-tropical-the-sound-breeze-that-will-make-you-dance-371810.mp3"),
  "latin-peru-485341.mp3": require("../../assets/audio/marinera/latin-peru-485341.mp3"),
  "metal-saint-leo-aggressive-polka-rock-instrumental-391310.mp3": require("../../assets/audio/polka/metal-saint-leo-aggressive-polka-rock-instrumental-391310.mp3"),
  "folk-cort-ranchera-dm-244661.mp3": require("../../assets/audio/folklorico/folk-cort-ranchera-dm-244661.mp3"),
  "upbeat-cancan-15542.mp3": require("../../assets/audio/cancan/upbeat-cancan-15542.mp3"),
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
