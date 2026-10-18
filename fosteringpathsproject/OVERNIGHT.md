# Overnight run protocol (scheduled task, fresh session each hour)

Each hourly run is a fresh cloud session. Do exactly one unit of work, chosen
by the current hour in America/Los_Angeles, then publish and stop.

## 0. Setup (every run)
1. `add_repo` ThePiggyPlane / ThePiggyPlane.github.io with access "push", then
   `git clone --depth 1 https://github.com/ThePiggyPlane/thepiggyplane.github.io /home/claude/thepiggyplane.github.io`.
2. If `fosteringpathsproject/AGENTS.md` is missing from the clone, the v2
   framework has not been pushed yet: in the Google Drive folder
   "Fostering Paths overnight" (search_files: title = 'Fostering Paths overnight'),
   read the text files `AGENTS.md`, `validate.js`, `build-index.js` with the
   Drive read tool and write them to `fosteringpathsproject/AGENTS.md`,
   `fosteringpathsproject/tools/validate.js`, `fosteringpathsproject/tools/build-index.js`.
   Create `fosteringpathsproject/data/states/<ST>/` directories as needed.
3. Read `fosteringpathsproject/AGENTS.md`. It is the data contract.
4. Make sure `node fosteringpathsproject/tools/validate.js` runs.

## 1. Pick the unit by hour (PT)
| hour | unit | output |
|---|---|---|
| 02 | State guides, Mid-Atlantic: NJ PA DE MD DC VA WV | data/states/<ST>/{guide,scholarships,resources}.js |
| 03 | State guides, South Central + Alaska: KY AR LA OK MO KS AK | same |
| 04 | State guides, Midwest: OH MI IN IL WI MN IA | same |
| 05 | State guides, Plains and Mountain: ND SD NE MT WY CO UT ID | same |
| 06 | Deep Texas: metro-level resources | data/states/TX/resources-metro.js |
| 07 | Deep Florida: metro-level resources | data/states/FL/resources-metro.js |
| 08 | Deep New York: metro-level resources | data/states/NY/resources-metro.js |
| 09 | State wages from BLS OEWS May 2024 for all states | data/states/<ST>/wages.js |
| 10+ | Disable this scheduled task (update_trigger enabled=false) and stop | |

Already covered by the launch session (do not redo): CA (all files), national
files, and state guides for NY MA CT RI NH VT ME, FL GA NC SC TN AL MS,
TX AZ NV OR WA NM HI.

## 2. Do the unit
Split the unit across 3 or 4 parallel subagents (Agent tool), one file set per
agent, each told to read AGENTS.md first and to follow the research method:
open pages only through WebSearch results (or links listed in an earlier
WebFetch result); never type a URL from memory; never fetch with curl, wget,
or python; write files as records are confirmed; run the validator on their
files before reporting. Give each subagent the exact file paths it owns.

Deep-state units (TX, FL, NY): resources at metro level. Campus foster youth
support programs at every public university and the 20 largest community
colleges in the state; regional ILP / transition offices; transitional housing
and FYI voucher contacts in the 5 largest metros; county or regional legal aid,
CASA, Job Corps, YouthBuild; emergency funds. Category and schema per
AGENTS.md; ids prefixed with the state code; `region` is the metro name.

Wages unit: for each state page "Occupational Employment and Wage Statistics,
May 2024, <State>" on bls.gov (find it with WebSearch, fetch the result URL),
extract annual median wage and employment for these SOC codes and write
`window.registerWages({ state, geo: "<State>", dataYear: 2024, source: "BLS OEWS May 2024", careers: { <careerId>: { medianWage, employed, meanWage } } })`:
accountant 13-2011, animator 27-1014, architect 17-1011, author 27-3043,
automechanic 49-3023, baker 51-3011, barber 39-5011, carpenter 47-2031,
chef 35-1011, civilengineer 17-2051, cosmetology 39-5012, cybersecurity 15-1212,
datascience 15-2051, dentalassistant 31-9091, earlychildhood 25-2011,
emt 29-2042, firefighter 33-2011, hvac 49-9021, infotech 15-1232,
librarytech 25-4031, masonry 47-2021, mathematician 15-2021,
mechanicalengineer 17-2141, medassistant 31-9092, nurse 29-1141,
paralegal 23-2011, pharmtech 29-2052, phlebotomist 31-9097, photography 27-4021,
plumber 47-2152, radtech 29-2034, resptherapist 29-1126, salesmanager 11-2022,
sociologist 19-3041, technicalwriter 27-3042, trades 47-2111,
urbanplanner 19-3051, veterinarian 29-1131, welding 51-4121.
Omit a career when the state page suppresses it. Sanity check: a state median
should be within 0.5x to 2x the national median in data/careers/<id>.js.

## 3. Publish (every run)
1. `cd fosteringpathsproject && node tools/build-index.js && node tools/validate.js` (must print OK; fix or remove any failing file).
2. `git add fosteringpathsproject && git commit -m "Fostering Paths overnight: <unit>"` (end the message with the Co-Authored-By line the session requires).
3. `git pull --rebase origin main` (if index.js conflicts, re-run build-index and continue the rebase), then `git push origin HEAD:main`.
4. If the push is refused (403: GitHub App not installed): create a subfolder
   `overnight-<unit>-<YYYYMMDD-HHMM>` inside the "Fostering Paths overnight"
   Drive folder and upload every new or changed file under
   `fosteringpathsproject/data/` into it with the Drive create_file tool, one
   call per file, as text (textContent, contentMimeType text/plain,
   disableConversionToGoogleType true, title = `<ST>__<filename>` such as
   `NJ__guide.js`). Also upload `REPORT.md` (what was done, counts, gaps).
   Nothing is lost that way; the morning session merges.
5. Finish with a 10-line summary: unit, files, counts, whether it was pushed or
   uploaded, and gaps for the next shift.
