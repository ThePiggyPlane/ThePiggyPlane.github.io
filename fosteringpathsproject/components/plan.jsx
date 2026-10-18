// My plan: a checklist the youth owns, stored in this browser only.
// Universal steps, the state's first-week steps, saved careers and saved schools.

const PLAN_DONE_KEY = "cp:plan:done";
const PLAN_SCHOOLS_KEY = "cp:plan:schools";

const readJson = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } };
const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

const useSavedSchools = () => {
  const [schools, setSchools] = React.useState(() => readJson(PLAN_SCHOOLS_KEY, []));
  const toggle = (st, inst) => setSchools(xs => {
    const next = xs.some(x => x.st === st && x.inst === inst) ? xs.filter(x => !(x.st === st && x.inst === inst)) : [...xs, { st, inst }];
    writeJson(PLAN_SCHOOLS_KEY, next);
    window.dispatchEvent(new CustomEvent("fp:plan"));
    return next;
  });
  React.useEffect(() => {
    const on = () => setSchools(readJson(PLAN_SCHOOLS_KEY, []));
    window.addEventListener("fp:plan", on); return () => window.removeEventListener("fp:plan", on);
  }, []);
  return [schools, toggle];
};

const planItems = (loc, guide, stateName) => {
  const items = [
    { id: "letter", title: "Get your foster care verification letter", body: "From your caseworker, the state agency, or the foster care ombudsman. Keep a photo on your phone; every program below asks for it.", href: guide && guide.agency && guide.agency.url, label: guide && guide.agency ? guide.agency.name : "Your state agency" },
    { id: "fafsa", title: "File the FAFSA as an independent student", body: "Answer yes to the foster care question. No parent information. This unlocks the Pell Grant and most campus aid.", href: "https://studentaid.gov/h/apply-for-aid/fafsa", label: "studentaid.gov" },
    { id: "etv", title: `Apply for the ${stateName} ETV (Chafee) voucher`, body: "Up to $5,000 a year for school, housing, books, a laptop, or transportation.", href: guide && guide.etv && guide.etv.url, view: "state", label: guide && guide.etv && guide.etv.admin ? guide.etv.admin : "How your state runs ETV" },
    { id: "medicaid", title: "Enroll in Medicaid for former foster youth (to 26)", body: "No income test if you were in care at 18. Works in any state you move to.", href: guide && guide.medicaidTo26 && guide.medicaidTo26.url, view: "state", label: guide && guide.medicaidTo26 && guide.medicaidTo26.name ? guide.medicaidTo26.name : "Your state's program" },
    { id: "efc", title: "If you are under 21: ask about extended foster care", body: "A place to live, a monthly payment, and a worker while you start school or work. You can usually re-enter after leaving.", view: "state", label: "Your state's rules" },
    { id: "campus", title: "Email the foster youth program at each school you are considering", body: "Ask about priority registration, housing over breaks, laptops, and the application fee waiver. Save schools from their pages and they show up below.", view: "resources", label: "Campus programs" },
    { id: "apply", title: "Apply to the school and ask for the fee waiver", body: "Community colleges usually have no fee and no deadline. Universities have deadlines; the foster youth program can get the fee waived.", href: guide && guide.collegeApps && guide.collegeApps[0] && guide.collegeApps[0].url, label: guide && guide.collegeApps && guide.collegeApps[0] ? guide.collegeApps[0].name : null },
    { id: "scholarships", title: "Apply for foster youth scholarships", body: "They stack on top of Pell, ETV, and waivers. Most want the verification letter and a short essay.", view: "scholarships", label: "Scholarships for your state" },
    { id: "housing", title: "Ask about housing help before you need it", body: "FYI vouchers (ages 18 to 24), transitional housing, and campus housing over breaks all have waitlists. Ask early.", view: "resources", label: "Housing near you" },
    { id: "taxes", title: "File a tax return every year, even with low income", body: "Former foster youth can claim the federal Earned Income Tax Credit at 18 (most people wait until 25). Some states add a foster youth credit. Free filing at the IRS site.", href: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free", label: "IRS Free File" },
  ];
  if (guide && guide.firstWeek && guide.firstWeek.length) {
    guide.firstWeek.forEach((s, i) => items.push({ id: `fw-${i}`, title: `${stateName}: ${s.title}`, body: s.body, href: s.url, label: s.url ? "Open" : null, state: true }));
  }
  return items;
};

const CpPlan = ({ go, saved, toggleSave }) => {
  const { loc, status } = useFpLocation();
  const stateName = window.stateName(loc.state);
  const guide = window.STATE_GUIDES.get(loc.state);
  const [done, setDone] = React.useState(() => readJson(PLAN_DONE_KEY, {}));
  const [schools, toggleSchool] = useSavedSchools();
  const [copied, setCopied] = React.useState(false);
  const items = planItems(loc, guide, stateName);
  const toggleDone = (id) => setDone(d => { const n = { ...d, [id]: !d[id] }; if (!n[id]) delete n[id]; writeJson(PLAN_DONE_KEY, n); return n; });
  const doneCount = items.filter(i => done[i.id]).length;
  const careers = (saved || []).map(id => window.CAREERS.byId(id)).filter(Boolean);
  const asText = () => {
    const lines = [`My plan (Fostering Paths, ${loc.region ? loc.region + ", " : ""}${stateName})`, ""];
    items.forEach(i => lines.push(`[${done[i.id] ? "x" : " "}] ${i.title}${i.href ? " " + i.href : ""}`));
    if (careers.length) { lines.push("", "Careers I am looking at:"); careers.forEach(c => lines.push(`- ${c.name} ($${window.WAGES.salary(c).median}K median)`)); }
    if (schools.length) { lines.push("", "Schools I am looking at:"); schools.forEach(s => lines.push(`- ${s.inst} (${s.st})`)); }
    lines.push("", "https://www.tylerjohnpeters.com/fosteringpathsproject/");
    return lines.join("\n");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(asText()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { window.prompt("Copy your plan:", asText()); }
  };
  return (
    <main className="cp-main narrow cp-plan">
      <div className="cp-eyebrow">My plan</div>
      <h1 className="cp-h1">Your next steps, in order</h1>
      <p className="cp-lede">{doneCount} of {items.length} done. Saved in this browser only; nothing is sent anywhere. Print it or copy it to text your caseworker.</p>
      <div className="cp-cta-row cp-plan-actions">
        <button className="cp-btn-ghost" onClick={() => window.print()}>Print</button>
        <button className="cp-btn-ghost" onClick={copy}>{copied ? "Copied" : "Copy as text"}</button>
        {doneCount > 0 && <button className="cp-link" onClick={() => { setDone({}); writeJson(PLAN_DONE_KEY, {}); }}>Reset checklist</button>}
      </div>
      <ol className="cp-plan-list">
        {items.map(it => (
          <li key={it.id} className={"cp-plan-item" + (done[it.id] ? " done" : "")}>
            <label className="cp-plan-check">
              <input type="checkbox" checked={!!done[it.id]} onChange={() => toggleDone(it.id)} aria-label={`Done: ${it.title}`} />
              <span />
            </label>
            <div>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
              <div className="cp-step-links">
                {it.href && <a className="cp-step-link" href={it.href} target="_blank" rel="noopener">{it.label || "Open"} →</a>}
                {!it.href && it.view && <button className="cp-step-link cp-link" onClick={() => go(it.view)}>{it.label} →</button>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {!guide && status !== "loading" && <p className="cp-filter-meta">The {stateName} guide is not written yet, so the state-specific steps are missing here. The <button className="cp-link" onClick={() => go("start")}>Start Here</button> page covers what is true everywhere.</p>}

      <h2 className="cp-h2">Careers I am looking at</h2>
      {careers.length === 0 ? <p className="cp-filter-meta">None saved yet. Tap "+ Save" on any career.</p> : (
        <div className="cp-plan-saved">
          {careers.map(c => { const w = window.WAGES.salary(c); const n = window.PROGRAMS.forCareer(c.id, loc.region ? { state: loc.state, region: loc.region } : { state: loc.state }).length; return (
            <div key={c.id} className="cp-plan-row">
              <button className="cp-link cp-plan-name" onClick={() => go("career", { careerId: c.id })}>{c.name} →</button>
              <span className="cp-stat-meta">${w.median}K {w.short} · {c.length} · {n} program{n === 1 ? "" : "s"} in {loc.region || stateName}</span>
              <button className="cp-plan-rm" onClick={() => toggleSave(c.id)}>Remove</button>
            </div>
          ); })}
          {careers.length > 1 && <p className="cp-app-more"><button className="cp-link" onClick={() => go("compare")}>Compare them side by side →</button></p>}
        </div>
      )}

      <h2 className="cp-h2">Schools I am looking at</h2>
      {schools.length === 0 ? <p className="cp-filter-meta">None saved yet. Open any school page and tap "Save school".</p> : (
        <div className="cp-plan-saved">
          {schools.map(s => (
            <div key={s.st + s.inst} className="cp-plan-row">
              <a className="cp-link cp-plan-name" href={window.schoolKey(s.st, s.inst)}>{s.inst} →</a>
              <span className="cp-stat-meta">{window.stateName(s.st)}</span>
              <button className="cp-plan-rm" onClick={() => toggleSchool(s.st, s.inst)}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <div className="cp-callout">
        <strong>Two people to put in your phone now:</strong> the campus foster youth program coordinator at your first-choice school, and your state's foster care ombudsman or youth line (in the <button className="cp-link" onClick={() => go("state")}>{stateName} guide</button>).
      </div>
    </main>
  );
};

Object.assign(window, { CpPlan, useSavedSchools });
