#!/usr/bin/env python3
"""Turn a state research report (see tools/state_research_prompt.md) into data files.

Reads the first fenced ```json block in the report (or a bare .json file) and writes
  data/states/<ST>/guide.js, scholarships.js, resources.js
dropping records that lack required fields, fixing ids, and stripping em dashes.
Then run: node tools/validate.js && node tools/build-index.js

Usage: python3 tools/import_state_json.py report.md [--out data/states]
"""
import argparse, json, os, re, sys

RES_REQ = ["id", "name", "org", "category", "state", "url", "serves", "provides", "verified"]
SCH_REQ = ["id", "name", "provider", "type", "scope", "amount", "eligibility", "url", "verified"]
CATS = {"campus", "ilp", "housing", "health", "legal", "mentoring", "emergency", "employment", "education", "lgbtq", "advocacy", "agency", "other"}
TYPES = {"etv", "waiver", "scholarship", "emergency", "grant", "loan-forgiveness"}


def clean(v):
    if isinstance(v, str):
        v = v.replace("—", ", ").replace("–", "-").replace("  ", " ").strip()
        v = re.sub(r"\s*,\s*,", ",", v)
    elif isinstance(v, list):
        v = [clean(x) for x in v]
    elif isinstance(v, dict):
        v = {k: clean(x) for k, x in v.items()}
    return v


def kebab(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


def load(path):
    txt = open(path, encoding="utf-8").read()
    m = re.search(r"```json\s*(\{.*?\})\s*```", txt, re.S)
    raw = m.group(1) if m else txt
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        # tolerate trailing commas
        raw2 = re.sub(r",(\s*[}\]])", r"\1", raw)
        return json.loads(raw2)


def ok_url(u):
    return isinstance(u, str) and re.match(r"^https?://", u) is not None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("report")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "states"))
    a = ap.parse_args()
    data = clean(load(a.report))
    guide = data.get("guide") or {}
    st = (guide.get("state") or "").upper()
    if not re.match(r"^[A-Z]{2}$", st):
        sys.exit("guide.state missing")
    prefix = st.lower() + "-"
    d = os.path.join(a.out, st)
    os.makedirs(d, exist_ok=True)
    dropped = []

    # guide: required blocks
    for k in ["agency", "extendedFosterCare", "tuitionWaiver", "etv", "medicaidTo26", "ilp"]:
        if not isinstance(guide.get(k), dict):
            guide[k] = {}
    guide.setdefault("name", st)
    if not re.match(r"^\d{4}-\d{2}$", str(guide.get("verified", ""))):
        guide["verified"] = max([r.get("verified", "") for r in data.get("resources", []) if re.match(r"^\d{4}-\d{2}$", str(r.get("verified", "")))] + ["2026-10"])
    for aid in guide.get("stateAid", []):
        if not str(aid.get("id", "")).startswith(prefix):
            aid["id"] = prefix + kebab(aid.get("id") or aid.get("name", "aid"))
    guide["extendedFosterCare"].setdefault("toAge", 18)
    guide["tuitionWaiver"].setdefault("exists", False)
    guide["medicaidTo26"].setdefault("exists", True)

    seen = set()
    def fix_id(rec, kind):
        rid = str(rec.get("id") or kebab(rec.get("name", kind)))
        if not rid.startswith(prefix):
            rid = prefix + kebab(rid)
        rid = kebab(rid)
        base, n = rid, 2
        while rid in seen:
            rid = f"{base}-{n}"; n += 1
        seen.add(rid); rec["id"] = rid

    resources = []
    for r in data.get("resources", []):
        r["state"] = st
        fix_id(r, "resource")
        missing = [k for k in RES_REQ if not r.get(k)]
        if missing or r["category"] not in CATS or not ok_url(r["url"]) or not re.match(r"^\d{4}-\d{2}$", str(r.get("verified", ""))):
            dropped.append(("resource", r.get("id"), missing or r.get("category") or r.get("url"))); continue
        for k in ["lat", "lng"]:
            if k in r and not isinstance(r[k], (int, float)):
                r.pop(k)
        resources.append({k: v for k, v in r.items() if v not in ("", None, [])})
    scholarships = []
    for s in data.get("scholarships", []):
        s["state"] = st
        s.setdefault("scope", "state")
        fix_id(s, "scholarship")
        missing = [k for k in SCH_REQ if not s.get(k)]
        if missing or s["type"] not in TYPES or not ok_url(s["url"]) or not re.match(r"^\d{4}-\d{2}$", str(s.get("verified", ""))):
            dropped.append(("scholarship", s.get("id"), missing or s.get("type") or s.get("url"))); continue
        scholarships.append({k: v for k, v in s.items() if v not in ("", None, [])})

    def dump(name, call, obj, note):
        with open(os.path.join(d, name), "w", encoding="utf-8") as f:
            f.write(f"// {guide['name']}: {note}. Built from a research report by tools/import_state_json.py; edit by hand freely.\n")
            f.write(f"window.{call}(" + json.dumps(obj, ensure_ascii=False, indent=1) + ");\n")
    dump("guide.js", "registerStateGuide", guide, "state guide for foster youth")
    if scholarships:
        dump("scholarships.js", "registerScholarships", scholarships, "scholarships, waivers and grants for foster youth")
    if resources:
        dump("resources.js", "registerResources", resources, "support programs for foster youth")
    print(f"{st}: guide, {len(scholarships)} scholarships, {len(resources)} resources; dropped {len(dropped)}")
    for x in dropped:
        print("  dropped", x)


if __name__ == "__main__":
    main()
