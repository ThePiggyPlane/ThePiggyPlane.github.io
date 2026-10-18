#!/usr/bin/env python3
"""One campus-program resource per California public campus, from IPEDS.

Why this is allowed under AGENTS.md: the Chancellor's Office memo ESS 26-14
(Feb 2026) confirms NextUp runs at all 115 community colleges; the CSU and UC
system pages confirm every campus has a foster youth program and CSU waives
tuition for qualifying foster youth. Campus addresses, phones and websites are
IPEDS (HD2024). Office-level contacts are left out until verified; each record
says so and tells the youth to ask for the office by name.

Usage:
  python3 tools/gen_ca_campus_stubs.py --hd /path/HD2024/HD2024.csv
"""
import argparse, glob, json, os, re
import pandas as pd

CA_REGION_BY_COUNTY = {}
for region, counties in {
    "Inland Empire": ["Riverside", "San Bernardino"], "Orange County": ["Orange"], "Los Angeles": ["Los Angeles"],
    "San Diego": ["San Diego"], "Imperial": ["Imperial"],
    "Central Coast": ["Ventura", "Santa Barbara", "San Luis Obispo", "Monterey", "San Benito", "Santa Cruz"],
    "Central Valley": ["Kern", "Tulare", "Kings", "Fresno", "Madera", "Merced", "Stanislaus", "San Joaquin"],
    "Bay Area": ["Alameda", "Contra Costa", "Marin", "Napa", "San Francisco", "San Mateo", "Santa Clara", "Solano", "Sonoma"],
    "Sacramento": ["Sacramento", "Placer", "El Dorado", "Yolo", "Sutter", "Yuba", "Nevada"],
    "North State": ["Butte", "Shasta", "Humboldt", "Del Norte", "Siskiyou", "Modoc", "Lassen", "Plumas", "Tehama", "Glenn", "Colusa", "Lake", "Mendocino", "Trinity", "Sierra"],
    "Sierra": ["Amador", "Calaveras", "Tuolumne", "Mariposa", "Mono", "Inyo", "Alpine"],
}.items():
    for c in counties:
        CA_REGION_BY_COUNTY[c] = region


def read_csv(path):
    try:
        return pd.read_csv(path, encoding="utf-8-sig", low_memory=False)
    except UnicodeDecodeError:
        d = pd.read_csv(path, encoding="latin1", low_memory=False)
        d.columns = [c.replace("﻿", "").replace("ï»¿", "") for c in d.columns]
        return d


def fmt_phone(raw):
    s = re.sub(r"\D", "", str(raw))
    return f"({s[:3]}) {s[3:6]}-{s[6:10]}" if len(s) >= 10 else ""


def norm_url(u):
    if not isinstance(u, str) or not u.strip() or u.strip() in ("-2", "-1"):
        return ""
    u = u.strip()
    return u if re.match(r"^https?://", u, re.I) else "https://" + u


def norm(s):
    s = s.lower().replace("university of california-", "uc ").replace("california state university-", "csu ")
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\b(the|of|college|university|community)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def existing_orgs(paths):
    orgs = set()
    for p in paths:
        for f in glob.glob(p):
            txt = open(f, encoding="utf-8").read()
            for m in re.findall(r'org:\s*"([^"]+)"', txt):
                orgs.add(norm(m))
    return orgs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hd", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "states", "CA", "resources-campus-ipeds.js"))
    a = ap.parse_args()
    hd = read_csv(a.hd)
    ca = hd[(hd.STABBR == "CA") & (hd.CYACTIVE == 1)]
    have = existing_orgs([os.path.join(os.path.dirname(a.out), "resources-campus-*.js")])
    recs = []
    for r in ca.itertuples(index=False):
        name = str(r.INSTNM).strip()
        sysnam = str(r.F1SYSNAM) if isinstance(r.F1SYSNAM, str) else ""
        kind = None
        if "California Community College" in sysnam or (int(r.SECTOR) == 4 and int(r.CONTROL) == 1):
            kind = "ccc"
        elif "California State University" in sysnam:
            kind = "csu"
        elif sysnam.startswith("University of California") and int(r.UGOFFER) == 1:
            kind = "uc"
        if not kind:
            continue
        if kind == "uc" and ("Hastings" in name or "Law" in name or "Francisco" in name):
            continue  # UCSF / law: graduate-only
        if norm(name) in have:
            continue
        if re.search(r"Chancellor|System Administration|Central Office|Adult School", name):
            continue
        if re.search(r"District|System Office", name) and name not in ("El Camino Community College District", "Mt San Jacinto Community College District"):
            continue  # district offices; their colleges have their own records
        if int(r.UNITID) == 110662:   # UCLA: verified record already in resources-campus-4yr.js
            continue
        county = str(r.COUNTYNM).replace(" County", "").strip() if isinstance(r.COUNTYNM, str) else ""
        region = CA_REGION_BY_COUNTY.get(county, "")
        city = str(r.CITY).strip()
        addr = ", ".join([x for x in [str(r.ADDR).strip() if isinstance(r.ADDR, str) else "", city, f"CA {str(r.ZIP).strip()[:5]}"] if x])
        if kind == "ccc":
            pname = f"{name} NextUp / foster youth program"
            serves = "Current and former foster youth (in care in any state on or after your 13th birthday) enrolling at this college, first enrolling before 26."
            provides = "NextUp runs at all 115 California community colleges: case management, priority registration, book and transportation help, emergency housing grants, food support, career advising. Details vary by campus."
            how = "Call the main number and ask for the EOPS or NextUp office, or find the campus foster youth liaison in the statewide FYSI directory. Bring your foster care verification letter."
            tags = ["nextup", "eops", "community-college", "campus-contact-unverified"]
            notes = "Campus office contact not yet verified by Fostering Paths; the college's main number and website are from federal records (IPEDS 2024)."
        elif kind == "csu":
            pname = f"{name} foster youth program (Guardian Scholars or similar)"
            serves = "Current and former foster youth applying to or attending this Cal State campus."
            provides = "Every CSU campus runs a foster youth support program (names vary: Guardian Scholars, Renaissance Scholars, EOP foster youth services) with priority registration and housing over breaks, and CSU waives the systemwide tuition fee and application fee for qualifying foster youth."
            how = "Call the main number and ask for the foster youth program or EOP office; request the application fee waiver inside Cal State Apply."
            tags = ["csu", "guardian-scholars", "tuition-waiver", "campus-contact-unverified"]
            notes = "Campus office contact not yet verified by Fostering Paths; main number and website are from federal records (IPEDS 2024)."
        else:
            pname = f"{name} Guardian Scholars / Hope Scholars"
            serves = "Current and former foster youth applying to or attending this UC campus."
            provides = "Every UC campus offers a program for current and former foster youth (Guardian Scholars or Hope Scholars) with advising, community, and often year-round housing and grants."
            how = "Call the main number and ask for the Guardian Scholars or Hope Scholars office; ask about housing over breaks and priority registration."
            tags = ["uc", "guardian-scholars", "campus-contact-unverified"]
            notes = "Campus office contact not yet verified by Fostering Paths; main number and website are from federal records (IPEDS 2024)."
        rec = {
            "id": f"ca-campus-{int(r.UNITID)}-{'nextup' if kind == 'ccc' else 'foster-youth-program'}",
            "name": pname, "org": name, "category": "campus", "state": "CA",
            "county": county, "city": city, "region": region, "address": addr,
            "url": norm_url(r.WEBADDR) or "https://icangotocollege.com/financial-aid/foster-youth-support",
            "phone": fmt_phone(r.GENTELE), "serves": serves, "ages": "to 26" if kind == "ccc" else "any",
            "provides": provides, "howToStart": how, "notes": notes, "tags": tags,
            "verified": "2026-10", "source": "ipeds-2024 + statewide program pages (see CA guide)",
        }
        try:
            rec["lat"] = round(float(r.LATITUDE), 5); rec["lng"] = round(float(r.LONGITUD), 5)
        except Exception:
            pass
        if not rec["phone"]:
            rec.pop("phone")
        if not rec["region"]:
            rec.pop("region")
        recs.append(rec)
    recs.sort(key=lambda x: (x.get("region", ""), x["org"]))
    out = ["// California public campuses with foster youth programs, generated by tools/gen_ca_campus_stubs.py",
           "// from IPEDS HD2024 plus the statewide program pages cited in data/states/CA/guide.js.",
           "// Office-level contacts are not yet verified; records say so.",
           "window.registerResources(" + json.dumps(recs, ensure_ascii=False, indent=1) + ");", ""]
    with open(a.out, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    kinds = {}
    for x in recs:
        k = "ccc" if "nextup" in x["id"] else ("csu" if "csu" in x["tags"] else "uc")
        kinds[k] = kinds.get(k, 0) + 1
    print("wrote", a.out, len(recs), kinds)


if __name__ == "__main__":
    main()
