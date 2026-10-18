#!/usr/bin/env python3
"""Pull program-level earnings from the College Scorecard API for
every institution, page by page, with backoff on rate limits. Output: one JSON
file per page under scorecard/pages/. Safe to re-run; skips pages already saved.
"""
import json, os, sys, time, urllib.request, urllib.error

OUT = os.environ.get("SCORECARD_PAGES", "scorecard/pages")   # pass to gen_programs_ipeds.py --scorecard
os.makedirs(OUT, exist_ok=True)
FIELDS = ",".join([
    "id", "school.name", "school.state",
    "latest.programs.cip_4_digit.code",
    "latest.programs.cip_4_digit.credential.level",
    "latest.programs.cip_4_digit.earnings.1_yr.overall_median_earnings",
    "latest.programs.cip_4_digit.earnings.1_yr.pell_median_earnings",
    "latest.programs.cip_4_digit.earnings.1_yr.overall_median_earnings_national",
    "latest.programs.cip_4_digit.earnings.4_yr.overall_median_earnings",
    "latest.programs.cip_4_digit.earnings.4_yr.overall_median_earnings_national",
    "latest.programs.cip_4_digit.counts.ipeds_awards2",
])
API_KEY = os.environ.get("SCORECARD_KEY", "DEMO_KEY")   # DEMO_KEY allows about 30 pages a day; a free key from api.data.gov allows all 63
BASE = "https://api.data.gov/ed/collegescorecard/v1/schools?api_key=" + API_KEY + "&per_page=100&fields=" + FIELDS

def get(url, tries=12):
    for i in range(tries):
        req = urllib.request.Request(url, headers={"User-Agent": "FosteringPaths/1.0 (data build)"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                body = r.read()
                return json.loads(body), dict(r.headers)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                ra = e.headers.get("Retry-After")
                wait = int(ra) if ra and ra.isdigit() else 60 * (i + 1)
                print(f"429, sleeping {wait}s", flush=True)
                time.sleep(min(wait, 1800))
                continue
            print(f"HTTP {e.code} on {url[:120]}", flush=True)
            time.sleep(30)
        except Exception as ex:
            print(f"error {ex}", flush=True)
            time.sleep(30)
    return None, None

def main():
    page = 0
    total = None
    while True:
        fn = os.path.join(OUT, f"page_{page:03d}.json")
        if os.path.exists(fn):
            with open(fn) as f:
                d = json.load(f)
            total = d["metadata"]["total"]
        else:
            d, h = get(BASE + f"&page={page}")
            if d is None:
                print("giving up on page", page, flush=True)
                return
            total = d["metadata"]["total"]
            with open(fn, "w") as f:
                json.dump(d, f)
            rem = (h or {}).get("x-ratelimit-remaining", "?")
            print(f"page {page} saved ({len(d['results'])} schools), remaining={rem}, total={total}", flush=True)
            time.sleep(8)
        page += 1
        if page * 100 >= total:
            break
    print("DONE", flush=True)

if __name__ == "__main__":
    main()
