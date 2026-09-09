import subprocess, sys, os

VIDEOS = [
    ("8ARSfyJmag4", 882),
    ("rH9mmSiKUqQ", 1227),
    ("TNwsQgRsr3o", 428),
    ("wHGm97OcAB8", 245),
    ("GcW3-E9-U40", 568),
    ("kruB90MMCeg", 280),
    ("CHYZP_U7e2U", 365),
    ("UTFZ9AR1gUQ", 3563),
]

OUT = "candidates"
os.makedirs(OUT, exist_ok=True)

for vid, dur in VIDEOS:
    url = f"https://youtube.com/watch?v={vid}"
    fracs = [0.25, 0.5, 0.75] if dur < 700 else [0.08, 0.2, 0.35]
    for f in fracs:
        t = round(dur * f, 1)
        out_path = os.path.join(OUT, f"{vid}_{t}.jpg")
        print(f"grabbing {vid} @ {t}s ...")
        r = subprocess.run(
            ["python3", "extract_pose.py", "grab", url, str(t), out_path],
            capture_output=True, text=True,
        )
        if r.returncode != 0:
            print(f"  FAILED: {r.stderr[-500:]}")
        else:
            print(f"  ok")
