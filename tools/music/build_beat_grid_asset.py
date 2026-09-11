"""
Consolidates per-track .beatgrid.json files (produced by extract_beat_grid.py)
into assets/data/beat-grids.json, keyed by genre folder name under
assets/audio/, matching each entry to the mp3 filename in that folder so
app/lib/danceMusic.ts's static require() map can look up the right grid.

Usage:
  cd tools/music && source venv/bin/activate
  python3 build_beat_grid_asset.py <dir-of-beatgrid-json-files>
"""
import argparse
import json
import os

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "audio")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "data", "beat-grids.json")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("beatgrid_dir")
    args = parser.parse_args()

    # Map mp3 basename (no ext) -> genre, from what's actually in assets/audio/.
    file_to_genre = {}
    for genre in os.listdir(AUDIO_DIR):
        genre_dir = os.path.join(AUDIO_DIR, genre)
        if not os.path.isdir(genre_dir):
            continue
        for fname in os.listdir(genre_dir):
            if fname.endswith(".mp3"):
                file_to_genre[os.path.splitext(fname)[0]] = (genre, fname)

    out = {}
    for fname in sorted(os.listdir(args.beatgrid_dir)):
        if not fname.endswith(".beatgrid.json"):
            continue
        stem = fname[: -len(".beatgrid.json")]
        if stem not in file_to_genre:
            print(f"WARNING: {stem} has a beat grid but no matching mp3 in assets/audio/ -- skipping")
            continue
        genre, mp3_filename = file_to_genre[stem]
        with open(os.path.join(args.beatgrid_dir, fname)) as f:
            grid = json.load(f)
        out.setdefault(genre, []).append({
            "file": mp3_filename,
            "bpm": grid["bpm"],
            "durationSec": grid["durationSec"],
            "beatTimesSec": grid["beatTimesSec"],
        })

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    total = sum(len(v) for v in out.values())
    print(f"Wrote {OUT_PATH}")
    for genre, tracks in out.items():
        print(f"  {genre}: {len(tracks)} tracks")
    print(f"Total: {total} tracks across {len(out)} genres")


if __name__ == "__main__":
    main()
