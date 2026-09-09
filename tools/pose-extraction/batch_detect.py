import os, sys, glob, json

sys.path.insert(0, os.path.dirname(__file__))
from extract_pose import LANDMARK_NAMES, MODEL_PATH

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

IN_DIR = sys.argv[1]
OUT_DIR = sys.argv[2]
os.makedirs(OUT_DIR, exist_ok=True)

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=RunningMode.IMAGE,
    num_poses=1,
    min_pose_detection_confidence=0.5,
    min_pose_presence_confidence=0.5,
)

results = []
with PoseLandmarker.create_from_options(options) as landmarker:
    for path in sorted(glob.glob(os.path.join(IN_DIR, "*.jpg"))):
        name = os.path.splitext(os.path.basename(path))[0]
        mp_image = mp.Image.create_from_file(path)
        result = landmarker.detect(mp_image)
        if not result.pose_landmarks:
            print(f"NO POSE: {name}")
            results.append({"name": name, "ok": False})
            continue
        pose = result.pose_landmarks[0]
        landmarks = [
            {"name": LANDMARK_NAMES[i], "x": round(lm.x, 4), "y": round(lm.y, 4), "z": round(lm.z, 4), "visibility": round(lm.visibility, 3)}
            for i, lm in enumerate(pose)
        ]
        out_path = os.path.join(OUT_DIR, f"{name}.json")
        with open(out_path, "w") as f:
            json.dump({"label": name, "landmarks": landmarks}, f, indent=2)
        print(f"ok: {name} ({len(landmarks)} landmarks)")
        results.append({"name": name, "ok": True})

failed = [r["name"] for r in results if not r["ok"]]
print(f"\n{len(results) - len(failed)}/{len(results)} succeeded")
if failed:
    print("Failed:", failed)
