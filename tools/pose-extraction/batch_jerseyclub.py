import subprocess, sys, os

VIDEOS = [
    ("jY-2LpxtVEc", 534, None),
    ("QoMtPSHt94g", 506, None),
    ("AsWkwNHAd3Y", 443, None),
    ("LU0-W35hc_s", 197, None),
    ("Mlgz1Y_2U1c", 259, None),
]

OUT = "batch_jerseyclub"
os.makedirs(OUT, exist_ok=True)

for vid, dur, kind in VIDEOS:
    url = f"https://youtube.com/shorts/{vid}" if kind == "shorts" else f"https://youtube.com/watch?v={vid}"
    if dur <= 10:
        fracs = [0.3, 0.6]
    elif dur < 700:
        fracs = [0.15, 0.4, 0.65]
    else:
        fracs = [0.08, 0.2, 0.35]
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
