#!/usr/bin/env python3
"""Generate data/states/<ST>/programs-ipeds.js for every state from IPEDS.

Inputs (download once from https://nces.ed.gov/ipeds/datacenter/data/):
  HD2024.zip      institution directory (name, address, lat/lng, sector, system, web)
  C2024_A.zip     completions by CIP code and award level, 2023-24
  IC2023_AY.zip   tuition and fees, 2023-24 academic year
  and the Census CBSA delineation file list1_2023.xlsx (metro names).

Usage:
  python3 tools/gen_programs_ipeds.py --ipeds /path/with/extracted/csvs --out data/states

One record per (institution, career, award bucket) that actually graduated
someone in 2023-24. Curated CA programs in data/programs.js win over generated
ones for the same institution + career.
"""
import argparse
import difflib
import json
import os
import re
from collections import defaultdict

import pandas as pd

# ----------------------------------------------------------------------------
# Career -> CIP codes.  (cip, youth-facing title, allowed buckets)
# Buckets: cert (<2 yr awards), assoc, bach, grad
# ----------------------------------------------------------------------------
ALL = ("cert", "assoc", "bach", "grad")
CAREER_CIPS = {
    "accountant": [("52.0301", "Accounting", ("assoc", "bach", "grad", "cert")), ("52.0302", "Accounting Technology / Bookkeeping", ("cert", "assoc"))],
    "animator": [("10.0304", "Animation and Interactive Media", ALL), ("50.0411", "Game and Interactive Media Design", ALL)],
    "architect": [("04.0201", "Architecture", ("bach", "grad")), ("04.0902", "Architectural Technology", ("cert", "assoc", "bach")), ("15.1303", "Architectural Drafting and CAD", ("cert", "assoc"))],
    "automechanic": [("47.0604", "Automotive Technology", ("cert", "assoc")), ("47.0613", "Diesel and Heavy Vehicle Technology", ("cert", "assoc")), ("47.0614", "Alternative Fuel Vehicle Technology", ("cert", "assoc"))],
    "baker": [("12.0501", "Baking and Pastry Arts", ("cert", "assoc"))],
    "barber": [("12.0402", "Barbering", ("cert", "assoc"))],
    "carpenter": [("46.0201", "Carpentry", ("cert", "assoc"))],
    "chef": [("12.0503", "Culinary Arts", ("cert", "assoc", "bach")), ("12.0504", "Restaurant and Culinary Management", ("cert", "assoc", "bach")), ("12.0500", "Cooking and Culinary Arts", ("cert", "assoc"))],
    "civilengineer": [("14.0801", "Civil Engineering", ("bach", "grad")), ("15.0201", "Civil Engineering Technology", ("cert", "assoc", "bach"))],
    "cosmetology": [("12.0401", "Cosmetology", ("cert", "assoc")), ("12.0409", "Esthetics", ("cert",)), ("12.0410", "Nail Technology", ("cert",))],
    "cybersecurity": [("11.1003", "Cybersecurity / Information Systems Security", ALL), ("43.0403", "Cyber and Computer Forensics", ALL)],
    "datascience": [("30.7001", "Data Science", ("assoc", "bach", "grad", "cert")), ("30.7101", "Data Analytics", ("assoc", "bach", "grad", "cert")), ("27.0501", "Statistics", ("bach", "grad"))],
    "dentalassistant": [("51.0601", "Dental Assisting", ("cert", "assoc"))],
    "earlychildhood": [("13.1210", "Early Childhood Education", ALL), ("19.0709", "Child Care Provider", ("cert", "assoc")), ("19.0708", "Child Care Management", ("cert", "assoc", "bach"))],
    "emt": [("51.0904", "Emergency Medical Technology (EMT / Paramedic)", ("cert", "assoc", "bach"))],
    "firefighter": [("43.0203", "Fire Science / Firefighting", ("cert", "assoc", "bach")), ("43.0202", "Fire Services Administration", ("assoc", "bach", "grad")), ("43.0201", "Fire Prevention and Safety Technology", ("cert", "assoc"))],
    "hvac": [("47.0201", "HVAC and Refrigeration Technology", ("cert", "assoc"))],
    "infotech": [("11.0103", "Information Technology", ALL), ("11.0901", "Computer Networking", ("cert", "assoc", "bach")), ("11.1006", "Computer Support Specialist", ("cert", "assoc"))],
    "librarytech": [("25.0301", "Library Technician", ("cert", "assoc")), ("25.0101", "Library and Information Science", ("bach", "grad"))],
    "masonry": [("46.0101", "Masonry", ("cert", "assoc"))],
    "mathematician": [("27.0101", "Mathematics", ("bach", "grad")), ("27.0301", "Applied Mathematics", ("bach", "grad"))],
    "mechanicalengineer": [("14.1901", "Mechanical Engineering", ("bach", "grad")), ("15.0805", "Mechanical Engineering Technology", ("cert", "assoc", "bach"))],
    "medassistant": [("51.0801", "Medical Assisting", ("cert", "assoc"))],
    "nurse": [("51.3801", "Registered Nursing (RN)", ("assoc", "bach", "grad")), ("51.3901", "Licensed Practical / Vocational Nursing (LPN/LVN)", ("cert", "assoc"))],
    "paralegal": [("22.0302", "Paralegal Studies", ("cert", "assoc", "bach")), ("22.0301", "Legal Administrative Assistant", ("cert", "assoc"))],
    "pharmtech": [("51.0805", "Pharmacy Technician", ("cert", "assoc"))],
    "phlebotomist": [("51.1009", "Phlebotomy", ("cert", "assoc"))],
    "photography": [("50.0605", "Photography", ALL), ("50.0406", "Commercial Photography", ("cert", "assoc", "bach"))],
    "plumber": [("46.0503", "Plumbing Technology", ("cert", "assoc")), ("46.0502", "Pipefitting", ("cert", "assoc"))],
    "radtech": [("51.0911", "Radiologic Technology", ("cert", "assoc", "bach")), ("51.0907", "Medical Radiologic Technology", ("cert", "assoc", "bach"))],
    "resptherapist": [("51.0908", "Respiratory Therapy", ("assoc", "bach", "grad")), ("51.0812", "Respiratory Therapy Technician", ("cert", "assoc"))],
    "salesmanager": [("52.1804", "Sales and Selling Skills", ("cert", "assoc", "bach")), ("52.1401", "Marketing", ("assoc", "bach", "grad"))],
    "sociologist": [("45.1101", "Sociology", ("assoc", "bach", "grad"))],
    "technicalwriter": [("23.1303", "Professional and Technical Writing", ALL), ("23.1301", "Writing", ALL)],
    "trades": [("46.0302", "Electrician", ("cert", "assoc")), ("46.0301", "Electrical and Power Transmission Installation", ("cert", "assoc")), ("46.0303", "Lineworker", ("cert", "assoc"))],
    "urbanplanner": [("04.0301", "Urban and Regional Planning", ("bach", "grad"))],
    "veterinarian": [("51.2401", "Veterinary Medicine (DVM)", ("grad",)), ("51.0808", "Veterinary Technology", ("cert", "assoc", "bach")), ("01.0901", "Animal Sciences (pre-vet)", ("bach",))],
    "welding": [("48.0508", "Welding Technology", ("cert", "assoc"))],
    "author": [("23.1302", "Creative Writing", ("bach", "grad", "cert")), ("23.0101", "English", ("assoc", "bach", "grad")), ("09.0401", "Journalism", ("assoc", "bach", "grad"))],
}

AWLEVEL_BUCKET = {1: "cert", 2: "cert", 20: "cert", 21: "cert", 4: "cert", 3: "assoc", 5: "bach", 6: "grad", 7: "grad", 8: "grad", 17: "grad", 18: "grad", 19: "grad"}
BUCKET_LABEL = {"cert": "Certificate", "assoc": "Associate degree", "bach": "Bachelor's degree", "grad": "Graduate degree"}
BUCKET_DURATION = {"cert": "Certificate, under 2 yrs", "assoc": "2 yr Associate", "bach": "4 yr Bachelor's", "grad": "Graduate degree"}
BUCKET_RANK = {"cert": 0, "assoc": 1, "bach": 2, "grad": 3}

STATE_NAMES = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}

CA_REGION_BY_COUNTY = {}
for region, counties in {
    "Inland Empire": ["Riverside", "San Bernardino"],
    "Orange County": ["Orange"],
    "Los Angeles": ["Los Angeles"],
    "San Diego": ["San Diego"],
    "Imperial": ["Imperial"],
    "Central Coast": ["Ventura", "Santa Barbara", "San Luis Obispo", "Monterey", "San Benito", "Santa Cruz"],
    "Central Valley": ["Kern", "Tulare", "Kings", "Fresno", "Madera", "Merced", "Stanislaus", "San Joaquin"],
    "Bay Area": ["Alameda", "Contra Costa", "Marin", "Napa", "San Francisco", "San Mateo", "Santa Clara", "Solano", "Sonoma"],
    "Sacramento": ["Sacramento", "Placer", "El Dorado", "Yolo", "Sutter", "Yuba", "Nevada"],
    "North State": ["Butte", "Shasta", "Humboldt", "Del Norte", "Siskiyou", "Modoc", "Lassen", "Plumas", "Tehama", "Glenn", "Colusa", "Lake", "Mendocino", "Trinity", "Sierra"],
    "Sierra": ["Amador", "Calaveras", "Tuolumne", "Mariposa", "Mono", "Inyo", "Alpine"],
}.items():
    for c in counties:
        CA_REGION_BY_COUNTY[c] = region

PELL = 7395
ETV = 5000


def read_csv(path):
    try:
        return pd.read_csv(path, encoding="utf-8-sig", low_memory=False)
    except UnicodeDecodeError:
        d = pd.read_csv(path, encoding="latin1", low_memory=False)
        d.columns = [c.replace("﻿", "").replace("ï»¿", "") for c in d.columns]
        return d


def norm_inst(name):
    s = name.lower()
    s = s.replace("california state polytechnic university", "cal poly")
    s = s.replace("california polytechnic state university", "cal poly")
    s = re.sub(r"california state university[,\s-]*", "csu ", s)
    s = re.sub(r"university of california[,\s-]*", "uc ", s)
    s = s.replace("mt.", "mt").replace("st.", "st").replace("&", "and")
    s = re.sub(r"\b(the|of|at|college|university|community|district)\b", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_curated(programs_js, careers_dir):
    """Return {norm_inst: set(career_ids)} from the legacy CA data."""
    text = open(programs_js, encoding="utf-8").read()
    names = dict(re.findall(r'"([a-z0-9-]+)":\s*\{\s*name:\s*"([^"]+)"', text))
    prog_to_career = defaultdict(set)
    for fn in os.listdir(careers_dir):
        src = open(os.path.join(careers_dir, fn), encoding="utf-8").read()
        cid = re.search(r'id:\s*"([^"]+)"', src)
        plist = re.search(r"programs:\s*\[([^\]]*)\]", src)
        if not cid or not plist:
            continue
        for pid in re.findall(r'"([^"]+)"', plist.group(1)):
            prog_to_career[pid].add(cid.group(1))
    out = defaultdict(set)
    for pid, name in names.items():
        inst = name.split(" — ")[0].split(" - ")[0]
        for c in prog_to_career.get(pid, ()):
            out[norm_inst(inst)].add(c)
    return out


def fmt_phone(raw):
    s = re.sub(r"\D", "", str(raw))
    if len(s) >= 10:
        s = s[:10]
        return f"({s[:3]}) {s[3:6]}-{s[6:]}"
    return ""


def norm_url(u):
    if not isinstance(u, str) or not u.strip() or u.strip() in ("-2", "-1"):
        return ""
    u = u.strip()
    if not re.match(r"^https?://", u, re.I):
        u = "https://" + u
    return u


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ipeds", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "states"))
    ap.add_argument("--legacy", default=os.path.join(os.path.dirname(__file__), "..", "data", "programs.js"))
    ap.add_argument("--careers", default=os.path.join(os.path.dirname(__file__), "..", "data", "careers"))
    a = ap.parse_args()

    hd = read_csv(os.path.join(a.ipeds, "HD2024", "HD2024.csv"))
    comp = read_csv(os.path.join(a.ipeds, "C2024_A", "C2024_a.csv"))
    ic = read_csv(os.path.join(a.ipeds, "IC2023_AY", "ic2023_ay.csv"))
    cbsa = pd.read_excel(os.path.join(a.ipeds, "cbsa_list1_2023.xlsx"), header=2)

    hd = hd[(hd.CYACTIVE == 1) & (hd.STABBR.isin(STATE_NAMES.keys()))].copy()
    hd["UNITID"] = hd.UNITID.astype(int)
    hd = hd.set_index("UNITID")

    # tuition: in-district (TUITION1/FEE1) for 2-year publics, else in-state (TUITION2/FEE2)
    ic = ic.set_index("UNITID")
    def money(v):
        try:
            v = float(v)
            return int(round(v)) if v > 0 else None
        except Exception:
            return None
    tuition = {}
    for uid, row in ic.iterrows():
        t1, f1 = money(row.get("TUITION1")), money(row.get("FEE1"))
        t2, f2 = money(row.get("TUITION2")), money(row.get("FEE2"))
        tuition[int(uid)] = {"indistrict": (t1 or 0) + (f1 or 0) if t1 else None, "instate": (t2 or 0) + (f2 or 0) if t2 else None}

    # CBSA code -> short metro name
    cbsa["CBSA Code"] = pd.to_numeric(cbsa["CBSA Code"], errors="coerce")
    cbsa_name = {}
    for _, r in cbsa.dropna(subset=["CBSA Code"]).iterrows():
        title = str(r["CBSA Title"]).split(",")[0]
        parts = title.split("-")
        short = parts[0] if len(parts) == 1 or len(parts[0]) > 4 else "-".join(parts[:2])
        cbsa_name[int(r["CBSA Code"])] = short

    # CIP lookup
    cip_info = {}
    for career, lst in CAREER_CIPS.items():
        for cip, title, buckets in lst:
            cip_info.setdefault(cip, []).append((career, title, set(buckets)))

    comp = comp[(comp.MAJORNUM == 1) & (comp.CTOTALT > 0)].copy()
    comp["CIP"] = comp.CIPCODE.map(lambda x: f"{float(x):07.4f}")
    comp = comp[comp.CIP.isin(cip_info.keys())]
    comp["bucket"] = comp.AWLEVEL.map(AWLEVEL_BUCKET)
    comp = comp.dropna(subset=["bucket"])

    curated = load_curated(a.legacy, a.careers)
    curated_keys = list(curated.keys())

    # aggregate: (unitid, career, bucket) -> {grads, cips:{cip:grads}}
    agg = defaultdict(lambda: {"grads": 0, "cips": defaultdict(int), "titles": {}})
    for row in comp.itertuples(index=False):
        uid = int(row.UNITID)
        if uid not in hd.index:
            continue
        for career, title, buckets in cip_info[row.CIP]:
            if row.bucket not in buckets:
                continue
            k = (uid, career, row.bucket)
            agg[k]["grads"] += int(row.CTOTALT)
            agg[k]["cips"][row.CIP] += int(row.CTOTALT)
            agg[k]["titles"][row.CIP] = title

    per_state = defaultdict(dict)
    skipped_dup = 0
    for (uid, career, bucket), v in agg.items():
        inst = hd.loc[uid]
        st = inst.STABBR
        name = str(inst.INSTNM).strip()
        sector = int(inst.SECTOR)
        sysnam = str(inst.F1SYSNAM) if isinstance(inst.F1SYSNAM, str) else ""
        control = int(inst.CONTROL)
        for_profit = control == 3
        if st == "CA" and "California State University" in sysnam:
            tier = "csu"
        elif st == "CA" and sysnam.startswith("University of California"):
            tier = "uc"
        elif sector == 4:
            tier = "cc"
        elif sector == 1:
            tier = "public4"
        elif sector in (2, 5):
            tier = "private"
        elif sector in (3, 6):
            tier = "private"
        elif sector in (7, 8, 9):
            tier = "trade"
        else:
            tier = "private"
        if st == "CA" and tier in ("cc", "csu", "uc", "public4"):
            pass
        # dedup against curated CA data
        if st == "CA":
            n = norm_inst(name)
            hit = None
            if n in curated:
                hit = n
            else:
                m = difflib.get_close_matches(n, curated_keys, n=1, cutoff=0.86)
                if m:
                    hit = m[0]
            if hit and career in curated[hit]:
                skipped_dup += 1
                continue

        county = str(inst.COUNTYNM).replace(" County", "").strip() if isinstance(inst.COUNTYNM, str) else ""
        if st == "CA":
            region = CA_REGION_BY_COUNTY.get(county, "")
        else:
            try:
                region = cbsa_name.get(int(inst.CBSA), "")
            except Exception:
                region = ""
            if not region and county:
                region = county if re.search(r"(Borough|Parish|Census Area|Municipality|city)$", county) else county + " County"
        tu = tuition.get(uid, {})
        sticker = tu.get("indistrict") if tier == "cc" else None
        if not sticker:
            sticker = tu.get("instate") or tu.get("indistrict")
        if sticker is None:
            sticker = 0
        public = tier in ("cc", "csu", "uc", "public4") or (sector in (1, 4, 7))
        if st == "CA" and tier in ("cc", "csu", "uc"):
            real = 0
        else:
            real = max(0, sticker - PELL - ETV)
        top_cip = max(v["cips"].items(), key=lambda kv: kv[1])[0]
        title = v["titles"][top_cip]
        lat = float(inst.LATITUDE) if pd.notna(inst.LATITUDE) else None
        lng = float(inst.LONGITUD) if pd.notna(inst.LONGITUD) else None
        addr_parts = [str(inst.ADDR).strip() if isinstance(inst.ADDR, str) else "", str(inst.CITY).strip(), f"{st} {str(inst.ZIP).strip()[:5]}"]
        address = ", ".join([p for p in addr_parts if p])
        if st == "CA":
            action = {"cc": "Apply via CCCApply (free)", "csu": "Cal State Apply (Oct 1 to Nov 30 priority)", "uc": "UC Application (Aug 1 to Nov 30)"}.get(tier, "Apply on the school's site")
        else:
            action = "Apply on the school's site (ask for the fee waiver)"
        rec = {
            "name": f"{name} — {title} ({BUCKET_LABEL[bucket]})",
            "inst": name,
            "tier": tier,
            "state": st,
            "region": region,
            "loc": str(inst.CITY).strip(),
            "county": county,
            "address": address,
            "lat": round(lat, 5) if lat is not None else None,
            "lng": round(lng, 5) if lng is not None else None,
            "sticker": int(sticker),
            "realCost": int(real),
            "duration": BUCKET_DURATION[bucket],
            "action": action,
            "url": norm_url(inst.WEBADDR),
            "phone": fmt_phone(inst.GENTELE),
            "careers": [career],
            "cips": sorted(v["cips"].keys()),
            "grads": int(v["grads"]),
            "level": bucket,
            "public": bool(public),
            "forProfit": bool(for_profit),
            "source": "ipeds-2024",
            "verified": "2026-10",
        }
        if rec["lat"] is None:
            rec.pop("lat"); rec.pop("lng")
        if not rec["phone"]:
            rec.pop("phone")
        if not rec["url"]:
            rec.pop("url")
        if not rec["region"]:
            rec.pop("region")
        pid = f"{st.lower()}-{uid}-{career}-{bucket}"
        per_state[st][pid] = rec

    summary = {}
    for st, recs in sorted(per_state.items()):
        outdir = os.path.join(a.out, st)
        os.makedirs(outdir, exist_ok=True)
        lines = [
            "// Programs generated from IPEDS (NCES) completions 2023-24, HD2024, IC2023-24.",
            "// Built by tools/gen_programs_ipeds.py. Do not hand-edit; curate in a separate programs-curated.js instead.",
            f"// {STATE_NAMES[st]}: {len(recs)} records.",
            "window.registerPrograms({",
        ]
        def sort_key(kv):
            r = kv[1]
            return (r["inst"].lower(), r["careers"][0], BUCKET_RANK[r["level"]])
        for pid, r in sorted(recs.items(), key=sort_key):
            body = ", ".join(f"{k}: {js_str(v) if isinstance(v, str) else json.dumps(v)}" for k, v in r.items())
            lines.append(f"  {js_str(pid)}: {{ {body} }},")
        lines.append("});\n")
        with open(os.path.join(outdir, "programs-ipeds.js"), "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        insts = len({r["inst"] for r in recs.values()})
        summary[st] = {"programs": len(recs), "institutions": insts}
        print(f"{st} {len(recs):5d} programs  {insts:4d} institutions")
    print("skipped as duplicates of curated CA programs:", skipped_dup)
    print("total programs:", sum(s["programs"] for s in summary.values()))


if __name__ == "__main__":
    main()
