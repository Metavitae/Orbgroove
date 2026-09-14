"""
Sources NEW candidate tracks per genre, excluding any Pixabay track ID
already present in tools/music/sourced/<genre>/ (the original vetted batch,
already split between Drive-accepted and implicitly-discarded). Saves
accepted new tracks straight into ~/orbgroove-music-candidates/<genre>/ for
pickup.
"""
import sys
import os
import re
import subprocess
import json
import curl_cffi

SCRIPT_DIR = os.path.dirname(__file__)
SOURCED_DIR = os.path.join(SCRIPT_DIR, "sourced")
OUT_BASE = os.path.expanduser("~/orbgroove-music-candidates")
DRIVE_MUSIC_DIR = "/mnt/chromeos/shared/GoogleDrive/MyDrive/One_ring/03_Projects/Orbgroove/Art/Music"

# Explicitly offered in a prior round and passed over on manual review --
# never resurface these even though they're not in sourced/ or Drive.
DISCARDED_IDS = {
    "339200", "368359", "421455", "356689",  # cancan (all 4, tone mismatch)
    "140472",  # bharatanatyam
    "88746",  # cossack-dance
    "203006", "9328",  # saman
    "470342", "470343",  # bon-odori
    "465926", "2716",  # folklorico
    "427181", "422960",  # halay
    "527984",  # riverdance
    "404809", "564850",  # thai-classical-dance
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
    """IDs to never re-offer: already used anywhere in tools/music/sourced/
    (all genres), already sitting in Drive, or explicitly discarded before."""
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


def verify(path, min_duration=30.0):
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


def source_new(genre, queries, need, keywords=None):
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
            valid, dur = verify(path_or_err)
            if valid:
                accepted.append((url, path_or_err, dur))
            else:
                rejected.append((url, f"verify_failed:{dur}"))
                if os.path.exists(path_or_err):
                    os.remove(path_or_err)
    return accepted, rejected


if __name__ == "__main__":
    genre = sys.argv[1]
    need = int(sys.argv[2])
    queries = sys.argv[3].split("|")
    keywords = sys.argv[4].split(",") if len(sys.argv) > 4 else None
    accepted, rejected = source_new(genre, queries, need, keywords)
    print(f"GENRE {genre} | need={need} | got={len(accepted)}")
    for url, path, dur in accepted:
        print(f"  ACCEPTED {os.path.basename(path)} <- {url} ({dur:.1f}s)")
    for url, reason in rejected:
        print(f"  REJECTED {url} : {reason}")
