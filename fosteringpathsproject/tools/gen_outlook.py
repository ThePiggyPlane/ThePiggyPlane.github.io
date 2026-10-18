#!/usr/bin/env python3
"""National job outlook per career from the BLS Employment Projections
national employment matrix (https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx,
Table 1.2). Writes data/outlook.js: window.registerCareerOutlook({...}).

Usage: python3 tools/gen_outlook.py --xlsx /path/occupation.xlsx
"""
import argparse, json, os, re, sys
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from gen_onet import CAREER_SOC


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "outlook.js"))
    a = ap.parse_args()
    df = pd.read_excel(a.xlsx, sheet_name="Table 1.2", header=1)
    cols = {c: str(c) for c in df.columns}
    def col(prefix):
        for c in df.columns:
            if str(c).startswith(prefix):
                return c
        raise KeyError(prefix)
    title_c = col("2025 National Employment Matrix title")
    code_c = col("2025 National Employment Matrix code")
    rows = {str(r[code_c]).strip(): r for _, r in df.iterrows()}
    m = re.search(r"(\d{4})\D+(\d{4})", str(df.columns[7]))
    y0, y1 = (int(m.group(1)), int(m.group(2))) if m else (2025, 2035)
    total = rows.get("00-0000")
    nat_pct = float(total[col("Employment change, percent")]) if total is not None else None
    out = {}
    for career, socs in CAREER_SOC.items():
        code = socs[0].split(".")[0]
        r = rows.get(code)
        if r is None:
            print("missing", career, code); continue
        def num(prefix, scale=1.0, nd=1):
            try:
                v = float(r[col(prefix)])
                return None if v != v else (round(v * scale) if nd == 0 else round(v * scale, nd))
            except Exception:
                return None
        def txt(prefix, blank=None):
            v = r[col(prefix)]
            return blank if (not isinstance(v, str) or v.strip() in ("—", "-", "")) else v.strip()
        ooh = None
        for c in df.columns:
            if str(c).startswith("Related Occupational Outlook Handbook"):
                mm = re.search(r'href="([^"]+)"', str(r[c]))
                if mm: ooh = mm.group(1)
        out[career] = {
            "soc": code, "title": str(r[title_c]).strip(), "baseYear": y0, "projYear": y1,
            "employment": num("Employment, " + str(y0), 1000, 0),
            "employmentProj": num("Employment, " + str(y1), 1000, 0),
            "changePct": num("Employment change, percent"),
            "changeNum": num("Employment change, numeric", 1000, 0),
            "openings": num("Occupational openings", 1000, 0),
            "medianWage": num("Median annual wage", 1, 0),
            "entryEducation": txt("Typical education needed for entry"),
            "experience": txt("Work experience in a related occupation", "None"),
            "training": txt("Typical on-the-job training", "None"),
            "ooh": ooh,
            "usChangePct": nat_pct,
        }
        out[career] = {k: v for k, v in out[career].items() if v is not None}
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(f"// National job outlook per career, BLS Employment Projections {y0}-{y1} (occupation.xlsx, Table 1.2).\n")
        f.write("// Built by tools/gen_outlook.py. Do not hand-edit.\n")
        f.write("window.registerCareerOutlook(" + json.dumps(out, ensure_ascii=False, indent=1) + ");\n")
    print("wrote", a.out, len(out), "careers; US change", nat_pct)


if __name__ == "__main__":
    main()
