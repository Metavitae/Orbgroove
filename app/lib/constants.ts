// Recording window length in seconds. Shared by recording.tsx (drives the
// on-screen countdown and when capture/music stop) and reveal.tsx's
// computeBeatAlignmentScore (filters beat times to this same window) --
// they must never drift apart, or rhythm scoring silently misaligns against
// the actual capture window.
export const RECORDING_WINDOW_SEC = 30;
