#!/usr/bin/env bash
# Full renders: 2 song loops per dance, then encode MP4 (H.264 + the song looped twice).
cd "$(dirname "$0")"
for spec in "salsa 64" "samba 64" "house 64" "hiphop 80"; do
  set -- $spec
  node render.mjs $1 $2 2>&1 | grep -E "done|error" 
  ffmpeg -v error -y -stream_loop 1 -i song-$1.mp4 -c copy song2-$1.m4a
  ffmpeg -v error -y -framerate 30 -i out/$1/%05d.jpg -i song2-$1.m4a -map 0:v -map 1:a -c:v libx264 -preset medium -crf 27 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart ribbons-$1.mp4
  echo "encoded $1 $(du -h ribbons-$1.mp4 | cut -f1) $(ffprobe -v error -show_entries format=duration -of csv=p=0 ribbons-$1.mp4)s"
  rm -f out/$1/*.jpg
done
