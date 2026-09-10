"""
Consolidates every per-pose landmark JSON under tools/pose-extraction/poses/
into a single bundled asset the app imports directly: assets/data/pose-reference.json,
keyed by genre folder name (e.g. "samba", "hip-hop", "kpop").

Run this whenever a new pose-extraction batch lands in poses/, so the app's
bundled reference data stays in sync. Not run automatically by any build step.
"""
import json
import os

POSES_DIR = os.path.join(os.path.dirname(__file__), "poses")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "data", "pose-reference.json")


def main():
    out = {}
    for genre in sorted(os.listdir(POSES_DIR)):
        genre_dir = os.path.join(POSES_DIR, genre)
        if not os.path.isdir(genre_dir):
            continue
        poses = []
        for fname in sorted(os.listdir(genre_dir)):
            if not fname.endswith(".json"):
                continue
            with open(os.path.join(genre_dir, fname)) as f:
                data = json.load(f)
            # Strip landmark names on the way out -- the app only needs
            # positional order (which matches the live MediaPipe output
            # index-for-index), and dropping names cuts asset size ~30%.
            landmarks = [
                {"x": lm["x"], "y": lm["y"], "z": lm["z"], "visibility": lm["visibility"]}
                for lm in data["landmarks"]
            ]
            poses.append({"label": data["label"], "landmarks": landmarks})
        out[genre] = poses

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    total = sum(len(v) for v in out.values())
    print(f"Wrote {OUT_PATH}")
    for genre, poses in out.items():
        print(f"  {genre}: {len(poses)}")
    print(f"Total: {total} poses across {len(out)} genres")


if __name__ == "__main__":
    main()
