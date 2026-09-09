#!/usr/bin/env python3
"""
Solo mode pose-sourcing pipeline (proof of concept).

Extracts individual key-pose landmark coordinates from a single paused frame
of a reference video, using the same MediaPipe Pose Landmarker model already
bundled in the app (assets/models/pose_landmarker_lite.task) -- this is the
same detector recording.tsx runs live during gameplay, just pointed at a
static frame instead of a camera feed.

Split into two subcommands because the two steps need different, mutually
exclusive environments:
  - `grab`   downloads the video and saves one frame as a JPG. Run this
             locally -- YouTube's bot-detection blocks/challenges downloads
             from GitHub-hosted-runner IPs (confirmed: "Sign in to confirm
             you're not a bot" even with the android player-client
             workaround), so this step can't run in CI.
  - `detect` runs MediaPipe Pose Landmarker on an already-extracted frame.
             Run this in CI (see .github/workflows/pose-extraction-poc.yml)
             -- mediapipe's wheel requires AVX, which this repo's local dev
             machine's CPU doesn't have.

LEGAL GUARDRAIL (non-negotiable, see the Sep 8 Solo mode instructions doc):
  - Never store, embed, or redistribute the source video anywhere in the
    app or its assets. `grab` downloads the video to a scratch temp
    directory ONLY long enough to save the requested frame, then always
    deletes it (the `finally` block runs even if extraction fails).
  - Output is joint/landmark coordinates ONLY. The extracted frame image
    itself is scratch input to `detect`, not a deliverable -- delete it
    once the JSON is produced.
  - Pull isolated key poses at the peak moment of a move -- never a
    continuous sequence -- and spread sourcing across multiple videos per
    move. This script extracts single timestamps one at a time by design;
    it has no "extract every frame" mode.

Usage:
  python3 extract_pose.py grab <youtube-url> <timestamp-seconds> <output-frame.jpg>
  python3 extract_pose.py detect <frame.jpg> <output-json> [--label ...] [--source-note ...]
"""
import argparse
import json
import os
import sys
import subprocess


def download_video(url: str, dest_dir: str) -> str:
    out_path = os.path.join(dest_dir, "source.mp4")
    result = subprocess.run(
        [
            "yt-dlp", "-f", "mp4[height<=720]/mp4/best",
            "--extractor-args", "youtube:player_client=android",
            "-o", out_path, url,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        result.check_returncode()
    return out_path


def cmd_grab(args):
    import tempfile
    import cv2

    with tempfile.TemporaryDirectory() as tmp:
        video_path = download_video(args.url, tmp)
        cap = cv2.VideoCapture(video_path)
        cap.set(cv2.CAP_PROP_POS_MSEC, args.timestamp * 1000)
        ok, frame = cap.read()
        cap.release()
        if not ok:
            print(f"Could not read frame at {args.timestamp}s", file=sys.stderr)
            sys.exit(1)
        os.makedirs(os.path.dirname(args.output_frame) or ".", exist_ok=True)
        cv2.imwrite(args.output_frame, frame)
    print(f"Wrote {args.output_frame} (source video discarded)")


LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
    "right_heel", "left_foot_index", "right_foot_index",
]

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "assets", "models", "pose_landmarker_lite.task"
)


def cmd_detect(args):
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
    )
    with PoseLandmarker.create_from_options(options) as landmarker:
        mp_image = mp.Image.create_from_file(args.frame)
        result = landmarker.detect(mp_image)

    if not result.pose_landmarks:
        print("No pose detected", file=sys.stderr)
        sys.exit(1)

    pose = result.pose_landmarks[0]
    landmarks = [
        {"name": LANDMARK_NAMES[i], "x": round(lm.x, 4), "y": round(lm.y, 4), "z": round(lm.z, 4), "visibility": round(lm.visibility, 3)}
        for i, lm in enumerate(pose)
    ]

    os.makedirs(os.path.dirname(args.output_json) or ".", exist_ok=True)
    with open(args.output_json, "w") as f:
        json.dump(
            {
                "label": args.label,
                "source_note": args.source_note,
                "landmarks": landmarks,
            },
            f,
            indent=2,
        )
    print(f"Wrote {args.output_json} ({len(landmarks)} landmarks)")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("grab", help="Download a video and save one paused frame (run locally)")
    g.add_argument("url")
    g.add_argument("timestamp", type=float)
    g.add_argument("output_frame")
    g.set_defaults(func=cmd_grab)

    d = sub.add_parser("detect", help="Run pose detection on an extracted frame (run in CI)")
    d.add_argument("frame")
    d.add_argument("output_json")
    d.add_argument("--label", default="")
    d.add_argument("--source-note", default="", help="e.g. genre/video id, for provenance -- never the video itself")
    d.set_defaults(func=cmd_detect)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
