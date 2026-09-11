"""
Extracts a beat grid (estimated tempo + individual beat timestamps) from an
audio file, for use in Orbgroove's rhythm scoring (app/lib/danceScoring.ts
compares a dancer's movement timing against these beat timestamps instead of
a plain energy/oscillation proxy).

Run once per sourced track; output feeds assets/data/beat-grids.json via
build_beat_grid_asset.py (run that after adding/removing tracks).

Usage:
  cd tools/music && source venv/bin/activate
  python3 extract_beat_grid.py <audio-file> [--out out.json]
"""
import argparse
import json
import os
import sys

import librosa


def extract(path: str) -> dict:
    y, sr = librosa.load(path, sr=None, mono=True)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
    duration = librosa.get_duration(y=y, sr=sr)
    tempo_val = float(tempo[0]) if hasattr(tempo, "__len__") else float(tempo)
    return {
        "bpm": round(tempo_val, 1),
        "durationSec": round(float(duration), 2),
        "beatTimesSec": [round(t, 3) for t in beat_times],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_file")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    result = extract(args.audio_file)
    result["file"] = os.path.basename(args.audio_file)

    out_path = args.out or (os.path.splitext(args.audio_file)[0] + ".beatgrid.json")
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"{result['file']}: {result['bpm']} BPM, {len(result['beatTimesSec'])} beats, {result['durationSec']}s")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
