import subprocess, sys, os

# Candidate frames for the "basic steps" vocabulary (see Orbgroove Drive Log,
# Sep 22 2026: "Basic-steps vocabulary + combination-study proposal").
# All 11 moves are individually-named tutorials from the same already-vetted
# MihranTV catalog this project has sourced from repeatedly this session.
VIDEOS = [
    ("eg-3ybiL6UI", 393, "criss-cross"),
    ("A-9RWQc4tzE", 353, "heel-toe-happy-feet"),
    ("8BRogKK6q-c", 526, "body-wave"),
    ("Baaw5SSoQsU", 208, "slide-step"),
    ("EXh42q4jDBc", 602, "kick-ball-change"),
    ("E6GfqbvDJfU", 779, "running-man"),
    ("N1mTJrpUgRY", 516, "the-lean"),
    ("nbYCfzIdUes", 463, "basic-hip-movements"),
    ("VCX1mNfTnx0", 396, "arm-wave"),
    ("Js6VKgB_Wek", 511, "body-roll"),
    ("5lRJ51DnGMI", 572, "kick-and-step"),
]

OUT = "batch_basics"
os.makedirs(OUT, exist_ok=True)

for vid, dur, label in VIDEOS:
    url = f"https://youtube.com/watch?v={vid}"
    if dur <= 10:
        fracs = [0.3, 0.6]
    elif dur < 700:
        fracs = [0.15, 0.4, 0.65]
    else:
        fracs = [0.08, 0.2, 0.35]
    for f in fracs:
        t = round(dur * f, 1)
        out_path = os.path.join(OUT, f"{label}_{vid}_{t}.jpg")
        print(f"grabbing {label} ({vid}) @ {t}s ...")
        r = subprocess.run(
            ["python3", "extract_pose.py", "grab", url, str(t), out_path],
            capture_output=True, text=True,
        )
        if r.returncode != 0:
            print(f"  FAILED: {r.stderr[-500:]}")
        else:
            print("  ok")
