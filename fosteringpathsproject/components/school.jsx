// School page: everything this site knows about one institution, across careers.
// Route: #/school/<ST>/<institution name>

const schoolKey = (st, inst) => "#/school/" + st + "/" + encodeURIComponent(inst);

// Loose match between a program's institution name and a campus resource's org.
const normInst = (s) => String(s || "").toLowerCase()
  .replace(/university of california[-, ]+/g, "uc ")
  .replace(/california state university[-, ]+/g, "csu ")
  .replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\b(the|of|college|university|community|campus|main)\b/g, " ")
  .replace(/\s+/g, " ").trim();

const CpSchool = ({ st, inst, go, saved, toggleSave }) => {
  const { loc, status } = useFpLocation();
  const stateName = window.stateName(st);
  const [schools, toggleSchool] = useSavedSchools();
  const isSaved = schools.some(x => x.st === st && x.inst === inst);
  const [showAll, setShowAll] = React.useState({});
  React.useEffect(() => { if (window.loadStateData) window.loadStateData(st); }, [st]);
  const progs = React.useMemo(() => window.PROGRAMS.byState(st).filter(p => p.inst === inst), [st, inst, status, window.PROGRAMS.count()]);
  // Prefer a record with the school facts (IPEDS) over a curated listing.
  const first = progs.find(p => p.source === "ipeds-2024" || p.netPrice30k != null) || progs[0];
  const tierLabels = window.APP_META.tierLabels;
  const geo = window.getGeo && window.getGeo();
  const miles = first && geo && typeof first.lat === "number" ? window.distanceMiles(geo.lat, geo.lng, first.lat, first.lng) : null;

  // Campus foster youth program, if one is on file for this school.
  const nk = normInst(inst);
  const campus = window.RESOURCES.byState(st).filter(r => r.category === "campus" && (normInst(r.org) === nk || normInst(r.name).startsWith(nk) || (nk.length > 8 && normInst(r.org).startsWith(nk))));

  // Programs grouped by career, curated first, then by graduates.
  const byCareer = React.useMemo(() => {
    const m = new Map();
    // Curated CA programs are referenced from career files rather than carrying careers[].
    const curatedCareers = {};
    window.CAREERS.all().forEach(c => (c.programs || []).forEach(pid => { (curatedCareers[pid] = curatedCareers[pid] || []).push(c.id); }));
    progs.forEach(p => [...new Set([...(p.careers || []), ...(curatedCareers[p.id] || [])])].forEach(c => { if (!m.has(c)) m.set(c, []); m.get(c).push(p); }));
    const out = [...m.entries()].map(([cid, ps]) => ({ career: window.CAREERS.byId(cid), progs: ps.sort((a, b) => (b.curated ? 1 : 0) - (a.curated ? 1 : 0) || (b.grads || 0) - (a.grads || 0)) })).filter(x => x.career);
    out.sort((a, b) => b.progs.length - a.progs.length || a.career.name.localeCompare(b.career.name));
    return out;
  }, [progs]);

  if (!first) {
    return (
      <main className="cp-main narrow">
        <button className="cp-back" onClick={() => go("home")}>← Careers</button>
        <h1 className="cp-h1">{inst}</h1>
        <p className="cp-filter-meta">{status === "loading" ? `Loading ${stateName} programs…` : `No programs on file for this school in ${stateName}.`}</p>
      </main>
    );
  }
  const levels = [...new Set(progs.map(p => p.level).filter(Boolean))];
  const LEVEL_LABEL = { cert: "certificates", assoc: "associate degrees", bach: "bachelor's degrees", grad: "graduate degrees" };
  return (
    <main className="cp-main narrow">
      <button className="cp-back" onClick={() => window.history.length > 1 ? window.history.back() : go("home")}>← Back</button>
      <div className="cp-eyebrow">{tierLabels[first.tier] || first.tier}{first.forProfit ? " · for-profit" : ""}{first.public === false && !first.forProfit ? " · private nonprofit" : ""}</div>
      <div className="cp-detail-head">
        <h1 className="cp-h1">{inst}</h1>
        <button className={"cp-cr-save cp-school-save " + (isSaved ? "on" : "")} onClick={() => toggleSchool(st, inst)} aria-pressed={isSaved}>{isSaved ? "✓ Saved to my plan" : "+ Save school"}</button>
      </div>
      <p className="cp-lede">
        {first.address || first.loc}{first.region && first.region !== first.loc ? ` (${first.region})` : ""}{miles != null ? ` · ${fmtMiles(miles)} from you` : ""}.
        {" "}{progs.length} program{progs.length === 1 ? "" : "s"} here for {byCareer.length} of this site's careers{levels.length ? ` (${levels.map(l => LEVEL_LABEL[l] || l).join(", ")})` : ""}.
      </p>
      <div className="cp-detail-stats">
        {first.netPrice30k != null && <div><div className="cp-stat">${Math.round(first.netPrice30k / 1000)}K</div><div className="cp-stat-lbl">a year, typical low-income student, before foster youth aid</div></div>}
        {first.sticker > 0 && <div><div className="cp-stat">${first.sticker.toLocaleString()}</div><div className="cp-stat-lbl">in-state tuition and fees</div></div>}
        {first.gradRate != null && first.tier !== "cc" && <div><div className="cp-stat">{first.gradRate}%</div><div className="cp-stat-lbl">graduate on time</div></div>}
        {first.pellPct != null && <div><div className="cp-stat">{first.pellPct}%</div><div className="cp-stat-lbl">of new students get a Pell Grant (low-income)</div></div>}
        {first.students > 0 && <div><div className="cp-stat">{first.students >= 10000 ? Math.round(first.students / 1000) + "K" : first.students.toLocaleString()}</div><div className="cp-stat-lbl">students</div></div>}
        <div><div className="cp-stat">{first.housing ? "Yes" : "No"}</div><div className="cp-stat-lbl">campus housing</div></div>
        {first.childcare && <div><div className="cp-stat">Yes</div><div className="cp-stat-lbl">childcare on campus</div></div>}
      </div>
      <div className="cp-prog-action cp-school-links">
        <span>{first.openAdmission ? "Open admission: a diploma or GED gets you in. " : ""}{first.applFee === 0 ? "No application fee." : first.applFee ? `Application fee $${first.applFee} (ask the foster youth program for a waiver).` : "Ask the foster youth program about an application fee waiver."}</span>
        <span className="cp-prog-links">
          {first.phone && <a href={"tel:" + String(first.phone).replace(/[^0-9+]/g, "")} className="cp-prog-link">{first.phone}</a>}
          {first.url && <a href={first.url} target="_blank" rel="noopener" className="cp-prog-link">Website →</a>}
          {typeof first.lat === "number" && <a href={`https://www.google.com/maps/search/?api=1&query=${first.lat},${first.lng}`} target="_blank" rel="noopener" className="cp-prog-link">Directions →</a>}
        </span>
      </div>

      <h2 className="cp-h2">Foster youth support at this school</h2>
      {campus.length ? campus.map(r => <CpResourceCard key={r.id} r={r} />) : (
        <p className="cp-filter-meta">No campus foster youth program on file yet. Most public colleges have one (Guardian Scholars, Fostering Success, or a foster youth liaison in financial aid). Call the main number and ask for the foster youth liaison, and ask about priority registration, housing over breaks, and a fee waiver.</p>
      )}

      <h2 className="cp-h2">Programs here, by career</h2>
      {byCareer.map(({ career, progs: ps }) => {
        const open = !!showAll[career.id];
        const shown = open ? ps : ps.slice(0, 3);
        return (
          <section key={career.id} className="cp-school-career">
            <div className="cp-sec-head">
              <h3><button className="cp-link cp-school-career-name" onClick={() => go("career", { careerId: career.id })}>{career.name} →</button></h3>
              <span className="cp-sec-meta">{ps.length} program{ps.length === 1 ? "" : "s"}{saved && saved.includes(career.id) ? " · saved" : ""}</span>
            </div>
            <div className="cp-prog-list">{shown.map(p => <CpProgramCard key={p.id} p={p} hideSchool />)}</div>
            {ps.length > shown.length && <p className="cp-app-more"><button className="cp-link" onClick={() => setShowAll({ ...showAll, [career.id]: true })}>Show all {ps.length} →</button></p>}
          </section>
        );
      })}
      <p className="cp-app-source">Program list and school facts from the school's federal reporting (IPEDS). Net price is the school's average for students from families earning under $30,000, housing and food included, before foster youth aid like ETV and tuition waivers. Confirm with the school.</p>
    </main>
  );
};

Object.assign(window, { CpSchool, schoolKey, normInst });
