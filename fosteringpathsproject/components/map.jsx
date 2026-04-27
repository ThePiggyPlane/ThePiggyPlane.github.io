// Map view — plots every program with lat/lng on a Leaflet/OpenStreetMap map.

const TIER_COLORS = {
  cc:      "#5B8A72",
  csu:     "#2D6A9F",
  uc:      "#1E3A5F",
  private: "#8B5A3C",
  trade:   "#B54A1F",
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
  const [activeTiers, setActiveTiers] = React.useState({ cc: true, csu: true, uc: true, private: true, trade: true });
  const [stats, setStats] = React.useState({ total: 0, mapped: 0, missing: 0 });
  const programToCareers = React.useMemo(buildProgramToCareers, []);
  const tierLabels = window.APP_META.tierLabels;

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
    const markersByTier = { cc: [], csu: [], uc: [], private: [], trade: [] };

    all.forEach(p => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") {
        missing++;
        return;
      }
      mapped++;
      const color = TIER_COLORS[p.tier] || "#999";
      const careers = programToCareers[p.id] || [];
      const careerLinks = careers
        .map(c => `<a href="#" data-career-id="${c.id}" class="cp-map-clink">${c.name}</a>`)
        .join(", ");
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
      const marker = window.L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#fff",
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.85,
      });
      marker.bindPopup(popup, { maxWidth: 320 });
      marker._tier = p.tier;
      markersByTier[p.tier].push(marker);
      layer.addLayer(marker);
    });

    map._markersByTier = markersByTier;
    setStats({ total: all.length, mapped, missing });

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

    // Auto-fit bounds
    const allMarkers = Object.values(markersByTier).flat();
    if (allMarkers.length) {
      const group = window.L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.05));
    }

    // Cleanup on unmount
    return () => { map.remove(); };
  }, [onOpenCareer, programToCareers, tierLabels]);

  // Toggle tier visibility
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map._markersByTier) return;
    const layer = map.markerLayer;
    Object.entries(map._markersByTier).forEach(([tier, markers]) => {
      markers.forEach(m => {
        if (activeTiers[tier]) {
          if (!layer.hasLayer(m)) layer.addLayer(m);
        } else {
          if (layer.hasLayer(m)) layer.removeLayer(m);
        }
      });
    });
  }, [activeTiers]);

  const toggleTier = (t) => setActiveTiers(prev => ({ ...prev, [t]: !prev[t] }));

  return (
    <main className="cp-main">
      <div className="cp-map-head">
        <h1 className="cp-h1">Programs near you</h1>
        <p className="cp-lede">Every {stats.mapped} program on this site, color-coded by school type. Click a marker to see what it offers.</p>
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
        {stats.missing > 0 && (
          <p className="cp-map-note">{stats.missing} program{stats.missing === 1 ? "" : "s"} not pinned (address couldn't be located precisely).</p>
        )}
      </div>
      <div ref={containerRef} className="cp-map-canvas" />
    </main>
  );
};

window.CpMap = CpMap;
