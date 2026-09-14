"""
Sources up to N candidate tracks per genre from Pixabay for a batch of
(genre_dir, search_query) pairs. For each genre: searches, downloads
candidates in order until `target` successful+verified downloads are saved
(or candidates run out), verifying each with ffprobe (real audio, duration
> 30s). Saves into tools/music/sourced/<genre_dir>/.
"""
import sys
import os
import re
import subprocess
import json
import curl_cffi

BASE_DIR = os.path.join(os.path.dirname(__file__), "sourced")


def search_tracks(query, limit=8):
    url = f"https://pixabay.com/music/search/{query.replace(' ', '%20')}/"
    r = curl_cffi.get(url, impersonate="chrome")
    links = sorted(set(re.findall(r'/music/[a-z0-9-]+-\d+/', r.text)))
    return [f"https://pixabay.com{l}" for l in links[:limit]]


def slug_from_url(url):
    return url.rstrip("/").split("/")[-1]


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


def source_genre(genre_dir, query, target=4, search_limit=10, keywords=None):
    out_dir = os.path.join(BASE_DIR, genre_dir)
    candidates = search_tracks(query, search_limit)
    if keywords:
        candidates = [c for c in candidates if any(k in c for k in keywords)]
    accepted = []
    rejected = []
    for url in candidates:
        if len(accepted) >= target:
            break
        slug = slug_from_url(url)
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
    return accepted, rejected, candidates


if __name__ == "__main__":
    genre_dir = sys.argv[1]
    query = sys.argv[2]
    target = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    keywords = sys.argv[4].split(",") if len(sys.argv) > 4 else None
    accepted, rejected, candidates = source_genre(genre_dir, query, target, keywords=keywords)
    print(f"GENRE {genre_dir} | query='{query}' | searched={len(candidates)} candidates")
    print(f"ACCEPTED ({len(accepted)}):")
    for url, path, dur in accepted:
        print(f"  {os.path.basename(path)} <- {url} ({dur:.1f}s)")
    print(f"REJECTED ({len(rejected)}):")
    for url, reason in rejected:
        print(f"  {url} : {reason}")
