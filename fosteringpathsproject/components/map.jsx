// Map view — plots every program with lat/lng on a Leaflet/OpenStreetMap map.

const TIER_COLORS = {
  cc:      "#5B8A72",
  csu:     "#2D6A9F",
  uc:      "#1E3A5F",
  private: "#8B5A3C",
  trade:   "#B54A1F",
};

// Common school nicknames so users can search by familiar shortforms.
// Each pattern, if matched in the program name, adds extra search terms to the haystack.
const SCHOOL_NICKNAMES = [
  [/california state polytechnic university,?\s*pomona/i,            "cal poly pomona cpp"],
  [/california polytechnic state university,?\s*san luis obispo/i,   "cal poly slo calpoly"],
  [/california state polytechnic/i,                                  "cal poly"],
  [/california state university,?\s*san bernardino/i,                "csusb cal state san bernardino"],
  [/california state university,?\s*fullerton/i,                     "csuf cal state fullerton"],
  [/california state university,?\s*long beach/i,                    "csulb cal state long beach"],
  [/california state university,?\s*los angeles/i,                   "csula cal state la"],
  [/california state university,?\s*northridge/i,                    "csun cal state northridge"],
  [/university of california,?\s*riverside/i,                        "ucr uc riverside"],
  [/university of california,?\s*irvine/i,                           "uci uc irvine"],
  [/university of california,?\s*los angeles/i,                      "ucla"],
  [/university of california,?\s*davis/i,                            "uc davis ucd"],
  [/university of california,?\s*san diego/i,                        "ucsd uc san diego"],
  [/university of california,?\s*santa barbara/i,                    "ucsb uc santa barbara"],
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

// Reverse index: program id → list of {careerId, careerName}
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

const CpMap = ({ onOpenCareer }) => {
  const mapRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const blurTimerRef = React.useRef(null);
  const [activeTiers, setActiveTiers] = React.useState({ cc: true, csu: true, uc: true, private: true, trade: true });
  const [query, setQuery] = React.useState("");
  const [stats, setStats] = React.useState({ total: 0, mapped: 0, missing: 0, visible: 0 });
  const [sugOpen, setSugOpen] = React.useState(false);
  const [sugIndex, setSugIndex] = React.useState(-1);
  const programToCareers = React.useMemo(buildProgramToCareers, []);
  const tierLabels = window.APP_META.tierLabels;
  const allCareers = React.useMemo(() => window.CAREERS.all().map(c => c.name), []);

  // Suggestions: careers whose name contains the query (case-insensitive),
  // ranked so prefix matches come first.
  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const startsWith = [];
    const contains = [];
    allCareers.forEach(name => {
      const lower = name.toLowerCase();
      if (lower === q) return;       // already exact — no need to suggest
      if (lower.startsWith(q)) startsWith.push(name);
      else if (lower.includes(q)) contains.push(name);
    });
    return [...startsWith, ...contains].slice(0, 8);
  }, [query, allCareers]);

  // Reset highlight when suggestions change
  React.useEffect(() => { setSugIndex(-1); }, [suggestions.length, query]);

  React.useEffect(() => {
    if (!window.L) {
      console.error("Leaflet failed to load");
      return;
    }
    const map = window.L.map(containerRef.current, {
      center: [33.95, -117.4],   // Riverside/San Bernardino area
      zoom: 9,
      scrollWheelZoom: true,
    });
    mapRef.current = map;

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Plot markers
    const layer = window.L.layerGroup().addTo(map);
    map.markerLayer = layer;

    const all = window.PROGRAMS.all();
    let mapped = 0, missing = 0;
    // Per-program markers (used when there's a search query — shows everything)
    const programMarkersByTier = { cc: [], csu: [], uc: [], private: [], trade: [] };
    // Group programs by lat,lng so an institution shows once when no search is active
    const groups = {};

    const splitInstitution = (name) => {
      // Program names look like "Org — Specific Program Name"; the em-dash
      // separator was inserted by the import script. Strip it for grouping.
      const i = name.indexOf(" — ");
      if (i === -1) return { org: name, prog: name };
      return { org: name.slice(0, i).trim(), prog: name.slice(i + 3).trim() };
    };

    all.forEach(p => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") {
        missing++;
        return;
      }
      mapped++;
      const { org, prog } = splitInstitution(p.name || "");
      const color = TIER_COLORS[p.tier] || "#999";
      const careers = programToCareers[p.id] || [];
      const careerLinks = careers
        .map(c => `<a href="#" data-career-id="${c.id}" class="cp-map-clink">${c.name}</a>`)
        .join(", ");

      // Per-program popup (used when searching)
      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${color}">${tierLabels[p.tier] || p.tier}</div>
          <div class="cp-map-popup-name">${p.name}</div>
          <div class="cp-map-popup-meta">${p.loc || ""}${p.duration ? " · " + p.duration : ""}</div>
          ${p.action ? `<div class="cp-map-popup-action">${p.action}</div>` : ""}
          ${careers.length ? `<div class="cp-map-popup-careers"><strong>For:</strong> ${careerLinks}</div>` : ""}
          ${p.url ? `<div class="cp-map-popup-link"><a href="${p.url}" target="_blank" rel="noopener">Visit program site →</a></div>` : ""}
        </div>
      `;
      const progMarker = window.L.circleMarker([p.lat, p.lng], {
        radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85,
      });
      progMarker.bindPopup(popup, { maxWidth: 360 });
      progMarker._tier = p.tier;
      progMarker._haystack = expandNicknames([
        p.name, p.loc, tierLabels[p.tier] || p.tier, ...(careers.map(c => c.name)),
      ].filter(Boolean).join(" ")).toLowerCase();
      programMarkersByTier[p.tier].push(progMarker);

      // Roll into the per-institution group keyed by precise lat/lng
      const key = p.lat.toFixed(5) + "," + p.lng.toFixed(5);
      if (!groups[key]) {
        groups[key] = { lat: p.lat, lng: p.lng, tier: p.tier, org, loc: p.loc, programs: [] };
      }
      groups[key].programs.push({ p, prog, careers });
    });

    // ----- Apprenticeships (CDSS / DAS) -----
    // Treat each one as both a program-tier-trade marker (for search) and
    // a group-tier-trade marker (so they show in the default grouped view too).
    const apprenticeships = (window.APPRENTICESHIPS && window.APPRENTICESHIPS.all()) || [];
    apprenticeships.forEach(a => {
      if (typeof a.lat !== "number" || typeof a.lng !== "number") return;
      const tier = "trade";
      const color = TIER_COLORS[tier];
      const url = a.websiteUrl || (a.website && /^https?:\/\//i.test(a.website) ? a.website : "");
      const phone = a.phone ? `<a href="tel:${a.phone.replace(/[^0-9+]/g,"")}">${a.phone}</a>` : "";
      const email = a.email ? `<a href="mailto:${a.email}">${a.email}</a>` : "";
      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${color}">CDSS Apprenticeship${a.industry ? " · " + a.industry : ""}</div>
          <div class="cp-map-popup-name">${a.occupation || a.sponsor}</div>
          <div class="cp-map-popup-meta">${a.sponsor || ""}</div>
          ${a.length || a.minAge ? `<div class="cp-map-popup-meta">${a.length || ""}${a.length && a.minAge ? " · " : ""}${a.minAge ? "min age " + a.minAge : ""}</div>` : ""}
          ${a.educationPrereq ? `<div class="cp-map-popup-careers"><strong>Prereq:</strong> ${a.educationPrereq}</div>` : ""}
          ${(phone || email) ? `<div class="cp-map-popup-careers">${[phone,email].filter(Boolean).join(" · ")}</div>` : ""}
          ${url ? `<div class="cp-map-popup-link"><a href="${url}" target="_blank" rel="noopener">Visit program site →</a></div>` : ""}
        </div>
      `;

      // Per-program (search) marker
      const progMarker = window.L.circleMarker([a.lat, a.lng], {
        radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85,
      });
      progMarker.bindPopup(popup, { maxWidth: 360 });
      progMarker._tier = tier;
      progMarker._haystack = expandNicknames([
        a.occupation, a.sponsor, a.industry, a.loc,
        "apprenticeship cdss das",
      ].filter(Boolean).join(" ")).toLowerCase();
      programMarkersByTier[tier].push(progMarker);

      // Group (default) marker — apprenticeships are point-locations, not
      // multi-program institutions, so no aggregation needed.
      const groupMarker = window.L.circleMarker([a.lat, a.lng], {
        radius: 7, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85,
      });
      groupMarker.bindPopup(popup, { maxWidth: 360 });
      groupMarker._tier = tier;
      groupMarker._count = 1;   // each apprenticeship is one program
      groupMarker._isApprenticeship = true;
      // Stash on a parallel array we'll merge into groupMarkersByTier below
      if (!map._apprenticeshipGroupMarkers) map._apprenticeshipGroupMarkers = [];
      map._apprenticeshipGroupMarkers.push(groupMarker);
      mapped++;
    });

    // Build one marker per group (institution-at-location)
    const groupMarkersByTier = { cc: [], csu: [], uc: [], private: [], trade: [] };
    Object.values(groups).forEach(g => {
      const tier = g.tier;
      const color = TIER_COLORS[tier] || "#999";
      const tierLabel = tierLabels[tier] || tier;
      const count = g.programs.length;

      // Programs list inside the popup. Each row links to the careers it serves.
      const progsHtml = g.programs.map(({ p, prog, careers }) => {
        const careerLinks = careers
          .map(c => `<a href="#" data-career-id="${c.id}" class="cp-map-clink">${c.name}</a>`)
          .join(", ");
        const url = p.url ? ` <a href="${p.url}" target="_blank" rel="noopener" class="cp-map-popup-progurl">site →</a>` : "";
        const careerLine = careers.length
          ? `<div class="cp-map-popup-progmeta"><span class="cp-stat-meta">For:</span> ${careerLinks}</div>`
          : "";
        return `
          <li class="cp-map-popup-prog">
            <div class="cp-map-popup-progname">${prog}${url}</div>
            ${p.duration ? `<div class="cp-map-popup-progmeta"><span class="cp-stat-meta">${p.duration}</span></div>` : ""}
            ${careerLine}
          </li>
        `;
      }).join("");

      const popup = `
        <div class="cp-map-popup">
          <div class="cp-map-popup-tier" style="color:${color}">${tierLabel}</div>
          <div class="cp-map-popup-name">${g.org}</div>
          <div class="cp-map-popup-meta">${g.loc || ""} · ${count} program${count === 1 ? "" : "s"}</div>
          <ul class="cp-map-popup-progs">${progsHtml}</ul>
        </div>
      `;
      // Slightly larger radius scales with program count, capped so big
      // institutions don't dominate the map visually.
      const radius = Math.min(13, 7 + Math.round(Math.log2(count + 1)));
      const groupMarker = window.L.circleMarker([g.lat, g.lng], {
        radius, color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85,
      });
      groupMarker.bindPopup(popup, { maxWidth: 380 });
      groupMarker._tier = tier;
      groupMarker._count = count;
      groupMarkersByTier[tier].push(groupMarker);
    });

    // Merge apprenticeship markers into the group view's trade tier so they
    // show alongside the institution markers when the search box is empty.
    if (map._apprenticeshipGroupMarkers) {
      groupMarkersByTier.trade.push(...map._apprenticeshipGroupMarkers);
    }

    map._programMarkersByTier = programMarkersByTier;
    map._groupMarkersByTier = groupMarkersByTier;
    map._groupCount = Object.values(groupMarkersByTier).reduce((n, arr) => n + arr.length, 0);
    setStats({ total: all.length + apprenticeships.length, mapped, missing, visible: map._groupCount, mode: "groups" });

    // Delegate clicks on career links inside popups to the React handler
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

    // Auto-fit bounds (use group markers since that's the default view)
    const allGroupMarkers = Object.values(groupMarkersByTier).flat();
    if (allGroupMarkers.length) {
      const fg = window.L.featureGroup(allGroupMarkers);
      map.fitBounds(fg.getBounds().pad(0.05));
    }

    // Cleanup on unmount
    return () => { map.remove(); };
  }, [onOpenCareer, programToCareers, tierLabels]);

  // Filter visibility based on active tiers AND search query.
  // Mode: empty search -> group markers (one per institution-location);
  //       any search   -> per-program markers (the granular view).
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map._programMarkersByTier) return;
    const layer = map.markerLayer;
    const q = query.trim().toLowerCase();
    const useGroups = !q;
    const sourceByTier = useGroups ? map._groupMarkersByTier : map._programMarkersByTier;
    const otherByTier  = useGroups ? map._programMarkersByTier : map._groupMarkersByTier;

    // Make sure the inactive layer set is fully removed first
    Object.values(otherByTier).flat().forEach(m => {
      if (layer.hasLayer(m)) layer.removeLayer(m);
    });

    let visible = 0;
    let visiblePrograms = 0;   // sum of programs across visible institution markers
    const visibleMarkers = [];
    Object.entries(sourceByTier).forEach(([tier, markers]) => {
      markers.forEach(m => {
        const tierMatch = activeTiers[tier];
        const queryMatch = !q || (m._haystack && m._haystack.includes(q));
        const show = tierMatch && queryMatch;
        if (show) {
          if (!layer.hasLayer(m)) layer.addLayer(m);
          visible++;
          visiblePrograms += (m._count || 1);
          visibleMarkers.push(m);
        } else {
          if (layer.hasLayer(m)) layer.removeLayer(m);
        }
      });
    });
    setStats(prev => ({ ...prev, visible, visiblePrograms, mode: useGroups ? "groups" : "programs" }));

    // If a search narrowed the results meaningfully, fit map to them
    if (q && visibleMarkers.length > 0 && visibleMarkers.length < 30) {
      const group = window.L.featureGroup(visibleMarkers);
      map.fitBounds(group.getBounds().pad(0.15), { animate: true, maxZoom: 14 });
    }
  }, [activeTiers, query]);

  const toggleTier = (t) => setActiveTiers(prev => ({ ...prev, [t]: !prev[t] }));
  const clearQuery = () => { setQuery(""); setSugOpen(false); };

  const pickSuggestion = (name) => {
    setQuery(name);
    setSugOpen(false);
    setSugIndex(-1);
  };

  const onSearchFocus = () => {
    clearTimeout(blurTimerRef.current);
    if (suggestions.length) setSugOpen(true);
  };
  const onSearchBlur = () => {
    // Defer so click on a suggestion can register before the dropdown unmounts.
    blurTimerRef.current = setTimeout(() => setSugOpen(false), 120);
  };
  const onSearchChange = (e) => {
    setQuery(e.target.value);
    setSugOpen(true);
  };
  const onSearchKey = (e) => {
    if (!sugOpen || suggestions.length === 0) {
      if (e.key === "Escape") setSugOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSugIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSugIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (sugIndex >= 0 && sugIndex < suggestions.length) {
        e.preventDefault();
        pickSuggestion(suggestions[sugIndex]);
      }
    } else if (e.key === "Escape") {
      setSugOpen(false);
    }
  };

  return (
    <main className="cp-main">
      <div className="cp-map-head">
        <h1 className="cp-h1">Programs near you</h1>
        <p className="cp-lede">{stats.mode === "groups"
          ? <><strong>{stats.visiblePrograms ?? stats.mapped}</strong> programs across <strong>{stats.visible}</strong> institutions, color-coded by school type. Click a marker to see all the programs there, or search a specific career.</>
          : <>{stats.mapped} programs on this site, color-coded by school type. Click a marker to see what it offers.</>
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
                    <li
                      key={name}
                      role="option"
                      aria-selected={i === sugIndex}
                      className={"cp-map-sug" + (i === sugIndex ? " on" : "")}
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(name); }}
                      onMouseEnter={() => setSugIndex(i)}
                    >
                      <span className="cp-map-sug-name">
                        {idx >= 0 ? (
                          <>
                            {name.slice(0, idx)}
                            <strong>{name.slice(idx, idx + q.length)}</strong>
                            {name.slice(idx + q.length)}
                          </>
                        ) : name}
                      </span>
                      <span className="cp-map-sug-tag">career</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {query && (
            <button className="cp-map-search-clear" onClick={clearQuery} aria-label="Clear search">×</button>
          )}
          <span className="cp-map-search-count">
            {stats.mode === "groups"
              ? `${stats.visiblePrograms ?? stats.mapped} program${(stats.visiblePrograms ?? stats.mapped) === 1 ? "" : "s"} · ${stats.visible} institution${stats.visible === 1 ? "" : "s"}`
              : (stats.visible === stats.mapped
                  ? `${stats.mapped} programs`
                  : `${stats.visible} of ${stats.mapped} programs`)}
          </span>
        </div>
        <div className="cp-map-legend">
          {["cc","csu","uc","private","trade"].map(t => (
            <button
              key={t}
              className={"cp-map-chip " + t + (activeTiers[t] ? " on" : "")}
              onClick={() => toggleTier(t)}
              style={{ "--chip-color": TIER_COLORS[t] }}
              aria-pressed={activeTiers[t]}
            >
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
