"""
Fetches a Pixabay music search page (bypassing Cloudflare via curl_cffi
chrome impersonation), extracts individual track page links, downloads the
first N via yt-dlp (also needs --extractor-args generic:impersonate for the
same reason), and saves into tools/music/sourced/<genre>/.
"""
import sys
import os
import re
import subprocess
import curl_cffi

def search_tracks(query, limit=8):
    url = f"https://pixabay.com/music/search/{query.replace(' ', '%20')}/"
    r = curl_cffi.get(url, impersonate="chrome")
    links = sorted(set(re.findall(r'/music/[a-z0-9-]+-\d+/', r.text)))
    return [f"https://pixabay.com{l}" for l in links[:limit]]

def download(url, out_dir, filename_hint):
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename_hint + ".%(ext)s")
    result = subprocess.run(
        ["yt-dlp", "--extractor-args", "generic:impersonate", "-x", "--audio-format", "mp3",
         "-o", out_path, url],
        capture_output=True, text=True,
    )
    return result.returncode == 0, result.stdout[-500:] + result.stderr[-500:]

if __name__ == "__main__":
    query = sys.argv[1]
    genre_dir = sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    tracks = search_tracks(query, limit)
    print(f"Found {len(tracks)} candidates for '{query}':")
    for t in tracks:
        print(f"  {t}")
