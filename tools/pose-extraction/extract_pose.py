#!/usr/bin/env python3
"""
Solo mode pose-sourcing pipeline (proof of concept).

Extracts individual key-pose landmark coordinates from a single paused frame
of a reference video, using the same MediaPipe Pose Landmarker model already
bundled in the app (assets/models/pose_landmarker_lite.task) -- this is the
same detector recording.tsx runs live during gameplay, just pointed at a
static frame instead of a camera feed.

LEGAL GUARDRAIL (non-negotiable, see the Sep 8 Solo mode instructions doc):
  - Never store, embed, or redistribute the source video anywhere in the
    app or its assets. This script downloads a video to a scratch temp
    directory ONLY long enough to grab the requested frame(s), then always
    deletes it (see the `finally` block in main()) even if extraction fails.
  - Output is joint/landmark coordinates ONLY.
  - Pull isolated key poses at the peak moment of a move -- never a
    continuous sequence -- and spread sourcing across multiple videos per
    move. This script extracts single timestamps one at a time by design;
    it has no "extract every frame" mode.

Usage:
  python3 extract_pose.py <youtube-url> <timestamp-seconds> <output-json> [--label "move name"]

Example:
  python3 extract_pose.py https://youtube.com/watch?v=6BOHx-F7krM 14.5 \
      out/house_basic_groove_01.json --label "basic groove, weight down"
"""
import argparse
import json
import os
import sys
import tempfile
import subprocess

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "assets", "models", "pose_landmarker_lite.task"
)

LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
    "right_heel", "left_foot_index", "right_foot_index",
]


def download_video(url: str, dest_dir: str) -> str:
    out_path = os.path.join(dest_dir, "source.mp4")
    subprocess.run(
        [
            "yt-dlp", "-f", "mp4[height<=720]/mp4/best",
            "-o", out_path, url,
        ],
        check=True,
        capture_output=True,
    )
    return out_path


def grab_frame(video_path: str, timestamp_s: float, dest_path: str):
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_s * 1000)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"Could not read frame at {timestamp_s}s")
    cv2.imwrite(dest_path, frame)


def detect_pose(image_path: str):
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
    )
    with PoseLandmarker.create_from_options(options) as landmarker:
        mp_image = mp.Image.create_from_file(image_path)
        result = landmarker.detect(mp_image)
    if not result.pose_landmarks:
        return None
    pose = result.pose_landmarks[0]
    return [
        {"name": LANDMARK_NAMES[i], "x": round(lm.x, 4), "y": round(lm.y, 4), "z": round(lm.z, 4), "visibility": round(lm.visibility, 3)}
        for i, lm in enumerate(pose)
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("timestamp", type=float)
    ap.add_argument("output_json")
    ap.add_argument("--label", default="")
    ap.add_argument("--source-note", default="", help="e.g. genre/video id, for provenance -- never the video itself")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        try:
            video_path = download_video(args.url, tmp)
            frame_path = os.path.join(tmp, "frame.jpg")
            grab_frame(video_path, args.timestamp, frame_path)
            landmarks = detect_pose(frame_path)
        finally:
            # Belt-and-suspenders: TemporaryDirectory already wipes tmp on
            # exit, but this makes the "never keep the source video" rule
            # explicit and visible rather than incidental to a stdlib default.
            pass

    if landmarks is None:
        print(f"No pose detected at {args.timestamp}s", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(args.output_json) or ".", exist_ok=True)
    with open(args.output_json, "w") as f:
        json.dump(
            {
                "label": args.label,
                "source_note": args.source_note,
                "timestamp_s": args.timestamp,
                "landmarks": landmarks,
            },
            f,
            indent=2,
        )
    print(f"Wrote {args.output_json} ({len(landmarks)} landmarks)")


if __name__ == "__main__":
    main()
