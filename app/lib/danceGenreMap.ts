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
  "House": "house",
  "K-pop choreography": "kpop",
  "Afrobeats": "afrobeats",
  "Riverdance": "riverdance",
  "Halay": "halay",
  "Bharatanatyam": "bharatanatyam",
  "Cossack dance": "cossack-dance",
  "Belly dance": "belly-dance",
  "Chinese fan dance": "chinese-fan-dance",
  "Cumbia": "cumbia",
  "Gumboot dance": "gumboot-dance",
  "Hora": "hora",
  "Marinera": "marinera",
  "Polka": "polka",
  "Schuhplattler": "schuhplattler",
  "Sirtaki": "sirtaki",
  "Tinikling": "tinikling",
  "Saman": "saman",
  "Thai classical dance": "thai-classical-dance",
  "Bon Odori": "bon-odori",
  "Folklórico (Jarabe Tapatío)": "folklorico",
  "Cancan": "cancan",
};

export function genreForDance(dance: string): string | null {
  return DANCE_GENRE_MAP[dance] ?? null;
}
