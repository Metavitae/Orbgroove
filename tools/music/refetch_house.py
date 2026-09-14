import subprocess, os

TRACKS = [
    ("https://pixabay.com/music/beats-acid-house-590194/", "aurectheme-acid-house-590194"),
    ("https://pixabay.com/music/upbeat-sunset-house-classic-538760/", "sunset-house-grooves-sunset-house-classic-538760"),
]

OUT_DIR = os.path.join(os.path.dirname(__file__), "sourced", "house")
os.makedirs(OUT_DIR, exist_ok=True)

for url, name in TRACKS:
    out_path = os.path.join(OUT_DIR, name + ".%(ext)s")
    result = subprocess.run(
        ["yt-dlp", "--extractor-args", "generic:impersonate", "-x", "--audio-format", "mp3",
         "-o", out_path, url],
        capture_output=True, text=True,
    )
    print(name, "OK" if result.returncode == 0 else "FAILED")
    if result.returncode != 0:
        print(result.stdout[-800:])
        print(result.stderr[-800:])
