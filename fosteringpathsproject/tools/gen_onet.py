#!/usr/bin/env python3
"""Build data/onet.js (career detail text) from the O*NET database text files.

Download https://www.onetcenter.org/dl_files/database/db_30_1_text.zip, unzip,
then:  python3 tools/gen_onet.py --onet /path/to/db_30_1_text

O*NET is published by USDOL/ETA under CC BY 4.0; the About page carries the
required attribution.
"""
import argparse, csv, json, os, re
from collections import defaultdict

# career id -> O*NET-SOC code(s); the first is the primary.
CAREER_SOC = {
    "accountant": ["13-2011.00"],
    "animator": ["27-1014.00"],
    "architect": ["17-1011.00"],
    "author": ["27-3043.00", "27-3043.05"],
    "automechanic": ["49-3023.00"],
    "baker": ["51-3011.00"],
    "barber": ["39-5011.00"],
    "carpenter": ["47-2031.00"],
    "chef": ["35-1011.00"],
    "civilengineer": ["17-2051.00"],
    "cosmetology": ["39-5012.00"],
    "cybersecurity": ["15-1212.00"],
    "datascience": ["15-2051.00"],
    "dentalassistant": ["31-9091.00"],
    "earlychildhood": ["25-2011.00"],
    "emt": ["29-2042.00", "29-2043.00"],
    "firefighter": ["33-2011.00"],
    "hvac": ["49-9021.00"],
    "infotech": ["15-1232.00"],
    "librarytech": ["25-4031.00"],
    "masonry": ["47-2021.00"],
    "mathematician": ["15-2021.00"],
    "mechanicalengineer": ["17-2141.00"],
    "medassistant": ["31-9092.00"],
    "nurse": ["29-1141.00"],
    "paralegal": ["23-2011.00"],
    "pharmtech": ["29-2052.00"],
    "phlebotomist": ["31-9097.00"],
    "photography": ["27-4021.00"],
    "plumber": ["47-2152.00"],
    "radtech": ["29-2034.00"],
    "resptherapist": ["29-1126.00"],
    "salesmanager": ["11-2022.00"],
    "sociologist": ["19-3041.00"],
    "technicalwriter": ["27-3042.00"],
    "trades": ["47-2111.00"],
    "urbanplanner": ["19-3051.00"],
    "veterinarian": ["29-1131.00"],
    "welding": ["51-4121.00"],
}

JOB_ZONE = {
    1: "Little or no preparation: a high school diploma or less, learn on the job in days or weeks.",
    2: "Some preparation: a high school diploma, often a few months of on-the-job training or a short certificate.",
    3: "Medium preparation: vocational training, an apprenticeship, or an associate degree; one to two years to get started.",
    4: "Considerable preparation: usually a bachelor's degree plus a few years of experience.",
    5: "Extensive preparation: a graduate or professional degree and several years of experience.",
}

EDU_CATEGORY = {
    1: "Less than a high school diploma", 2: "High school diploma or GED", 3: "Post-secondary certificate",
    4: "Some college, no degree", 5: "Associate degree", 6: "Bachelor's degree", 7: "Post-baccalaureate certificate",
    8: "Master's degree", 9: "Post-master's certificate", 10: "First professional degree", 11: "Doctoral degree",
    12: "Post-doctoral training",
}

RIASEC = {"1.B.1.a": "Realistic (hands-on)", "1.B.1.b": "Investigative (figuring things out)", "1.B.1.c": "Artistic (creating)",
          "1.B.1.d": "Social (helping people)", "1.B.1.e": "Enterprising (leading and selling)", "1.B.1.f": "Conventional (organizing and detail)"}


def read_tsv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--onet", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "onet.js"))
    a = ap.parse_args()
    d = a.onet

    occ = {r["O*NET-SOC Code"]: r for r in read_tsv(os.path.join(d, "Occupation Data.txt"))}
    tasks = defaultdict(list)
    for r in read_tsv(os.path.join(d, "Task Statements.txt")):
        tasks[r["O*NET-SOC Code"]].append(r)
    # importance ratings (Scale IM) per task id
    imp = {}
    for r in read_tsv(os.path.join(d, "Task Ratings.txt")):
        if r["Scale ID"] == "IM":
            try: imp[(r["O*NET-SOC Code"], r["Task ID"])] = float(r["Data Value"])
            except ValueError: pass
    zones = {r["O*NET-SOC Code"]: int(r["Job Zone"]) for r in read_tsv(os.path.join(d, "Job Zones.txt"))}
    titles = defaultdict(list)
    for r in read_tsv(os.path.join(d, "Sample of Reported Titles.txt")):
        titles[r["O*NET-SOC Code"]].append(r["Reported Job Title"])
    alt = defaultdict(list)
    for r in read_tsv(os.path.join(d, "Alternate Titles.txt")):
        alt[r["O*NET-SOC Code"]].append(r["Alternate Title"])
    # Required level of education: category with the largest share (RL scale)
    edu = defaultdict(dict)
    for r in read_tsv(os.path.join(d, "Education, Training, and Experience.txt")):
        if r["Element ID"] == "2.D.1" and r["Scale ID"] == "RL":
            try: edu[r["O*NET-SOC Code"]][int(r["Category"])] = float(r["Data Value"])
            except ValueError: pass
    interests = defaultdict(dict)
    for r in read_tsv(os.path.join(d, "Interests.txt")):
        if r["Scale ID"] == "OI" and r["Element ID"] in RIASEC:
            try: interests[r["O*NET-SOC Code"]][r["Element ID"]] = float(r["Data Value"])
            except ValueError: pass
    related = defaultdict(list)
    for r in read_tsv(os.path.join(d, "Related Occupations.txt")):
        rs = r["Related O*NET-SOC Code"]
        related[r["O*NET-SOC Code"]].append((int(r.get("Index", "99") or 99), rs, occ.get(rs, {}).get("Title", rs)))
    tech = defaultdict(list)
    for r in read_tsv(os.path.join(d, "Technology Skills.txt")):
        if r.get("Hot Technology") == "Y" or r.get("In Demand") == "Y":
            tech[r["O*NET-SOC Code"]].append(r["Example"])
    tools = defaultdict(list)
    for r in read_tsv(os.path.join(d, "Tools Used.txt")):
        tools[r["O*NET-SOC Code"]].append(r["Example"])

    soc_to_career = {}
    for cid, socs in CAREER_SOC.items():
        for s in socs: soc_to_career[s] = cid

    out = {}
    for cid, socs in CAREER_SOC.items():
        s = socs[0]
        if s not in occ:
            print("missing", cid, s); continue
        core = [t for t in tasks[s] if t.get("Task Type") in ("Core", "")]
        core.sort(key=lambda t: -imp.get((s, t["Task ID"]), 0))
        top_tasks = [re.sub(r"\s+", " ", t["Task"]).strip() for t in core[:6]]
        e = edu.get(s, {})
        edu_sorted = sorted(e.items(), key=lambda kv: -kv[1])
        edu_top = [{"level": EDU_CATEGORY.get(k, str(k)), "pct": round(v)} for k, v in edu_sorted[:3] if v >= 5]
        ints = sorted(interests.get(s, {}).items(), key=lambda kv: -kv[1])[:3]
        rel = []
        seen = set()
        for _, rs, rt in sorted(related.get(s, [])):
            c = soc_to_career.get(rs)
            key = c or rt
            if key in seen: continue
            seen.add(key)
            rel.append({"career": c} if c else {"title": rt})
            if len(rel) >= 6: break
        uniq = lambda xs, n: list(dict.fromkeys(xs))[:n]
        out[cid] = {
            "soc": s,
            "onetTitle": occ[s]["Title"],
            "description": occ[s]["Description"],
            "tasks": top_tasks,
            "jobZone": zones.get(s),
            "jobZoneText": JOB_ZONE.get(zones.get(s), ""),
            "education": edu_top,
            "titles": uniq(titles.get(s, []), 6),
            "altTitles": uniq(alt.get(s, []), 8),
            "interests": [RIASEC[k] for k, _ in ints],
            "related": rel,
            "tech": uniq(tech.get(s, []), 6),
            "tools": uniq(tools.get(s, []), 6),
        }
    lines = [
        "// Career detail text from the O*NET 30.1 Database (USDOL/ETA), CC BY 4.0.",
        "// Built by tools/gen_onet.py. Do not hand-edit.",
        "window.registerCareerDetails(" + json.dumps(out, ensure_ascii=False, indent=1) + ");",
        "",
    ]
    with open(a.out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("wrote", a.out, len(out), "careers")


if __name__ == "__main__":
    main()
