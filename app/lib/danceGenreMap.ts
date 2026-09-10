// Maps a Country's `dance` string (app/round.tsx) to a pose-reference genre
// key in assets/data/pose-reference.json. Countries not listed here have no
// reference pose data yet -- see tools/pose-extraction/poses/ for what's
// covered and the Drive Log for what a future sourcing wave could add.
export const DANCE_GENRE_MAP: Record<string, string> = {
  "Samba": "samba",
  "Flamenco": "flamenco",
  "Tango": "tango",
  "Salsa": "salsa",
  "Merengue": "merengue",
  "Hula": "hula",
  "Dancehall": "dancehall",
  "Waltz": "waltz",
  "Hip-Hop/Breaking": "hip-hop",
  "K-pop choreography": "kpop",
  "Afrobeats": "afrobeats",
};

export function genreForDance(dance: string): string | null {
  return DANCE_GENRE_MAP[dance] ?? null;
}
