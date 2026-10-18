// Map view — plots every program, apprenticeship, and support resource with
// lat/lng for the current state on a Leaflet/OpenStreetMap map.

// HTML-escape for data interpolated into popup template literals. Popups are
// the one place we build raw HTML from data (scraped + imported), so every
// interpolated field goes through esc() / escAttr().
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const escAttr = esc;

const TIER_COLORS = {
  cc:      "#5B8A72",
  csu:     "#2D6A9F",
  public4: "#2D6A9F",
  uc:      "#1E3A5F",
  private: "#8B5A3C",
  trade:   "#B54A1F",
  support: "#7A3E9D",
};
const TIER_KEYS = ["cc", "csu", "uc", "public4", "private", "trade", "support"];

// Common school nicknames so users can search by familiar shortforms.
// Each pattern, if matched in the program name, adds extra search terms to the haystack.
const SCHOOL_NICKNAMES = [
  [/california state polytechnic university,?\s*pomona/i,            "cal poly pomona cpp"],
  [/california polytechnic state university,?\s*san luis obispo/i,   "cal poly slo calpoly"],
  [/california state polytechnic/i,                                  "cal poly"],
  [/california state university[,-]?\s*san bernardino/i,             "csusb cal state san bernardino"],
  [/california state university[,-]?\s*fullerton/i,                  "csuf cal state fullerton"],
  [/california state university[,-]?\s*long beach/i,                 "csulb cal state long beach"],
  [/california state university[,-]?\s*los angeles/i,                "csula cal state la"],
  [/california state university[,-]?\s*northridge/i,                 "csun cal state northridge"],
  [/california state university[,-]?\s*sacramento/i,                 "sac state csus"],
  [/university of california[,-]?\s*riverside/i,                     "ucr uc riverside"],
  [/university of california[,-]?\s*irvine/i,                        "uci uc irvine"],
  [/university of california[,-]?\s*los angeles/i,                   "ucla"],
  [/university of california[,-]?\s*davis/i,                         "uc davis ucd"],
  [/university of california[,-]?\s*san diego/i,                     "ucsd uc san diego"],
  [/university of california[,-]?\s*santa barbara/i,                 "ucsb uc santa barbara"],
  [/university of california[,-]?\s*berkeley/i,                      "cal berkeley ucb"],
  [/university of southern california/i,                             "usc"],
  [/san bernardino valley college/i,                                 "sbvc"],
  [/riverside city college|riverside community college/i,            "rcc"],
  [/mt\.?\s*san jacinto college/i,                                   "msjc"],
  [/mt\.?\s*san antonio college/i,                                   "mt sac mtsac"],
  [/college of the desert/i,                                         "cod"],
  [/orange coast college/i,                                          "occ"],
  [/saddleback college/i,                                            "saddleback"],
  [/santa ana college/i,                                             "sac"],
  [/fullerton college/i,                                             "fullerton cc"],
  [/cypress college/i,                                               "cypress"],
  [/long beach city college/i,                                       "lbcc"],
  [/pasadena city college/i,                                         "pcc pasadena cc"],
  [/chaffey college/i,                                               "chaffey"],
  [/norco college/i,                                                 "norco"],
  [/crafton hills college/i,                                         "crafton"],
  [/california baptist university/i,                                 "cbu cal baptist"],
  [/loma linda university/i,                                         "loma linda llu"],
  [/chapman university/i,                                            "chapman"],
  [/ibew local 440/i,                                                "ibew 440"],
  [/bricklayers and allied/i,                                        "bac bricklayers"],
];

const expandNicknames = (text) => {
  let extra = "";
  for (const [rx, nicks] of SCHOOL_NICKNAMES) {
    if (rx.test(text)) extra += " " + nicks;
  }
  return text + extra;
};

// Reverse index: program id → list of {careerId, careerName} (legacy career.programs)
const buildProgramToCareers = () => {
  const map = {};
  window.CAREERS.all().forEach(c => {
    (c.programs || []).forEach(pid => {
      if (!map[pid]) map[pid] = [];
      map[pid].push({ id: c.id, name: c.name });
    });
  });
  return map;
};

const careerName = (id) => { const c = window.CAREERS.byId(id); return c ? c.name : id; };

const CpMap = ({ onOpenCareer, onPickLocation }) => {
  const mapRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const blurTimerRef = React.useRef(null);
  const { loc, status, tick } = useFpLocation();
  const [activeTiers, setActiveTiers] = React.useState({ cc: true, csu: true, uc: true, public4: true, private: true, trade: true, support: true });
  const [query, setQuery] = React.useState("");
  const [stats, setStats] = React.useState({ total: 0, mapped: 0, missing: 0, visible: 0 });
  const [sugOpen, setSugOpen] = React.useState(false);
  const [sugIndex, setSugIndex] = React.useState(-1);
  const programToCareers = React.useMemo(buildProgramToCareers, []);
  const tierLabels = window.APP_META.tierLabels;
  const allCareers = React.useMemo(() => window.CAREERS.all().map(c => c.name), []);
  const placeLabel = loc.region || window.stateName(loc.state);
  // Rebuild markers only when the state changes or its data finishes loading.
  const dataKey = loc.state + ":" + (status === "ready" || status === "missing" ? "ready" : "loading") + ":" + window.PROGRAMS.count() + ":" + window.RESOURCES.count();

  // Suggestions: careers whose name contains the query (case-insensitive),
  // ranked so prefix matches come first.
  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const startsWith = [];
    const contains = [];
    allCareers.forEach(name => {
      const lower = name.toLowerCase();
      if (lower === q) return;
      if (lower.startsWith(q)) startsWith.push(name);
      else if (lower.includes(q)) contains.push(name);
    });
    return [...startsWith, ...contains].slice(0, 8);
  }, [query, allCareers]);

  React.useEffect(() => { setSugIndex(-1); }, [suggestions.length, query]);

  // Create the map once.
  React.useEffect(() => {
    if (!window.L) { console.error("Leaflet failed to load"); return; }
    const map = window.L.map(containerRef.current, { center: [37.3, -119.5], zoom: 6, scrollWheelZoom: true });
    mapRef.current = map;
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.markerLayer = window.L.layerGroup().addTo(map);
    map.on("popupopen", (e) => {
      const root = e.popup.getElement();
      if (!root) return;
      root.querySelectorAll(".cp-map-clink").forEach(a => {
        a.onclick = (ev) => {
          ev.preventDefault();
          const cid = a.getAttribute("data-career-id");
          if (cid && onOpenCareer) onOpenCareer(cid);
        };
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [onOpenCareer]);

  // Build markers for the current state's data.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.markerLayer.clearLayers();

    const programMarkersByTier = {}; const groupMarkersByTier = {};
    TIER_KEYS.forEach(t => { programMarkersByTier[t] = []; groupMarkersByTier[t] = []; });

    const all = window.PROGRAMS.byState(loc.state);
    let mapped = 0, missing = 0;
    const groups = {};
    const splitInstitution = (p) => {
      const name = p.name || "";
      const i = name.indexOf(" — ");
      if (i === -1) return { org: p.inst || name, prog: name };
      return { org: name.slice(0, i).trim(), prog: name.slice(i + 3).trim() };
    };
    const careersFor = (p) => {
      const out = [...(programToCareers[p.id] || [])];
      (p.careers || []).forEach(cid => { if (!out.some(c => c.id === cid)) out.push({ id: cid, name: careerName(cid) }); });
      return out;
    };

    all.forEach(p => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") { missing++; return; }
      mapped++;
      const { org, prog } = splitInstitution(p);
      const color = TIER_COLORS[p.tier] || "#999";
      const careers = careersFor(p);
      const careerLinks = careers.map(c => `<a href="#" data-career-id="${escAttr(c.id)}" class="cp-map-clink">${esc(c.name)}</a>`).join(", ");
      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${escAttr(color)}">${esc(tierLabels[p.tier] || p.tier)}${p.forProfit ? " · for-profit" : ""}</div>
          <div class="cp-map-popup-name">${esc(p.name)}</div>
          <div class="cp-map-popup-meta">${esc(p.loc || "")}${p.duration ? " · " + esc(p.duration) : ""}${p.grads ? " · " + esc(p.grads) + " grads" : ""}</div>
          ${p.action ? `<div class="cp-map-popup-action">${esc(p.action)}</div>` : ""}
          ${careers.length ? `<div class="cp-map-popup-careers"><strong>For:</strong> ${careerLinks}</div>` : ""}
          ${p.url ? `<div class="cp-map-popup-link"><a href="${escAttr(p.url)}" target="_blank" rel="noopener">Visit site →</a></div>` : ""}
        </div>`;
      const progMarker = window.L.circleMarker([p.lat, p.lng], { radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85 });
      progMarker.bindPopup(popup, { maxWidth: 360 });
      progMarker._tier = p.tier; progMarker._region = p.region;
      progMarker._haystack = expandNicknames([p.name, p.loc, p.region, p.county, tierLabels[p.tier] || p.tier, ...(careers.map(c => c.name))].filter(Boolean).join(" ")).toLowerCase();
      (programMarkersByTier[p.tier] || programMarkersByTier.private).push(progMarker);

      const key = p.lat.toFixed(5) + "," + p.lng.toFixed(5);
      if (!groups[key]) groups[key] = { lat: p.lat, lng: p.lng, tier: p.tier, org, loc: p.loc, region: p.region, forProfit: p.forProfit, url: p.url, programs: [] };
      groups[key].programs.push({ p, prog, careers });
    });

    // ----- Apprenticeships (CA DAS, plus any state file) -----
    const apprenticeships = ((window.APPRENTICESHIPS && window.APPRENTICESHIPS.all()) || []).filter(a => (a.state || "CA") === loc.state);
    apprenticeships.forEach(a => {
      if (typeof a.lat !== "number" || typeof a.lng !== "number") return;
      const tier = "trade";
      const color = TIER_COLORS[tier];
      const url = a.websiteUrl || (a.website && /^https?:\/\//i.test(a.website) ? a.website : "");
      const phone = a.phone ? `<a href="tel:${escAttr(a.phone.replace(/[^0-9+]/g,""))}">${esc(a.phone)}</a>` : "";
      const email = a.email ? `<a href="mailto:${escAttr(a.email)}">${esc(a.email)}</a>` : "";
      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${escAttr(color)}">Apprenticeship${a.industry ? " · " + esc(a.industry) : ""}</div>
          <div class="cp-map-popup-name">${esc(a.occupation || a.sponsor)}</div>
          <div class="cp-map-popup-meta">${esc(a.sponsor || "")}</div>
          ${a.length || a.minAge ? `<div class="cp-map-popup-meta">${esc(a.length || "")}${a.length && a.minAge ? " · " : ""}${a.minAge ? "min age " + esc(a.minAge) : ""}</div>` : ""}
          ${a.educationPrereq ? `<div class="cp-map-popup-careers"><strong>Prereq:</strong> ${esc(a.educationPrereq)}</div>` : ""}
          ${(phone || email) ? `<div class="cp-map-popup-careers">${[phone,email].filter(Boolean).join(" · ")}</div>` : ""}
          ${url ? `<div class="cp-map-popup-link"><a href="${escAttr(url)}" target="_blank" rel="noopener">Visit program site →</a></div>` : ""}
        </div>`;
      const mk = () => {
        const m = window.L.circleMarker([a.lat, a.lng], { radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85 });
        m.bindPopup(popup, { maxWidth: 360 });
        m._tier = tier; m._count = 1;
        m._haystack = expandNicknames([a.occupation, a.sponsor, a.industry, a.loc, "apprenticeship cdss das"].filter(Boolean).join(" ")).toLowerCase();
        return m;
      };
      programMarkersByTier.trade.push(mk());
      groupMarkersByTier.trade.push(mk());
      mapped++;
    });

    // ----- Support resources -----
    const resources = window.RESOURCES.byState(loc.state).filter(r => typeof r.lat === "number" && typeof r.lng === "number");
    resources.forEach(r => {
      const color = TIER_COLORS.support;
      const phone = r.phone ? `<a href="tel:${escAttr(r.phone.replace(/[^0-9+]/g,""))}">${esc(r.phone)}</a>` : "";
      const email = r.email ? `<a href="mailto:${escAttr(r.email)}">${esc(r.email)}</a>` : "";
      const catLabel = (window.RESOURCE_LABEL && window.RESOURCE_LABEL[r.category]) || r.category;
      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${escAttr(color)}">${esc(catLabel)} · foster youth support</div>
          <div class="cp-map-popup-name">${esc(r.name)}</div>
          <div class="cp-map-popup-meta">${esc(r.org || "")}${r.city ? " · " + esc(r.city) : ""}</div>
          <div class="cp-map-popup-careers"><strong>Who:</strong> ${esc(r.serves)}</div>
          <div class="cp-map-popup-careers"><strong>What:</strong> ${esc(r.provides)}</div>
          ${(phone || email) ? `<div class="cp-map-popup-careers">${[phone,email].filter(Boolean).join(" · ")}</div>` : ""}
          ${r.url ? `<div class="cp-map-popup-link"><a href="${escAttr(r.url)}" target="_blank" rel="noopener">Open site →</a></div>` : ""}
        </div>`;
      const mk = () => {
        const m = window.L.circleMarker([r.lat, r.lng], { radius: 8, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.9 });
        m.bindPopup(popup, { maxWidth: 360 });
        m._tier = "support"; m._count = 1; m._region = r.region;
        m._haystack = [r.name, r.org, r.city, r.county, r.category, catLabel, r.serves, r.provides, (r.tags || []).join(" "), "resource support help"].filter(Boolean).join(" ").toLowerCase();
        return m;
      };
      programMarkersByTier.support.push(mk());
      groupMarkersByTier.support.push(mk());
      mapped++;
    });

    // One marker per institution-at-location
    Object.values(groups).forEach(g => {
      const tier = g.tier;
      const color = TIER_COLORS[tier] || "#999";
      const tierLabel = tierLabels[tier] || tier;
      const count = g.programs.length;
      const progsHtml = g.programs.slice(0, 40).map(({ p, prog, careers }) => {
        const careerLinks = careers.map(c => `<a href="#" data-career-id="${escAttr(c.id)}" class="cp-map-clink">${esc(c.name)}</a>`).join(", ");
        const url = p.url ? ` <a href="${escAttr(p.url)}" target="_blank" rel="noopener" class="cp-map-popup-progurl">site →</a>` : "";
        const careerLine = careers.length ? `<div class="cp-map-popup-progmeta"><span class="cp-stat-meta">For:</span> ${careerLinks}</div>` : "";
        return `<li class="cp-map-popup-prog"><div class="cp-map-popup-progname">${esc(prog)}${url}</div>${p.duration ? `<div class="cp-map-popup-progmeta"><span class="cp-stat-meta">${esc(p.duration)}${p.grads ? " · " + esc(p.grads) + " grads" : ""}</span></div>` : ""}${careerLine}</li>`;
      }).join("");
      const more = count > 40 ? `<li class="cp-map-popup-prog"><div class="cp-map-popup-progmeta">+ ${count - 40} more. Search a career to narrow.</div></li>` : "";
      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${escAttr(color)}">${esc(tierLabel)}${g.forProfit ? " · for-profit" : ""}</div>
          <div class="cp-map-popup-name">${esc(g.org)}</div>
          <div class="cp-map-popup-meta">${esc(g.loc || "")} · ${count} program${count === 1 ? "" : "s"}${g.url ? ` · <a href="${escAttr(g.url)}" target="_blank" rel="noopener">site →</a>` : ""} · <a href="${escAttr(window.schoolKey(loc.state, g.programs[0].p.inst || g.org))}">school page →</a></div>
          <ul class="cp-map-popup-progs">${progsHtml}${more}</ul>
        </div>`;
      const radius = Math.min(13, 7 + Math.round(Math.log2(count + 1)));
      const groupMarker = window.L.circleMarker([g.lat, g.lng], { radius, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85 });
      groupMarker.bindPopup(popup, { maxWidth: 380 });
      groupMarker._tier = tier; groupMarker._count = count; groupMarker._region = g.region;
      groupMarker._haystack = expandNicknames([g.org, g.loc, g.region, tierLabel, ...g.programs.flatMap(x => x.careers.map(c => c.name))].filter(Boolean).join(" ")).toLowerCase();
      (groupMarkersByTier[tier] || groupMarkersByTier.private).push(groupMarker);
    });

    map._programMarkersByTier = programMarkersByTier;
    map._groupMarkersByTier = groupMarkersByTier;
    map._groupCount = Object.values(groupMarkersByTier).reduce((n, arr) => n + arr.length, 0);
    map._needsFit = true;
    setStats({ total: all.length + apprenticeships.length + resources.length, mapped, missing, visible: map._groupCount, mode: "groups" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, programToCareers, tierLabels]);

  // Filter visibility based on active tiers AND search query.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map._programMarkersByTier) return;
    const layer = map.markerLayer;
    const q = query.trim().toLowerCase();
    const useGroups = !q;
    const sourceByTier = useGroups ? map._groupMarkersByTier : map._programMarkersByTier;
    const otherByTier  = useGroups ? map._programMarkersByTier : map._groupMarkersByTier;
    Object.values(otherByTier).flat().forEach(m => { if (layer.hasLayer(m)) layer.removeLayer(m); });

    let visible = 0, visiblePrograms = 0;
    const visibleMarkers = [];
    const regionMarkers = [];
    Object.entries(sourceByTier).forEach(([tier, markers]) => {
      markers.forEach(m => {
        const show = activeTiers[tier] && (!q || (m._haystack && m._haystack.includes(q)));
        if (show) {
          if (!layer.hasLayer(m)) layer.addLayer(m);
          visible++; visiblePrograms += (m._count || 1); visibleMarkers.push(m);
          if (loc.region && m._region === loc.region) regionMarkers.push(m);
        } else if (layer.hasLayer(m)) layer.removeLayer(m);
      });
    });
    setStats(prev => ({ ...prev, visible, visiblePrograms, mode: useGroups ? "groups" : "programs" }));

    if (map._needsFit && visibleMarkers.length) {
      map._needsFit = false;
      const target = regionMarkers.length >= 3 ? regionMarkers : visibleMarkers;
      map.fitBounds(window.L.featureGroup(target).getBounds().pad(0.08), { animate: false, maxZoom: 11 });
    } else if (q && visibleMarkers.length > 0 && visibleMarkers.length < 30) {
      map.fitBounds(window.L.featureGroup(visibleMarkers).getBounds().pad(0.15), { animate: true, maxZoom: 14 });
    }
  }, [activeTiers, query, dataKey, loc.region]);

  const toggleTier = (t) => setActiveTiers(prev => ({ ...prev, [t]: !prev[t] }));
  const clearQuery = () => { setQuery(""); setSugOpen(false); };
  const pickSuggestion = (name) => { setQuery(name); setSugOpen(false); setSugIndex(-1); };
  const onSearchFocus = () => { clearTimeout(blurTimerRef.current); if (suggestions.length) setSugOpen(true); };
  const onSearchBlur = () => { blurTimerRef.current = setTimeout(() => setSugOpen(false), 120); };
  const onSearchChange = (e) => { setQuery(e.target.value); setSugOpen(true); };
  const onSearchKey = (e) => {
    if (!sugOpen || suggestions.length === 0) { if (e.key === "Escape") setSugOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSugIndex(i => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSugIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1)); }
    else if (e.key === "Enter") { if (sugIndex >= 0 && sugIndex < suggestions.length) { e.preventDefault(); pickSuggestion(suggestions[sugIndex]); } }
    else if (e.key === "Escape") setSugOpen(false);
  };

  const legendTiers = TIER_KEYS.filter(t => {
    if (t === "csu" || t === "uc") return loc.state === "CA";
    if (t === "public4") return loc.state !== "CA";
    return true;
  });

  return (
    <main className="cp-main">
      <div className="cp-map-head">
        <h1 className="cp-h1">Programs and support in {placeLabel}</h1>
        <p className="cp-lede">{status === "loading" && stats.mapped === 0 ? <>Loading {window.stateName(loc.state)}…</> : (stats.mode === "groups"
          ? <><strong>{(stats.visiblePrograms ?? stats.mapped).toLocaleString()}</strong> programs and resources across <strong>{stats.visible.toLocaleString()}</strong> places, color-coded by type. Click a marker to see what's there, or search a career, school, or city. <button className="cp-link" onClick={onPickLocation}>Change location</button></>
          : <>{stats.mapped.toLocaleString()} programs on this map. Click a marker to see what it offers.</>)
        }</p>
        <div className="cp-map-search">
          <div className="cp-map-search-wrap">
            <input
              type="search"
              className="cp-map-search-input"
              placeholder="Search programs, schools, careers, cities…"
              value={query}
              onChange={onSearchChange}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              onKeyDown={onSearchKey}
              aria-label="Search programs"
              aria-autocomplete="list"
              aria-expanded={sugOpen && suggestions.length > 0}
              aria-controls="cp-map-sug-list"
              autoComplete="off"
            />
            {sugOpen && suggestions.length > 0 && (
              <ul id="cp-map-sug-list" className="cp-map-suggestions" role="listbox">
                {suggestions.map((name, i) => {
                  const lower = name.toLowerCase();
                  const q = query.trim().toLowerCase();
                  const idx = q ? lower.indexOf(q) : -1;
                  return (
                    <li key={name} role="option" aria-selected={i === sugIndex} className={"cp-map-sug" + (i === sugIndex ? " on" : "")}
                        onMouseDown={(e) => { e.preventDefault(); pickSuggestion(name); }} onMouseEnter={() => setSugIndex(i)}>
                      <span className="cp-map-sug-name">
                        {idx >= 0 ? (<>{name.slice(0, idx)}<strong>{name.slice(idx, idx + q.length)}</strong>{name.slice(idx + q.length)}</>) : name}
                      </span>
                      <span className="cp-map-sug-tag">career</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {query && <button className="cp-map-search-clear" onClick={clearQuery} aria-label="Clear search">×</button>}
          <span className="cp-map-search-count">
            {stats.mode === "groups"
              ? `${(stats.visiblePrograms ?? stats.mapped).toLocaleString()} item${(stats.visiblePrograms ?? stats.mapped) === 1 ? "" : "s"} · ${stats.visible.toLocaleString()} place${stats.visible === 1 ? "" : "s"}`
              : (stats.visible === stats.mapped ? `${stats.mapped.toLocaleString()} programs` : `${stats.visible.toLocaleString()} of ${stats.mapped.toLocaleString()} programs`)}
          </span>
        </div>
        <div className="cp-map-legend">
          {legendTiers.map(t => (
            <button key={t} className={"cp-map-chip " + t + (activeTiers[t] ? " on" : "")} onClick={() => toggleTier(t)} style={{ "--chip-color": TIER_COLORS[t] }} aria-pressed={activeTiers[t]}>
              <span className="cp-map-dot" style={{ background: TIER_COLORS[t] }} />
              {tierLabels[t]}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="cp-map-canvas" />
    </main>
  );
};

window.CpMap = CpMap;
