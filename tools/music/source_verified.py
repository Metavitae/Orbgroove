"""
Sources candidate tracks and only accepts ones that (a) are genre-authentic
by keyword and (b) actually measure within a given BPM reference range via
the project's own beat-grid extraction (librosa), so we stop shipping
tracks whose real tempo doesn't match the dance they're assigned to.
"""
import sys
import os
import re
import subprocess
import json
import curl_cffi
import librosa

SCRIPT_DIR = os.path.dirname(__file__)
SOURCED_DIR = os.path.join(SCRIPT_DIR, "sourced")
OUT_BASE = os.path.expanduser("~/orbgroove-music-candidates")
DRIVE_MUSIC_DIR = "/mnt/chromeos/shared/GoogleDrive/MyDrive/One_ring/03_Projects/Orbgroove/Art/Music"

DISCARDED_IDS = {
    "339200", "368359", "421455", "356689", "140472", "88746", "203006", "9328",
    "470342", "470343", "465926", "2716", "427181", "422960", "527984",
    "404809", "564850", "502365", "567546", "168215", "558712", "463187",
    "390164", "268549",
}


def _ids_from_dir(d):
    ids = set()
    if os.path.isdir(d):
        for fn in os.listdir(d):
            m = re.search(r"-(\d+)\.mp3$", fn)
            if m:
                ids.add(m.group(1))
    return ids


def existing_ids():
    ids = set(DISCARDED_IDS)
    if os.path.isdir(SOURCED_DIR):
        for g in os.listdir(SOURCED_DIR):
            ids |= _ids_from_dir(os.path.join(SOURCED_DIR, g))
    if os.path.isdir(DRIVE_MUSIC_DIR):
        for g in os.listdir(DRIVE_MUSIC_DIR):
            ids |= _ids_from_dir(os.path.join(DRIVE_MUSIC_DIR, g))
    if os.path.isdir(OUT_BASE):
        for g in os.listdir(OUT_BASE):
            ids |= _ids_from_dir(os.path.join(OUT_BASE, g))
    return ids


def search_tracks(query, limit=15):
    url = f"https://pixabay.com/music/search/{query.replace(' ', '%20')}/"
    r = curl_cffi.get(url, impersonate="chrome")
    links = sorted(set(re.findall(r'/music/[a-z0-9-]+-\d+/', r.text)))
    return [f"https://pixabay.com{l}" for l in links[:limit]]


def slug_from_url(url):
    return url.rstrip("/").split("/")[-1]


def id_from_slug(slug):
    m = re.search(r"-(\d+)$", slug)
    return m.group(1) if m else None


def download(url, out_dir, filename_hint):
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename_hint + ".%(ext)s")
    result = subprocess.run(
        ["yt-dlp", "--extractor-args", "generic:impersonate", "-x", "--audio-format", "mp3",
         "-o", out_path, url],
        capture_output=True, text=True, timeout=90,
    )
    final_path = os.path.join(out_dir, filename_hint + ".mp3")
    return result.returncode == 0 and os.path.exists(final_path), final_path


def verify_playable(path, min_duration=30.0):
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", path],
            capture_output=True, text=True, timeout=20,
        )
        data = json.loads(r.stdout)
        duration = float(data["format"]["duration"])
        return duration >= min_duration, duration
    except Exception as e:
        return False, str(e)


def measure_bpm(path):
    y, sr = librosa.load(path, sr=None, mono=True, duration=90)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    return float(tempo[0]) if hasattr(tempo, "__len__") else float(tempo)


def in_range(bpm, lo, hi, allow_half_double=True):
    if lo <= bpm <= hi:
        return True, bpm
    if allow_half_double:
        if lo <= bpm * 2 <= hi:
            return True, bpm * 2
        if lo <= bpm / 2 <= hi:
            return True, bpm / 2
    return False, bpm


def source_verified(genre, queries, need, bpm_lo, bpm_hi, keywords=None):
    seen_ids = existing_ids()
    out_dir = os.path.join(OUT_BASE, genre)
    accepted = []
    rejected = []
    for query in queries:
        if len(accepted) >= need:
            break
        candidates = search_tracks(query)
        if keywords:
            candidates = [c for c in candidates if any(k in c for k in keywords)]
        for url in candidates:
            if len(accepted) >= need:
                break
            slug = slug_from_url(url)
            tid = id_from_slug(slug)
            if tid is None or tid in seen_ids:
                continue
            seen_ids.add(tid)
            ok, path_or_err = download(url, out_dir, slug)
            if not ok:
                rejected.append((url, "download_failed"))
                continue
            valid, dur = verify_playable(path_or_err)
            if not valid:
                rejected.append((url, f"too_short:{dur}"))
                os.remove(path_or_err)
                continue
            try:
                bpm = measure_bpm(path_or_err)
            except Exception as e:
                rejected.append((url, f"bpm_extract_failed:{e}"))
                os.remove(path_or_err)
                continue
            ok_bpm, effective_bpm = in_range(bpm, bpm_lo, bpm_hi)
            if not ok_bpm:
                rejected.append((url, f"bpm_out_of_range:{bpm:.1f} (want {bpm_lo}-{bpm_hi})"))
                os.remove(path_or_err)
                continue
            accepted.append((url, path_or_err, dur, bpm, effective_bpm))
    return accepted, rejected


if __name__ == "__main__":
    genre = sys.argv[1]
    need = int(sys.argv[2])
    bpm_lo = float(sys.argv[3])
    bpm_hi = float(sys.argv[4])
    queries = sys.argv[5].split("|")
    keywords = sys.argv[6].split(",") if len(sys.argv) > 6 else None
    accepted, rejected = source_verified(genre, queries, need, bpm_lo, bpm_hi, keywords)
    print(f"GENRE {genre} | need={need} | range={bpm_lo}-{bpm_hi} | got={len(accepted)}")
    for url, path, dur, raw_bpm, eff_bpm in accepted:
        note = "" if abs(raw_bpm - eff_bpm) < 0.5 else f" (raw {raw_bpm:.1f}, read as {eff_bpm:.1f})"
        print(f"  ACCEPTED {os.path.basename(path)} <- {url} ({dur:.1f}s, {eff_bpm:.1f} bpm{note})")
    for url, reason in rejected:
        print(f"  REJECTED {url} : {reason}")
