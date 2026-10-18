// Location awareness: a hook that re-renders on data/location changes, a
// header chip showing the current place, and the picker modal.

// Re-render when a state's data finishes loading or the location changes.
// Returns { loc, tick, status } where status is the load status of loc.state.
const useFpLocation = () => {
  const [loc, setLoc] = React.useState(() => window.getLocation());
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const onLoc = () => { setLoc(window.getLocation()); setTick(t => t + 1); };
    const onData = () => setTick(t => t + 1);
    window.addEventListener("fp:location", onLoc);
    window.addEventListener("fp:data", onData);
    return () => { window.removeEventListener("fp:location", onLoc); window.removeEventListener("fp:data", onData); };
  }, []);
  // make sure the current state's files are requested
  React.useEffect(() => { window.loadStateData(loc.state); }, [loc.state]);
  return { loc, tick, status: window.stateLoadStatus(loc.state) };
};

// Regions available for a state: from loaded programs/resources, else from the manifest.
const regionsForState = (st) => {
  const fromData = {};
  (window.PROGRAMS ? window.PROGRAMS.byState(st) : []).forEach(p => { if (p.region) fromData[p.region] = (fromData[p.region] || 0) + 1; });
  (window.RESOURCES ? window.RESOURCES.byState(st) : []).forEach(r => { if (r.region) fromData[r.region] = (fromData[r.region] || 0) + 1; });
  let list = Object.entries(fromData).sort((a, b) => b[1] - a[1]).map(([r]) => r);
  if (!list.length && window.STATE_INDEX && window.STATE_INDEX[st]) list = window.STATE_INDEX[st].regions || [];
  // Keep CA's named regions in a stable, familiar order.
  if (st === "CA") {
    const order = ["Inland Empire", "Orange County", "Los Angeles", "San Diego", "Imperial", "Central Coast", "Central Valley", "Bay Area", "Sacramento", "North State", "Sierra"];
    list = order.filter(r => list.includes(r)).concat(list.filter(r => !order.includes(r)));
  }
  return list;
};

const CpLocationChip = ({ onOpen }) => {
  const { loc } = useFpLocation();
  return (
    <button className="cp-loc-chip" onClick={onOpen} title="Change your state or region" aria-label={"Location: " + window.locationLabel(loc) + ". Change"}>
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span className="cp-loc-chip-txt">{loc.region ? loc.region : window.stateName(loc.state)}</span>
      <span className="cp-loc-chip-st">{loc.region ? loc.state : ""}</span>
    </button>
  );
};

const CpLocationPicker = ({ onClose }) => {
  const start = window.getLocation();
  const [state, setState] = React.useState(start.state);
  const [region, setRegion] = React.useState(start.region || "");
  const { tick } = useFpLocation();
  // Load the chosen state's data so its regions appear while picking.
  React.useEffect(() => { window.loadStateData(state); }, [state]);
  const regions = React.useMemo(() => regionsForState(state), [state, tick]);
  const idx = window.STATE_INDEX && window.STATE_INDEX[state];
  const counts = idx ? idx.counts : null;
  const loading = window.stateLoadStatus(state) === "loading";

  React.useEffect(() => { if (region && regions.length && !regions.includes(region)) setRegion(""); }, [regions, region]);

  const apply = () => { window.setLocation({ state, region }); onClose(); };

  const [geoBusy, setGeoBusy] = React.useState(false);
  const [geoMsg, setGeoMsg] = React.useState("");
  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoMsg("Your browser does not share location."); return; }
    setGeoBusy(true); setGeoMsg("");
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const st = window.stateForPoint(lat, lng);
      window.setGeo({ lat, lng });
      setState(st);
      window.loadStateData(st).then(() => {
        const r = window.regionForPoint(st, lat, lng);
        setRegion(r || "");
        setGeoBusy(false);
        setGeoMsg(`Looks like ${r ? r + ", " : ""}${window.stateName(st)}. Programs and resources will sort by distance from you.`);
      });
    }, (err) => {
      setGeoBusy(false);
      setGeoMsg(err && err.code === 1 ? "Location permission was denied. Pick your state below instead." : "Could not get your location. Pick your state below.");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  };

  return (
    <CpModal onClose={onClose} ariaLabel="Choose your location">
      <button className="cp-wiz-x" onClick={onClose} aria-label="Close">Close</button>
      <div className="cp-wiz-step">Where are you?</div>
      <h2 className="cp-wiz-q">Show me programs and help near</h2>
      <div className="cp-loc-geo">
        <button type="button" className="cp-btn-ghost cp-loc-geo-btn" onClick={useMyLocation} disabled={geoBusy}>{geoBusy ? "Finding you…" : "Use my location"}</button>
        {window.getGeo() && !geoBusy && <button type="button" className="cp-link" onClick={() => { window.setGeo(null); setGeoMsg("Location cleared."); }}>Clear</button>}
      </div>
      {geoMsg && <p className="cp-loc-counts">{geoMsg}</p>}
      <label className="cp-loc-field">State
        <select value={state} onChange={e => { setState(e.target.value); setRegion(""); }}>
          {window.FP_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>
      <label className="cp-loc-field">Region <span className="cp-loc-opt">(optional)</span>
        <select value={region} onChange={e => setRegion(e.target.value)} disabled={!regions.length}>
          <option value="">{loading ? "Loading regions..." : (regions.length ? "Whole state" : "Whole state")}</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      {counts && (
        <p className="cp-loc-counts">
          {window.stateName(state)}: {counts.programs.toLocaleString()} programs
          {counts.resources ? `, ${counts.resources} support resources` : ""}
          {counts.scholarships ? `, ${counts.scholarships} scholarships` : ""}
          {counts.apprenticeships ? `, ${counts.apprenticeships} apprenticeships` : ""}
          {counts.guide ? ", state guide" : ""}
          {(!counts.resources && !counts.guide) ? ". Support resources and the state guide are still being added for this state." : "."}
        </p>
      )}
      <div className="cp-loc-actions">
        <button className="cp-btn" onClick={apply}>Use this location</button>
      </div>
      <p className="cp-survey-priv">Saved in your browser only. You can change it anytime from the pin in the header.</p>
    </CpModal>
  );
};

Object.assign(window, { useFpLocation, regionsForState, CpLocationChip, CpLocationPicker });
