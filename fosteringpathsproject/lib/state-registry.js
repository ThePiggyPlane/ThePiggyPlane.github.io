// Registries for the state-aware data layer: resources (foster youth support
// programs), scholarships, state guides, and per-state wage tables.
// Data files call window.registerResources([...]), window.registerScholarships([...]),
// window.registerStateGuide({...}), window.registerWages({...}).
(function () {
  const resources = {};
  const scholarships = {};
  const guides = {};
  const wages = {};

  const emit = () => {
    try { window.dispatchEvent(new CustomEvent("fp:data")); } catch (e) {}
  };

  window.registerResources = function (arr) {
    if (!Array.isArray(arr)) return;
    for (const r of arr) if (r && r.id) resources[r.id] = r;
    emit();
  };
  window.registerResource = function (r) { if (r && r.id) { resources[r.id] = r; emit(); } };

  window.registerScholarships = function (arr) {
    if (!Array.isArray(arr)) return;
    for (const s of arr) if (s && s.id) scholarships[s.id] = s;
    emit();
  };

  window.registerStateGuide = function (g) {
    if (g && g.state) { guides[g.state] = g; emit(); }
  };

  // { state: "TX", geo: "Texas", dataYear: 2024, careers: { nurse: { medianWage, employed, ... } } }
  window.registerWages = function (w) {
    if (w && w.state) { wages[w.state] = w; emit(); }
  };

  const byState = (dict, st) => Object.values(dict).filter(x => x.state === st);

  window.RESOURCES = {
    get: (id) => resources[id],
    all: () => Object.values(resources),
    count: () => Object.keys(resources).length,
    byState: (st) => byState(resources, st),
    national: () => byState(resources, "US"),
    // Everything relevant to a state: that state's records + national ones.
    forState: (st) => [...byState(resources, st), ...byState(resources, "US")],
  };

  window.SCHOLARSHIPS = {
    get: (id) => scholarships[id],
    all: () => Object.values(scholarships),
    count: () => Object.keys(scholarships).length,
    national: () => Object.values(scholarships).filter(s => s.scope === "national"),
    byState: (st) => Object.values(scholarships).filter(s => s.state === st),
    forState: (st) => [
      ...Object.values(scholarships).filter(s => s.state === st),
      ...Object.values(scholarships).filter(s => s.scope === "national"),
    ],
  };

  window.STATE_GUIDES = {
    get: (st) => guides[st],
    all: () => Object.values(guides),
    count: () => Object.keys(guides).length,
  };

  window.WAGES = {
    get: (st) => wages[st],
    forCareer: (st, careerId) => (wages[st] && wages[st].careers && wages[st].careers[careerId]) || null,
    // Most local figures available for a career: the metro/region if the state
    // file has one for the current region, else statewide. Returns null when the
    // state has no wage file yet.
    local: (careerId, loc) => {
      loc = loc || (window.getLocation ? window.getLocation() : { state: "CA" });
      const w = wages[loc.state];
      if (!w) return null;
      const reg = loc.region && w.regions && w.regions[loc.region];
      if (reg && reg.careers && reg.careers[careerId]) {
        return { rec: reg.careers[careerId], geo: reg.geo, level: "region", dataYear: w.dataYear, source: w.source, state: loc.state };
      }
      if (w.careers && w.careers[careerId]) {
        return { rec: w.careers[careerId], geo: w.geo, level: "state", dataYear: w.dataYear, source: w.source, state: loc.state };
      }
      return null;
    },
    national: (careerId) => (wages.US && wages.US.careers && wages.US.careers[careerId]) || null,
    // Headline pay for lists: { median, low, high, label } in $K, from the most
    // local BLS figures, falling back to the career file's California numbers.
    salary: (career, loc) => {
      const l = window.WAGES.local(career.id, loc);
      if (l && l.rec.medianWage) {
        const st = l.state;
        return {
          median: Math.round(l.rec.medianWage / 1000),
          low: l.rec.range50Low ? Math.round(l.rec.range50Low / 1000) : career.salary.low,
          high: l.rec.range50High ? Math.round(l.rec.range50High / 1000) : career.salary.high,
          label: l.level === "region" ? `median, ${(loc || window.getLocation()).region}` : `median, ${st}`,
          short: l.level === "region" ? "median here" : `median, ${st}`,
        };
      }
      return { median: career.salary.median, low: career.salary.low, high: career.salary.high, label: "median, CA", short: "median (CA)" };
    },
  };
})();
