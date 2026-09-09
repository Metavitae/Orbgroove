# Solo mode pose-extraction pipeline

Extracts individual key-pose landmark coordinates from a single paused frame
of a reference video, using the same MediaPipe Pose Landmarker model already
bundled in the app (`assets/models/pose_landmarker_lite.task`) — the same
detector `recording.tsx` runs live during gameplay, just pointed at a static
frame instead of a camera feed.

## Legal guardrail (non-negotiable)

- Never store, embed, or redistribute the source video anywhere in the app
  or its assets. The source video is downloaded to a temp directory only
  long enough to grab the requested frame, then discarded.
- Output is joint/landmark coordinates ONLY.
- Pull isolated key poses at the peak moment of a move — never a continuous
  sequence — spread across 2-3+ different source videos per move.

## Running locally

Requires a CPU with AVX support (mediapipe's wheel needs it — this repo's own
dev machine does not have it, hence the CI workflow below).

```
cd tools/pose-extraction
python3 -m venv venv && source venv/bin/activate
pip install mediapipe yt-dlp opencv-python-headless
python3 extract_pose.py <url> <timestamp-seconds> out/pose.json --label "..." --source-note "..."
```

## Running via CI (use this if local extraction fails with a SIGILL/AVX error)

`.github/workflows/pose-extraction-poc.yml`, triggered manually:

```
gh workflow run pose-extraction-poc.yml -f url=<url> -f timestamp=<seconds> -f label="..." -f source_note="..."
```

Downloads the resulting `pose-landmarks` artifact (just the JSON, never the
video) via `gh run download`.
