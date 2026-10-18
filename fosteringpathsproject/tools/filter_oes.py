"""Filter the BLS OES xlsx tables (state, MSA, BOS, national; current and prior May) to the
occupations Fostering Paths covers and save them as CSV for tools/gen_wages_oes.py.
Usage: python3 tools/filter_oes.py <out_dir> <xlsx> [<xlsx> ...]
"""
import os, sys
import pandas as pd

out_dir = sys.argv[1]
occ = {"00-0000", "13-2011", "27-1014", "17-1011", "27-3043", "49-3023", "51-3011", "39-5011", "47-2031", "35-1011", "17-2051",
       "39-5012", "15-1212", "15-2051", "31-9091", "25-2011", "29-2042", "29-2043", "33-2011", "49-9021", "15-1232", "25-4031",
       "47-2021", "15-2021", "17-2141", "31-9092", "29-1141", "23-2011", "29-2052", "31-9097", "27-4021", "47-2152", "29-2034",
       "29-1126", "11-2022", "19-3041", "27-3042", "47-2111", "19-3051", "29-1131", "51-4121"}
os.makedirs(out_dir, exist_ok=True)
for path in sys.argv[2:]:
    df = pd.read_excel(path)
    keep = df[df.OCC_CODE.isin(occ)]
    if "NAICS" in keep.columns:
        keep = keep[keep.NAICS.astype(str).str.strip().isin(["0", "000000"])]
    if "OWN_CODE" in keep.columns:
        keep = keep[keep.OWN_CODE.astype(str).isin(["1235", "1235.0"])]
    name = os.path.splitext(os.path.basename(path))[0] + ".csv"
    keep.to_csv(os.path.join(out_dir, name), index=False)
    print(name, len(df), "->", len(keep), "rows;", keep.AREA_TITLE.nunique(), "areas")
