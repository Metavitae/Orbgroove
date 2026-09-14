#!/bin/bash
# Usage: ./check_durations.sh vid1 vid2 vid3 ...
for vid in "$@"; do
  dur=$(yt-dlp --get-duration "https://youtube.com/watch?v=$vid" 2>&1)
  echo "$vid: $dur"
done
