// State guide: the rules that change by state, in one screen.

const CpGuideRow = ({ label, children }) => (
  <div className="cp-guide-row">
    <div className="cp-guide-lbl">{label}</div>
    <div className="cp-guide-val">{children}</div>
  </div>
);

const ExtLink = ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener">{children}</a> : <span>{children}</span>;

const CpStateGuide = ({ go, onPickLocation }) => {
  const { loc, status } = useFpLocation();
  const st = loc.state;
  const name = window.stateName(st);
  const g = window.STATE_GUIDES.get(st);
  const idx = window.STATE_INDEX && window.STATE_INDEX[st];
  const counts = idx ? idx.counts : { programs: 0, resources: 0, scholarships: 0, apprenticeships: 0 };
  const resCount = window.RESOURCES.byState(st).length || counts.resources;
  const schCount = window.SCHOLARSHIPS.byState(st).length || counts.scholarships;
  const natSch = window.SCHOLARSHIPS.national().length;
  const natRes = window.RESOURCES.national().length;
  const progCount = window.PROGRAMS.byState(st).length || counts.programs;
  const wagesHere = window.WAGES.get(st);
  // Best-paying careers in this state that have programs here (for states without a guide yet).
  const topPay = React.useMemo(() => {
    if (!wagesHere) return [];
    return window.CAREERS.all()
      .map(c => ({ c, w: window.WAGES.salary(c, { state: st }), n: window.PROGRAMS.forCareer(c.id, { state: st }).length }))
      .filter(x => x.w && x.w.label !== "median, CA" && x.n > 0)
      .sort((a, b) => b.w.median - a.w.median)
      .slice(0, 8);
  }, [st, status, progCount]);

  return (
    <main className="cp-main narrow">
      <div className="cp-eyebrow">State guide</div>
      <h1 className="cp-h1">{name}</h1>
      <p className="cp-lede">
        The rules that decide what you get: how long you can stay in care, whether college is free, and who to call.
        {" "}<button className="cp-link" onClick={onPickLocation}>Change state</button>
      </p>

      <div className="cp-guide-stats">
        <button className="cp-guide-stat" onClick={() => go("home")}><div className="cp-stat">{progCount.toLocaleString()}</div><div className="cp-stat-lbl">programs</div></button>
        <button className="cp-guide-stat" onClick={() => go("resources")}><div className="cp-stat">{resCount || natRes}</div><div className="cp-stat-lbl">{resCount ? "support resources" : "national resources"}</div></button>
        <button className="cp-guide-stat" onClick={() => go("scholarships")}><div className="cp-stat">{schCount || natSch}</div><div className="cp-stat-lbl">{schCount ? "scholarships" : "national scholarships"}</div></button>
        <button className="cp-guide-stat" onClick={() => go("apprenticeships")}><div className="cp-stat">{(counts.apprenticeships || (st === "CA" && window.APPRENTICESHIPS ? window.APPRENTICESHIPS.count() : 0)).toLocaleString()}</div><div className="cp-stat-lbl">apprenticeships</div></button>
      </div>

      {status === "loading" && <p className="cp-filter-meta">Loading {name}…</p>}

      {!g && status !== "loading" && (
        <>
          <div className="cp-callout warn">
            <strong>The {name} guide is still being written.</strong> The programs, pay, and school facts for {name} are live; the state rules below are the federal ones that apply everywhere. Ask your caseworker or the campus foster youth program for {name}'s tuition waiver, ETV office, and extended foster care rules.
          </div>
          {topPay.length > 0 && (
            <>
              <h2 className="cp-h2">What these jobs pay in {name}</h2>
              <div className="cp-top-pay">
                {topPay.map(({ c, w, n }) => (
                  <button key={c.id} className="cp-top-pay-row" onClick={() => { window.location.hash = "#/career/" + encodeURIComponent(c.id); }}>
                    <span className="cp-top-pay-name">{c.name}</span>
                    <span className="cp-top-pay-val">${w.median}K <span className="cp-stat-meta">median</span></span>
                    <span className="cp-stat-meta">{n} program{n === 1 ? "" : "s"} · {c.length}</span>
                  </button>
                ))}
              </div>
              <p className="cp-app-source">BLS Occupational Employment and Wage Statistics, May {wagesHere.dataYear}, statewide medians for all workers in the job.</p>
            </>
          )}
          <h2 className="cp-h2">What you get in every state</h2>
          {(window.START_ITEMS || []).map((it, i) => (
            <div className="cp-week-row" key={i}>
              <div className="cp-week-n">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h3>{it.title}</h3>
                <p>{it.body}</p>
                <div className="cp-step-links">
                  {it.link && <a className="cp-step-link" href={it.link.href} target="_blank" rel="noopener">{it.link.label} →</a>}
                  {it.go && it.go.view !== "state" && <button className="cp-step-link cp-link" onClick={() => go(it.go.view)}>{it.go.label} →</button>}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {g && (
        <>
          <section className="cp-guide">
            <CpGuideRow label="Extended foster care">
              {g.extendedFosterCare.toAge > 18
                ? <>You can stay in care until <strong>{g.extendedFosterCare.toAge}</strong>. {g.extendedFosterCare.notes}</>
                : <>Care ends at 18. {g.extendedFosterCare.notes}</>}
              {g.extendedFosterCare.url && <> <ExtLink href={g.extendedFosterCare.url}>Details →</ExtLink></>}
            </CpGuideRow>
            <CpGuideRow label="Free tuition?">
              {g.tuitionWaiver.exists
                ? <><strong>Yes: {g.tuitionWaiver.name}.</strong> {g.tuitionWaiver.covers} {g.tuitionWaiver.eligibility} {g.tuitionWaiver.ageLimit} <ExtLink href={g.tuitionWaiver.url}>How to claim →</ExtLink></>
                : <><strong>No statewide waiver.</strong> {g.tuitionWaiver.notes || "Use Pell, ETV, and campus programs."}</>}
            </CpGuideRow>
            <CpGuideRow label="ETV (Chafee) money">
              <strong>{g.etv.maxAmount || "Up to $5,000 per year"}</strong> through {g.etv.admin}. {g.etv.ages ? `Ages ${g.etv.ages}. ` : ""}{g.etv.notes || ""} <ExtLink href={g.etv.url}>Apply →</ExtLink>
            </CpGuideRow>
            <CpGuideRow label="Health coverage to 26">
              {g.medicaidTo26.exists
                ? <><strong>{g.medicaidTo26.name || "Former foster youth Medicaid"}</strong>: free health coverage until 26, no income test. {g.medicaidTo26.how || ""} <ExtLink href={g.medicaidTo26.url}>Enroll →</ExtLink></>
                : <>{g.medicaidTo26.notes || "Check with the agency."}</>}
            </CpGuideRow>
            <CpGuideRow label="Transition program (ILP)">
              <strong>{g.ilp.name}</strong>{g.ilp.ages ? ` (ages ${g.ilp.ages})` : ""}. {g.ilp.how || ""} <ExtLink href={g.ilp.url}>Program page →</ExtLink>
            </CpGuideRow>
            <CpGuideRow label="The agency">
              <ExtLink href={g.agency.url}>{g.agency.name}</ExtLink>{g.agency.phone ? <> · <a href={"tel:" + g.agency.phone.replace(/[^0-9+]/g, "")}>{g.agency.phone}</a></> : null}{g.agency.notes ? ` · ${g.agency.notes}` : ""}
            </CpGuideRow>
            {g.collegeApps && g.collegeApps.length > 0 && (
              <CpGuideRow label="Apply to college">
                {g.collegeApps.map((c, i) => <span key={c.url || i}>{i > 0 ? " · " : ""}<ExtLink href={c.url}>{c.name}</ExtLink></span>)}
              </CpGuideRow>
            )}
            {g.notes && <CpGuideRow label="Good to know">{g.notes}</CpGuideRow>}
          </section>

          {g.firstWeek && g.firstWeek.length > 0 && (
            <>
              <h2 className="cp-h2">Do this first in {name}</h2>
              {g.firstWeek.map((s, i) => (
                <div className="cp-week-row" key={i}>
                  <div className="cp-week-n">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    {s.url && <div className="cp-step-links"><a className="cp-step-link" href={s.url} target="_blank" rel="noopener">Open →</a></div>}
                  </div>
                </div>
              ))}
            </>
          )}

          {g.keyOrgs && g.keyOrgs.length > 0 && (
            <>
              <h2 className="cp-h2">People who help in {name}</h2>
              <div className="cp-res-list">
                {g.keyOrgs.map((o, i) => (
                  <article className="cp-res" key={o.url || i}>
                    <h3 className="cp-res-name"><ExtLink href={o.url}>{o.name}</ExtLink></h3>
                    <p className="cp-res-line">{o.what}</p>
                    {o.phone && <div className="cp-res-contact"><a href={"tel:" + o.phone.replace(/[^0-9+]/g, "")}>{o.phone}</a></div>}
                  </article>
                ))}
              </div>
            </>
          )}
          <p className="cp-app-source">Verified {g.verified}. Rules change; when a page and this guide disagree, the agency's page wins. Tell us at the link in About.</p>
        </>
      )}
    </main>
  );
};

Object.assign(window, { CpStateGuide });
