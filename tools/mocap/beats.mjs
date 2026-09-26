// Fit a Mixamo clip to a song's beat, from the clip's own vertical hip bounce.
// 1. Bounce period P = the strongest autocorrelation peak of hip height (drift removed), 35-260 per minute.
// 2. P is mapped onto the song beat at 1/4x to 4x, whichever needs the least stretch.
// 3. beats = whole number of those beats in the clip; the clip is stretched to exactly that many song beats.
// 4. firstDip = lowest hip point within the first bounce, so the downbeat lands on a real dip.
export function fitBeats(hy, fps, songBpm) {
  const n = hy.length, w = Math.round(fps * 0.75);
  const x = hy.map((v, i) => { let s = 0, c = 0; for (let j = i - w; j <= i + w; j++) if (j >= 0 && j < n) { s += hy[j]; c++; } return v - s / c; });
  const ac = (lag) => { let s = 0, a = 0, b = 0; for (let i = 0; i + lag < n; i++) { s += x[i] * x[i + lag]; a += x[i] * x[i]; b += x[i + lag] * x[i + lag]; } return s / Math.sqrt(a * b || 1); };
  const lo = Math.max(2, Math.floor(fps * 60 / 260)), hi = Math.min(n - 2, Math.round(fps * 60 / 35));
  const r = []; for (let l = lo - 1; l <= hi + 1; l++) r[l] = ac(l);
  let best = null;
  for (let l = lo; l <= hi; l++) if (r[l] >= r[l - 1] && r[l] >= r[l + 1] && (!best || r[l] > best.r)) best = { lag: l, r: r[l] };
  const songBeat = 60 / songBpm, dur = n / fps;
  if (!best || best.r < 0.3) {                      // no trustworthy bounce: keep natural speed, fit whole song beats
    const beats = Math.max(1, Math.round(dur / songBeat));
    return { beats, firstDip: 0, clipBpm: null, confidence: best ? +best.r.toFixed(2) : 0, stretch: +((beats * songBeat) / dur).toFixed(3) };
  }
  const P = best.lag / fps;
  const k = [0.25, 0.5, 1, 2, 4].reduce((a, b) => (Math.abs(Math.log(songBeat / (P * b))) < Math.abs(Math.log(songBeat / (P * a))) ? b : a));
  const beats = Math.max(1, Math.round(dur / (P * k)));
  let firstDip = 0; for (let i = 1; i < best.lag; i++) if (x[i] < x[firstDip]) firstDip = i;
  return { beats, firstDip, clipBpm: +(60 / (P * k)).toFixed(1), confidence: +best.r.toFixed(2), stretch: +((beats * songBeat) / dur).toFixed(3) };
}
