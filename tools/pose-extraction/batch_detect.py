import os, sys, glob, json, re

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

# A denoising cluster from `extract_pose.py grab --cluster N` is written as
# <label>__c0.jpg, <label>__c1.jpg, ... (see extract_pose.py's naming note).
# Group those back into one averaged pose per label; a plain <label>.jpg
# with no siblings is just a group of one, same as before this existed.
CLUSTER_SUFFIX = re.compile(r"^(.*)__c\d+$")
groups = {}
for path in sorted(glob.glob(os.path.join(IN_DIR, "*.jpg"))):
    stem = os.path.splitext(os.path.basename(path))[0]
    m = CLUSTER_SUFFIX.match(stem)
    label = m.group(1) if m else stem
    groups.setdefault(label, []).append(path)

results = []
with PoseLandmarker.create_from_options(options) as landmarker:
    for label, paths in groups.items():
        per_frame = []
        for path in paths:
            mp_image = mp.Image.create_from_file(path)
            result = landmarker.detect(mp_image)
            if not result.pose_landmarks:
                print(f"NO POSE in {os.path.basename(path)} -- excluded from average")
                continue
            pose = result.pose_landmarks[0]
            per_frame.append({LANDMARK_NAMES[i]: lm for i, lm in enumerate(pose)})

        if not per_frame:
            print(f"NO POSE: {label} (all {len(paths)} frame(s) failed)")
            results.append({"name": label, "ok": False})
            continue

        n = len(per_frame)
        landmarks = []
        for lm_name in LANDMARK_NAMES:
            pts = [f[lm_name] for f in per_frame]
            landmarks.append({
                "name": lm_name,
                "x": round(sum(p.x for p in pts) / n, 4),
                "y": round(sum(p.y for p in pts) / n, 4),
                "z": round(sum(p.z for p in pts) / n, 4),
                "visibility": round(sum(p.visibility for p in pts) / n, 3),
            })

        out_path = os.path.join(OUT_DIR, f"{label}.json")
        with open(out_path, "w") as f:
            json.dump({"label": label, "frames_averaged": n, "landmarks": landmarks}, f, indent=2)
        print(f"ok: {label} ({len(landmarks)} landmarks, averaged over {n}/{len(paths)} frame(s))")
        results.append({"name": label, "ok": True})

failed = [r["name"] for r in results if not r["ok"]]
print(f"\n{len(results) - len(failed)}/{len(results)} succeeded")
if failed:
    print("Failed:", failed)
