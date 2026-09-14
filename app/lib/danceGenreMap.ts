// Maps a round's genre name (app/round.tsx) to a pose-reference genre key in
// assets/data/pose-reference.json.
export const DANCE_GENRE_MAP: Record<string, string> = {
  "Samba": "samba",
  "Flamenco": "flamenco",
  "Tango": "tango",
  "Salsa": "salsa",
  "Merengue": "merengue",
  "Hula": "hula",
  "Dancehall": "dancehall",
  "Waltz": "waltz",
  "Hip-Hop": "hip-hop",
  "House": "house",
  "K-pop": "kpop",
  "Afrobeats": "afrobeats",
  "Cumbia": "cumbia",
};

export function genreForDance(dance: string): string | null {
  return DANCE_GENRE_MAP[dance] ?? null;
}
