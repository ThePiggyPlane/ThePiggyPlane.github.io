#!/usr/bin/env python3
"""State wage files from the BLS Occupational Employment and Wage Statistics (OES)
survey, pulled through the official BLS Public Data API (api.bls.gov).

Writes data/states/<ST>/wages.js:
  window.registerWages({ state, geo, dataYear, source, careers: { nurse: { medianWage, ... } } })

Series ids are 25 characters: OE U S <area 7> <industry 6> <occupation 6> <datatype 2>.
Area for a state is its FIPS code plus "00000" (California = 0600000); industry
000000 is "all industries"; data type 13 is the annual median wage, 01 total
employment, 12 and 14 the annual 25th and 75th percentiles, 11 and 15 the 10th
and 90th.

API limits: version 1 (no key) allows 25 queries a day, 25 series each; version 2
(free key from https://data.bls.gov/registrationEngine/) allows 500 queries a day,
50 series each. Responses are cached in --cache so re-runs only fetch what is
missing. Occupations BLS suppresses for a state come back as "No Data" and are
cached as null so they are not requested again.

Usage:
  python3 tools/gen_wages_bls.py --states TX,FL --types 13
  BLS_KEY=... python3 tools/gen_wages_bls.py --states all --types 13,01,12,14,11,15
"""
import argparse, json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from gen_onet import CAREER_SOC  # career id -> ["29-1141.00", ...]

STATE_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", "CO": "08", "CT": "09", "DE": "10", "DC": "11",
    "FL": "12", "GA": "13", "HI": "15", "ID": "16", "IL": "17", "IN": "18", "IA": "19", "KS": "20", "KY": "21",
    "LA": "22", "ME": "23", "MD": "24", "MA": "25", "MI": "26", "MN": "27", "MS": "28", "MO": "29", "MT": "30",
    "NE": "31", "NV": "32", "NH": "33", "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45", "SD": "46", "TN": "47", "TX": "48", "UT": "49",
    "VT": "50", "VA": "51", "WA": "53", "WV": "54", "WI": "55", "WY": "56",
}
STATE_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
    "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky",
    "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
    "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
    "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
# Largest states first, so a limited daily quota covers the most people.
BY_POP = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "TN", "MA", "IN", "MD",
          "MO", "WI", "CO", "MN", "SC", "AL", "LA", "KY", "OR", "OK", "CT", "UT", "IA", "NV", "AR", "KS", "MS", "NM",
          "NE", "ID", "WV", "HI", "NH", "ME", "MT", "RI", "DE", "SD", "ND", "AK", "DC", "VT", "WY"]
TYPE_FIELD = {"13": "medianWage", "01": "employed", "12": "range50Low", "14": "range50High", "11": "range80Low", "15": "range80High",
              "04": "meanWage", "08": "hourlyMedian"}


def soc6(career):
    return CAREER_SOC[career][0].split(".")[0].replace("-", "")


def series_id(st, career, dtype):
    return f"OEUS{STATE_FIPS[st]}00000000000{soc6(career)}{dtype}"


def fetch(series, key):
    url = "https://api.bls.gov/publicAPI/v2/timeseries/data/" if key else "https://api.bls.gov/publicAPI/v1/timeseries/data/"
    body = {"seriesid": series}
    if key:
        body["registrationkey"] = key
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--states", default="all")
    ap.add_argument("--types", default="13")
    ap.add_argument("--max-queries", type=int, default=24)
    ap.add_argument("--cache", default=os.path.join(os.environ.get("BLS_CACHE", "."), "bls_cache.json"))
    ap.add_argument("--out-dir", default=os.path.join(os.path.dirname(__file__), "..", "data", "states"))
    ap.add_argument("--write-only", action="store_true", help="skip fetching; write files from the cache")
    a = ap.parse_args()
    key = os.environ.get("BLS_KEY", "")
    per_query = 50 if key else 25
    states = BY_POP if a.states == "all" else [s.strip().upper() for s in a.states.split(",") if s.strip()]
    types = [t.strip() for t in a.types.split(",") if t.strip()]
    cache = json.load(open(a.cache)) if os.path.exists(a.cache) else {}

    wanted = [series_id(st, c, t) for st in states for t in types for c in CAREER_SOC]
    todo = [s for s in wanted if s not in cache]
    print(f"series wanted {len(wanted)}, cached {len(wanted) - len(todo)}, to fetch {len(todo)}")
    queries = 0
    if not a.write_only:
        for i in range(0, len(todo), per_query):
            if queries >= a.max_queries:
                print("stopping at max queries"); break
            chunk = todo[i:i + per_query]
            try:
                j = fetch(chunk, key)
            except Exception as e:
                print("fetch failed:", e); break
            queries += 1
            if j.get("status") != "REQUEST_SUCCEEDED":
                print("API said:", j.get("status"), j.get("message")); break
            got = {s["seriesID"]: s for s in j.get("Results", {}).get("series", [])}
            for sid in chunk:
                s = got.get(sid)
                vals = [d for d in (s or {}).get("data", []) if d.get("period") == "A01"]
                if vals:
                    vals.sort(key=lambda d: -int(d["year"]))
                    try:
                        cache[sid] = {"year": int(vals[0]["year"]), "value": float(vals[0]["value"])}
                    except ValueError:
                        cache[sid] = None
                else:
                    cache[sid] = None
            json.dump(cache, open(a.cache, "w"))
            print(f"query {queries}: {len(chunk)} series, {sum(1 for s in chunk if cache.get(s))} with data")
            time.sleep(0.5)

    written = 0
    for st in states:
        careers = {}
        years = set()
        for c in CAREER_SOC:
            rec = {}
            for t in types:
                v = cache.get(series_id(st, c, t))
                if v and TYPE_FIELD.get(t):
                    rec[TYPE_FIELD[t]] = int(round(v["value"]))
                    years.add(v["year"])
            if rec:
                careers[c] = rec
        if not careers:
            continue
        year = max(years)
        out = {"state": st, "geo": STATE_NAME[st], "dataYear": year, "source": f"BLS OES, May {year} (api.bls.gov)",
               "verified": "2026-10", "careers": careers}
        d = os.path.join(a.out_dir, st)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "wages.js"), "w", encoding="utf-8") as f:
            f.write(f"// {STATE_NAME[st]} wages for Fostering Paths careers, BLS OES May {year}, via the BLS Public Data API.\n")
            f.write("// Built by tools/gen_wages_bls.py. Do not hand-edit.\n")
            f.write("window.registerWages(" + json.dumps(out, ensure_ascii=False, indent=1) + ");\n")
        written += 1
        print(st, len(careers), "careers")
    print("wrote", written, "state wage files")


if __name__ == "__main__":
    main()
