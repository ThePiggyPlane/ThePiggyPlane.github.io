# Fostering Paths: status and how to continue

Written 2026-10-18 at the end of the first overnight build. Read AGENTS.md for
the data contract; this file is the state of the project and the playbook.

## What is done

- Site is state-aware: pick a state and region (or share your location), and
  programs, wages, resources, scholarships, the guide and the map follow it.
- Programs for all 51 states from IPEDS 2023-24 completions (33,565 records at
  about 4,000 schools), with net price for low-income students, graduation
  rate, enrollment, housing, childcare, application fee, open admission, Pell
  share, and College Scorecard earnings for about half the schools.
- Wages for every state and about 390 metro areas (BLS OES May 2025, with
  yearly change vs May 2024) and the national outlook per career (BLS
  Employment Projections 2025-35).
- Career descriptions, tasks and preparation from O*NET 30.1.
- California: full state guide, 14 scholarships and grants, statewide and
  LA / Sacramento resources, a campus foster youth record for all 141 public
  campuses (office contacts still flagged unverified), the DAS apprenticeship
  registry.
- Pages: Start Here, FAQ and glossary, Your State, Resources, Scholarships,
  My Plan (checklist with saved careers and schools), school pages, map.

## What is not done, in order of value

1. State guides, scholarships and resources for the other 50 states. Use the
   research pipeline below; one state per research run; Texas, Florida, New
   York, Ohio, Pennsylvania, Illinois, Georgia, North Carolina, Michigan,
   Arizona, Washington first.
2. California county resources beyond Los Angeles and Sacramento (ILP offices,
   THP-Plus providers, FYI voucher contacts per county), and verified office
   contacts for the 141 campus records (tag `campus-contact-unverified`).
3. College Scorecard earnings for the remaining ~3,000 schools: needs an
   api.data.gov key (free); then `scratchpad/ipeds/fetch_scorecard.py` logic
   with skip-existing, and re-run tools/gen_programs_ipeds.py.
4. Apprenticeship registries outside California (DOL RAPIDS data; the
   apprenticeship.gov finder link is shown meanwhile).
5. National scholarships beyond Foster Love and Pell (FC2S, Casey, iFoster and
   others) through the research pipeline with scope "national".

## Pipelines that need no browsing

- Programs: `python3 tools/gen_programs_ipeds.py --ipeds <dir with HD2024, C2024_A, IC2023_AY, IC2023, SFA2223, DRVGR2023, DRVEF2023, cbsa_list1_2023.xlsx> --sfa ... --ic ... --scorecard ... --gr ...`
  IPEDS files come from https://nces.ed.gov/ipeds/datacenter/data/<NAME>.zip.
- Wages: download oesm<yy>st.zip, oesm<yy>ma.zip, oesm<yy>nat.zip (and the prior
  year) from https://www.bls.gov/oes/special-requests/, filter to the covered
  SOC codes, then `python3 tools/gen_wages_oes.py --csv <dir> --cbsa <cbsa xlsx>`.
- Outlook: https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx, then
  `python3 tools/gen_outlook.py --xlsx occupation.xlsx`.
- O*NET: db text files from onetcenter.org, then `python3 tools/gen_onet.py --onet <dir>`.
- California campus stubs: `python3 tools/gen_ca_campus_stubs.py --hd <HD2024.csv>`.
- After any data change: `node tools/validate.js && node tools/build-index.js`.
- Smoke test: `node tools/smoke.js "home,map,career/nurse,state" "CA,TX"` (needs Playwright).

## Research pipeline (one state per run)

1. Fill `tools/state_research_prompt.md` for the state and run it with the
   Advanced Research tool (the user must have the Research toggle on for that
   message; agents with WebFetch prompt the user on every page and must not be
   used for this).
2. Save the report to a file and run `python3 tools/import_state_json.py report.md`.
3. Validate, build-index, read the guide once for tone, commit.

## Publishing

All work is committed on `main` locally. Pushing needs the Claude GitHub App
installed for the ThePiggyPlane org (https://github.com/apps/claude/installations/select_target),
then `git push origin HEAD:main` from the repo root. GitHub Pages serves the
repo as-is; `.nojekyll` is in place.

## Things that do not work from the cloud session

- WebFetch and browsing agents: each page prompts the user. Do not use them
  for bulk work.
- api.bls.gov without a key: the shared daily quota is usually exhausted. The
  OES special-request zips work with a plain project User-Agent.
- Census API (needs a key), data.gov CKAN API (404), College Scorecard beyond
  the DEMO_KEY daily limit.
