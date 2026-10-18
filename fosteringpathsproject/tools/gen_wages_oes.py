#!/usr/bin/env python3
"""Wage files for every state and metro from the BLS Occupational Employment and
Wage Statistics (OES) May 2025 tables, with May 2024 for year-over-year change.

Inputs (download from https://www.bls.gov/oes/special-requests/ : oesm25st.zip,
oesm25ma.zip, oesm25nat.zip, oesm24st.zip, oesm24ma.zip, oesm24nat.zip), unzipped,
then filtered to the covered occupations with the helper in the scratchpad
(filter_oes.py) so the CSVs are small:
  state_M2025_dl.csv, state_M2024_dl.csv, MSA_M2025_dl.csv, MSA_M2024_dl.csv,
  BOS_M2025_dl.csv, national_M2025_dl.csv, national_M2024_dl.csv

Output:
  data/states/<ST>/wages.js   window.registerWages({state, geo, dataYear, careers, regions})
  data/national/wages.js      window.registerWages({state: "US", ...})

Region keys match the region labels the program generator uses: the custom
California regions, and the CBSA short names elsewhere (tools/gen_programs_ipeds.py).
Suppressed cells ("*", "**", "#") are left out, never estimated.

Usage:
  python3 tools/gen_wages_oes.py --csv /path/to/csv --cbsa /path/to/cbsa_list1_2023.xlsx
"""
import argparse, json, os, re, sys
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from gen_onet import CAREER_SOC
from gen_programs_ipeds import cbsa_short_names
from gen_wages_bls import STATE_NAME

# California regions -> the OES area that best represents them (code, label).
CA_REGION_AREA = {
    "Inland Empire": (40140, "Riverside-San Bernardino-Ontario metro"),
    "Los Angeles": (31080, "Los Angeles-Long Beach-Anaheim metro"),
    "Orange County": (31080, "Los Angeles-Long Beach-Anaheim metro (includes Orange County)"),
    "San Diego": (41740, "San Diego-Chula Vista-Carlsbad metro"),
    "Imperial": (20940, "El Centro metro"),
    "Central Coast": (37100, "Oxnard-Thousand Oaks-Ventura metro"),
    "Central Valley": (23420, "Fresno metro"),
    "Bay Area": (41860, "San Francisco-Oakland-Fremont metro"),
    "Sacramento": (40900, "Sacramento-Roseville-Folsom metro"),
    "North State": (17020, "Chico metro"),
    "Sierra": (600006, "Eastern Sierra-Mother Lode nonmetropolitan area"),
}

NUM = ["TOT_EMP", "JOBS_1000", "LOC_QUOTIENT", "A_MEAN", "A_MEDIAN", "A_PCT10", "A_PCT25", "A_PCT75", "A_PCT90", "H_MEDIAN"]


def load(csv_dir, name):
    df = pd.read_csv(os.path.join(csv_dir, name), low_memory=False)
    for c in NUM:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    df["OCC"] = df.OCC_CODE.astype(str).str.strip()
    return df


def soc_of(career):
    return CAREER_SOC[career][0].split(".")[0]


def record(row, prev):
    """One career's wage record from a current-year row and (optionally) last year's."""
    r = {}
    def put(k, v, f=int):
        if v is not None and not pd.isna(v):
            r[k] = f(v)
    put("employed", row.TOT_EMP)
    if not pd.isna(row.JOBS_1000) and row.JOBS_1000 > 0:
        r["fractionPct"] = round(float(row.JOBS_1000) / 10, 2)
        r["oneInN"] = int(round(1000 / float(row.JOBS_1000)))
    put("vsNational", row.LOC_QUOTIENT, lambda v: round(float(v), 2))
    put("medianWage", row.A_MEDIAN)
    put("range50Low", row.A_PCT25)
    put("range50High", row.A_PCT75)
    put("range80Low", row.A_PCT10)
    put("range80High", row.A_PCT90)
    put("hourlyMedian", row.H_MEDIAN, lambda v: round(float(v), 2))
    if prev is not None:
        if "employed" in r and not pd.isna(prev.TOT_EMP) and prev.TOT_EMP > 0:
            r["yearlyChange"] = int(row.TOT_EMP - prev.TOT_EMP)
            r["yearlyChangePct"] = round((row.TOT_EMP - prev.TOT_EMP) / prev.TOT_EMP * 100, 1)
        if "medianWage" in r and not pd.isna(prev.A_MEDIAN) and prev.A_MEDIAN > 0:
            r["wageChange"] = int(row.A_MEDIAN - prev.A_MEDIAN)
            r["wageChangePct"] = round((row.A_MEDIAN - prev.A_MEDIAN) / prev.A_MEDIAN * 100, 1)
    return r


def careers_for(area_rows, prev_rows):
    cur = {r.OCC: r for r in area_rows.itertuples(index=False)}
    prv = {r.OCC: r for r in prev_rows.itertuples(index=False)} if prev_rows is not None else {}
    out = {}
    for career in CAREER_SOC:
        row = cur.get(soc_of(career))
        if row is None:
            continue
        rec = record(row, prv.get(soc_of(career)))
        if "medianWage" in rec or "employed" in rec:
            out[career] = rec
    return out


def write_js(path, obj, comment):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(comment + "\n// Built by tools/gen_wages_oes.py. Do not hand-edit.\n")
        f.write("window.registerWages(" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ");\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--cbsa", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data"))
    a = ap.parse_args()
    year, prev_year = 2025, 2024
    st = load(a.csv, f"state_M{year}_dl.csv"); st0 = load(a.csv, f"state_M{prev_year}_dl.csv")
    msa = load(a.csv, f"MSA_M{year}_dl.csv"); msa0 = load(a.csv, f"MSA_M{prev_year}_dl.csv")
    bos = load(a.csv, f"BOS_M{year}_dl.csv")
    nat = load(a.csv, f"national_M{year}_dl.csv"); nat0 = load(a.csv, f"national_M{prev_year}_dl.csv")
    cbsa = pd.read_excel(a.cbsa, header=2)
    short = cbsa_short_names(cbsa)
    source = f"BLS Occupational Employment and Wage Statistics, May {year} (change vs May {prev_year})"

    # National
    nat_careers = careers_for(nat, nat0)
    write_js(os.path.join(a.out, "national", "wages.js"),
             {"state": "US", "geo": "United States", "dataYear": year, "source": source, "verified": "2026-10", "careers": nat_careers},
             f"// National wages for Fostering Paths careers, BLS OES May {year}.")
    print("US", len(nat_careers), "careers")

    # Metro areas by state. Titles end with ", TX" or ", MO-KS"; the area belongs to every listed state.
    msa_states = {}
    for area, title in msa[["AREA", "AREA_TITLE"]].drop_duplicates().itertuples(index=False):
        m = re.search(r", ([A-Z]{2}(?:-[A-Z]{2})*)$", str(title))
        msa_states[int(area)] = (m.group(1).split("-") if m else [], str(title))

    written = 0
    for st_code, name in STATE_NAME.items():
        rows = st[st.PRIM_STATE == st_code]
        if rows.empty:
            continue
        careers = careers_for(rows, st0[st0.PRIM_STATE == st_code])
        regions = {}
        if st_code == "CA":
            for region, (area, label) in CA_REGION_AREA.items():
                src, src0 = (bos, None) if area >= 600000 else (msa, msa0)
                rr = src[src.AREA == area]
                if rr.empty:
                    continue
                c = careers_for(rr, src0[src0.AREA == area] if src0 is not None else None)
                if c:
                    regions[region] = {"geo": label, "careers": c}
        else:
            for area, (states, title) in msa_states.items():
                if st_code not in states or area not in short:
                    continue
                c = careers_for(msa[msa.AREA == area], msa0[msa0.AREA == area])
                if c:
                    regions[short[area]] = {"geo": title.replace(", " + "-".join(states), "") + " metro", "careers": c}
        obj = {"state": st_code, "geo": name, "dataYear": year, "source": source, "verified": "2026-10", "careers": careers}
        if regions:
            obj["regions"] = regions
        write_js(os.path.join(a.out, "states", st_code, "wages.js"), obj,
                 f"// {name} wages for Fostering Paths careers, BLS OES May {year}, statewide and by metro area.")
        written += 1
        print(st_code, len(careers), "careers,", len(regions), "regions")
    print("wrote", written, "states")


if __name__ == "__main__":
    main()
