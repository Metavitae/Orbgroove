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
    directory ONLY long enough to save the requested frame(s), then always
    deletes it (the `finally` block runs even if extraction fails).
  - Output is joint/landmark coordinates ONLY. The extracted frame image(s)
    are scratch input to `detect`, not a deliverable -- delete them once
    the JSON is produced.
  - Pull isolated key poses at the peak moment of a move -- never a
    continuous sequence -- and spread sourcing across multiple videos per
    move.
  - `--cluster` samples a TIGHT burst of frames (default: a handful within
    ~120ms) around one timestamp and averages them, purely to denoise a
    single held pose against motion blur or one bad detection -- it is
    still one moment, not a sequence. The window is deliberately small and
    capped; this is not a way to extract a move's motion arc from one
    video. A move's actual motion arc (its beginning, continuation, and
    follow-through) should instead be built by pulling separate isolated
    poses from DIFFERENT videos of different performers doing the same
    move, each contributing one moment -- never by densely sampling a
    single source.

Usage:
  python3 extract_pose.py grab <youtube-url> <timestamp-seconds> <output-frame-prefix.jpg> [--cluster N] [--window-ms W]
  python3 extract_pose.py detect <frame.jpg> [<frame2.jpg> ...] <output-json> [--label ...] [--source-note ...]
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
    if args.cluster < 1:
        print("--cluster must be >= 1", file=sys.stderr)
        sys.exit(1)
    # Capped hard, not just defaulted -- this is denoising for ONE pose, not
    # a way to pull a move's motion out of a single video. See the legal
    # guardrail note in the module docstring. Checked before importing
    # cv2/downloading anything, so a bad value refuses instantly.
    if args.cluster > 7:
        print("--cluster > 7 defeats the point (isolated pose, not a sequence) -- refusing", file=sys.stderr)
        sys.exit(1)
    if args.window_ms > 300:
        print("--window-ms > 300 starts to span real motion, not one held pose -- refusing", file=sys.stderr)
        sys.exit(1)

    import tempfile
    import cv2

    base, ext = os.path.splitext(args.output_frame)
    os.makedirs(os.path.dirname(args.output_frame) or ".", exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        video_path = download_video(args.url, tmp)
        cap = cv2.VideoCapture(video_path)
        written = []
        if args.cluster == 1:
            offsets_ms = [0.0]
        else:
            half = args.window_ms / 2
            offsets_ms = [-half + i * (args.window_ms / (args.cluster - 1)) for i in range(args.cluster)]
        for i, off in enumerate(offsets_ms):
            ts_ms = max(0.0, args.timestamp * 1000 + off)
            cap.set(cv2.CAP_PROP_POS_MSEC, ts_ms)
            ok, frame = cap.read()
            if not ok:
                print(f"Could not read frame at {ts_ms/1000:.3f}s (offset {off:+.0f}ms) -- skipping", file=sys.stderr)
                continue
            # "__c<i>" (double underscore + a letter, never bare digits) so
            # batch_detect.py can safely group a cluster's files back into
            # one pose without ever colliding with a real label that happens
            # to end in digits (e.g. a YouTube video id).
            out_path = args.output_frame if args.cluster == 1 else f"{base}__c{i}{ext}"
            cv2.imwrite(out_path, frame)
            written.append(out_path)
        cap.release()
        if not written:
            print("No frames could be read", file=sys.stderr)
            sys.exit(1)
    print(f"Wrote {len(written)} frame(s): {', '.join(written)} (source video discarded)")


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

    per_frame = []  # list of {name: {x,y,z,visibility}} dicts, one per successfully-detected frame
    with PoseLandmarker.create_from_options(options) as landmarker:
        for frame_path in args.frames:
            mp_image = mp.Image.create_from_file(frame_path)
            result = landmarker.detect(mp_image)
            if not result.pose_landmarks:
                print(f"No pose detected in {frame_path} -- excluded from average", file=sys.stderr)
                continue
            pose = result.pose_landmarks[0]
            per_frame.append({LANDMARK_NAMES[i]: lm for i, lm in enumerate(pose)})

    if not per_frame:
        print("No pose detected in any frame", file=sys.stderr)
        sys.exit(1)

    # A tight burst around one timestamp (see --cluster in `grab`) averages
    # to a single denoised pose here -- still one moment, just more robust
    # against motion blur or one bad detection on any single frame.
    n = len(per_frame)
    landmarks = []
    for name in LANDMARK_NAMES:
        pts = [f[name] for f in per_frame]
        landmarks.append({
            "name": name,
            "x": round(sum(p.x for p in pts) / n, 4),
            "y": round(sum(p.y for p in pts) / n, 4),
            "z": round(sum(p.z for p in pts) / n, 4),
            "visibility": round(sum(p.visibility for p in pts) / n, 3),
        })

    os.makedirs(os.path.dirname(args.output_json) or ".", exist_ok=True)
    with open(args.output_json, "w") as f:
        json.dump(
            {
                "label": args.label,
                "source_note": args.source_note,
                "frames_averaged": n,
                "landmarks": landmarks,
            },
            f,
            indent=2,
        )
    print(f"Wrote {args.output_json} ({len(landmarks)} landmarks, averaged over {n}/{len(args.frames)} frame(s))")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("grab", help="Download a video and save one paused frame, or a small denoising cluster (run locally)")
    g.add_argument("url")
    g.add_argument("timestamp", type=float)
    g.add_argument("output_frame")
    g.add_argument("--cluster", type=int, default=1, help="Frames to sample around the timestamp for averaging (1-7, default 1)")
    g.add_argument("--window-ms", type=float, default=120, help="Total span in ms the cluster is spread across (max 300, default 120)")
    g.set_defaults(func=cmd_grab)

    d = sub.add_parser("detect", help="Run pose detection on one or more extracted frames and average them (run in CI)")
    d.add_argument("frames", nargs="+", help="One frame for a single-shot pose, or several (e.g. a --cluster burst) to average")
    d.add_argument("output_json")
    d.add_argument("--label", default="")
    d.add_argument("--source-note", default="", help="e.g. genre/video id, for provenance -- never the video itself")
    d.set_defaults(func=cmd_detect)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
