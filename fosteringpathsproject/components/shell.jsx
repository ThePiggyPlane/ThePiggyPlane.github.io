// Reusable bits: header, deadlines, career row, footer, modal scrim.

const CpHeader = ({ view, go, savedCount, onCompare }) => (
  <header className="cp-hdr">
    <div className="cp-hdr-in">
      <div className="cp-logo">
        <button onClick={() => go("home")} aria-label="Clear Path home">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M 2 18 C 6 10, 10 10, 11 11 C 12 12, 16 4, 20 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Clear Path</span>
        </button>
      </div>
      <nav aria-label="Primary">
        <button className={view === "home" ? "on" : ""} onClick={() => go("home")}>Careers</button>
        <button className={view === "map" ? "on" : ""} onClick={() => go("map")}>Map</button>
        <button className={view === "money" ? "on" : ""} onClick={() => go("money")}>Cost</button>
        <button className={view === "week" ? "on" : ""} onClick={() => go("week")}>First Week</button>
        <button className={view === "about" ? "on" : ""} onClick={() => go("about")}>About</button>
      </nav>
      <button
        className={"cp-saved-btn" + (savedCount === 0 ? " empty" : "")}
        onClick={onCompare}
        title={savedCount < 2 ? "Tap '+ Save' on careers to compare them side-by-side" : "Compare saved careers"}
      >
        Saved <span className="cp-count">{savedCount}</span>
      </button>
    </div>
  </header>
);

const CpDeadlines = () => {
  const next3 = [...window.APP_META.deadlines]
    .filter(d => window.daysUntil(d.date) >= 0)
    .sort((a, b) => window.daysUntil(a.date) - window.daysUntil(b.date))
    .slice(0, 3);
  return (
    <section className="cp-deadlines" aria-label="Upcoming deadlines">
      <div className="cp-sec-head">
        <h2>Coming up</h2>
        <span className="cp-sec-meta">updated weekly</span>
      </div>
      <div className="cp-deadline-list">
        {next3.map(d => (
          <div key={d.label} className={"cp-deadline " + d.urgency}>
            <div className="cp-deadline-days">
              <span className="cp-days-n">{window.daysUntil(d.date)}</span>
              <span className="cp-days-lbl">days</span>
            </div>
            <div>
              <div className="cp-deadline-title">{d.label}</div>
              <div className="cp-deadline-date">{new Date(d.date + "T00:00:00").toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <button className="cp-add-cal" aria-label={"Add " + d.label + " to calendar"}>+ Calendar</button>
          </div>
        ))}
      </div>
    </section>
  );
};

const CpCareerRow = ({ c, saved, toggleSave, onOpen }) => (
  <article className="cp-career-row" onClick={() => onOpen(c.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(c.id); } }}>
    <div className="cp-cr-name">
      <h3>{c.name}</h3>
    </div>
    <div className="cp-cr-stat"><div>${c.salary.median}K</div><div>median</div></div>
    <div className="cp-cr-stat"><div>{c.length}</div><div>time</div></div>
    <div className="cp-cr-stat"><div>{c.demand}</div><div>demand</div></div>
    <button
      className={"cp-cr-save " + (saved.includes(c.id) ? "on" : "")}
      onClick={(e) => { e.stopPropagation(); toggleSave(c.id); }}
      aria-label={(saved.includes(c.id) ? "Unsave " : "Save ") + c.name}
      aria-pressed={saved.includes(c.id)}
    >
      {saved.includes(c.id) ? "✓ Saved" : "+ Save"}
    </button>
    <div className="cp-cr-arrow" aria-hidden="true">→</div>
  </article>
);

// Modal scrim with focus trap + Esc handling.
const CpModal = ({ onClose, children, ariaLabel }) => {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="cp-wiz-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="cp-wiz" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

Object.assign(window, { CpHeader, CpDeadlines, CpCareerRow, CpModal });
