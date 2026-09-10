import subprocess, sys, os

VIDEOS = [
    ("5dnQivWT2lg", 1717, None),
    ("Gefzja2rXBA", 1211, None),
    ("XZMkyZk9Go8", 790, None),
    ("fMaPnCN3ij0", 864, None),
    ("IHIy0Fe12UY", 950, None),
    ("op992EFqG24", 601, None),
]

OUT = "candidates"
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
