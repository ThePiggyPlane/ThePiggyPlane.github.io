// Location (state + region) and lazy loading of per-state data files.
//
//   window.FP_STATES            [{ code, name }] for all 50 states + DC
//   window.getLocation()        { state: "CA", region: "Inland Empire" | "" }
//   window.setLocation(loc)     persists to localStorage, dispatches "fp:location"
//   window.loadStateData(st)    Promise; injects data/states/<ST>/*.js from STATE_INDEX once
//   window.stateLoadStatus(st)  "idle" | "loading" | "ready" | "missing" | "error"
//
// Components listen to "fp:data" (fired by registries when records arrive) and
// "fp:location" to re-render.
(function () {
  const NAMES = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};
  window.FP_STATES = Object.entries(NAMES).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  window.stateName = (code) => NAMES[code] || code;

  const LOC_KEY = "cp:location";
  const DEFAULT_LOC = { state: "CA", region: "Inland Empire" };
  let loc = (() => {
    try {
      const raw = localStorage.getItem(LOC_KEY);
      const v = raw ? JSON.parse(raw) : null;
      if (v && NAMES[v.state]) return { state: v.state, region: v.region || "" };
    } catch (e) {}
    return { ...DEFAULT_LOC };
  })();

  window.getLocation = () => ({ ...loc });
  window.setLocation = (next) => {
    const st = next && NAMES[next.state] ? next.state : loc.state;
    loc = { state: st, region: (next && next.region) || "" };
    try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("fp:location", { detail: loc })); } catch (e) {}
    window.loadStateData(st);
  };

  // ---- lazy loader ----
  const status = {};   // st -> idle|loading|ready|missing|error
  const promises = {};
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;         // keep order within a state
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error("failed to load " + src));
    document.head.appendChild(s);
  });

  window.stateLoadStatus = (st) => status[st] || "idle";
  window.loadStateData = (st) => {
    if (!st || !NAMES[st]) return Promise.resolve();
    if (promises[st]) return promises[st];
    const idx = window.STATE_INDEX && window.STATE_INDEX[st];
    if (!idx || !idx.files || !idx.files.length) {
      status[st] = "missing";
      return (promises[st] = Promise.resolve());
    }
    status[st] = "loading";
    try { window.dispatchEvent(new CustomEvent("fp:data")); } catch (e) {}
    promises[st] = Promise.all(idx.files.map(f => loadScript(`data/states/${st}/${f}`)))
      .then(() => { status[st] = "ready"; })
      .catch((e) => { console.error(e); status[st] = "error"; })
      .finally(() => { try { window.dispatchEvent(new CustomEvent("fp:data")); } catch (e) {} });
    return promises[st];
  };

  // Human label for the current location ("Inland Empire, California" / "Texas")
  window.locationLabel = (l = loc) => l.region ? `${l.region}, ${NAMES[l.state]}` : NAMES[l.state];

  // ---- device location ("near me") ----
  // Approximate state bounding boxes [south, west, north, east] plus a centroid
  // to break ties. Good enough to pick a state from a GPS fix.
  const BOX = {AL:[30.2,-88.5,35.0,-84.9,32.8,-86.8],AK:[51.2,-179.1,71.4,-129.9,64.0,-152.0],AZ:[31.3,-114.8,37.0,-109.0,34.3,-111.7],AR:[33.0,-94.6,36.5,-89.6,34.9,-92.4],CA:[32.5,-124.4,42.0,-114.1,37.2,-119.5],CO:[37.0,-109.1,41.0,-102.0,39.0,-105.5],CT:[40.98,-73.73,42.05,-71.79,41.6,-72.7],DE:[38.45,-75.79,39.84,-75.05,39.0,-75.5],DC:[38.79,-77.12,38.995,-76.91,38.9,-77.03],FL:[24.5,-87.6,31.0,-80.0,28.6,-82.4],GA:[30.4,-85.6,35.0,-80.8,32.7,-83.4],HI:[18.9,-160.3,22.3,-154.8,20.8,-156.3],ID:[42.0,-117.2,49.0,-111.0,44.4,-114.6],IL:[37.0,-91.5,42.5,-87.5,40.0,-89.2],IN:[37.8,-88.1,41.8,-84.8,39.9,-86.3],IA:[40.4,-96.6,43.5,-90.1,42.1,-93.5],KS:[37.0,-102.1,40.0,-94.6,38.5,-98.4],KY:[36.5,-89.6,39.1,-81.96,37.5,-85.3],LA:[28.9,-94.0,33.0,-88.8,31.1,-92.0],ME:[43.1,-71.1,47.5,-66.9,45.4,-69.2],MD:[37.9,-79.5,39.72,-75.05,39.0,-76.8],MA:[41.2,-73.5,42.9,-69.9,42.3,-71.8],MI:[41.7,-90.4,48.3,-82.4,44.3,-85.4],MN:[43.5,-97.2,49.4,-89.5,46.3,-94.3],MS:[30.2,-91.7,35.0,-88.1,32.7,-89.7],MO:[36.0,-95.8,40.6,-89.1,38.4,-92.5],MT:[44.4,-116.1,49.0,-104.0,47.0,-109.6],NE:[40.0,-104.1,43.0,-95.3,41.5,-99.8],NV:[35.0,-120.0,42.0,-114.0,39.3,-116.6],NH:[42.7,-72.6,45.3,-70.6,43.7,-71.6],NJ:[38.9,-75.6,41.36,-73.9,40.2,-74.7],NM:[31.3,-109.1,37.0,-103.0,34.4,-106.1],NY:[40.5,-79.8,45.0,-71.8,42.9,-75.5],NC:[33.8,-84.3,36.6,-75.4,35.6,-79.4],ND:[45.9,-104.1,49.0,-96.6,47.5,-100.5],OH:[38.4,-84.8,42.0,-80.5,40.4,-82.8],OK:[33.6,-103.0,37.0,-94.4,35.6,-97.5],OR:[42.0,-124.6,46.3,-116.5,43.9,-120.6],PA:[39.7,-80.5,42.3,-74.7,40.9,-77.8],RI:[41.1,-71.9,42.02,-71.1,41.7,-71.5],SC:[32.0,-83.4,35.2,-78.5,33.9,-80.9],SD:[42.5,-104.1,45.9,-96.4,44.4,-100.2],TN:[35.0,-90.3,36.7,-81.6,35.9,-86.4],TX:[25.8,-106.6,36.5,-93.5,31.5,-99.3],UT:[37.0,-114.1,42.0,-109.0,39.3,-111.7],VT:[42.7,-73.4,45.0,-71.5,44.1,-72.7],VA:[36.5,-83.7,39.5,-75.2,37.5,-78.8],WA:[45.5,-124.8,49.0,-116.9,47.4,-120.5],WV:[37.2,-82.6,40.6,-77.7,38.6,-80.6],WI:[42.5,-92.9,47.1,-86.8,44.6,-89.9],WY:[41.0,-111.1,45.0,-104.0,43.0,-107.5]};
  const GEO_KEY = "cp:geo";
  let geo = (() => { try { const v = JSON.parse(localStorage.getItem(GEO_KEY) || "null"); return v && typeof v.lat === "number" ? v : null; } catch (e) { return null; } })();
  window.getGeo = () => geo;
  window.setGeo = (g) => {
    geo = g && typeof g.lat === "number" ? { lat: g.lat, lng: g.lng, at: Date.now() } : null;
    try { if (geo) localStorage.setItem(GEO_KEY, JSON.stringify(geo)); else localStorage.removeItem(GEO_KEY); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("fp:location", { detail: loc })); } catch (e) {}
  };
  window.distanceMiles = (lat1, lng1, lat2, lng2) => {
    const R = 3958.8, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  // Which state a point falls in: inside its box, nearest centroid breaks ties.
  window.stateForPoint = (lat, lng) => {
    let best = null, bestD = Infinity;
    for (const [st, b] of Object.entries(BOX)) {
      if (lat >= b[0] && lat <= b[2] && lng >= b[1] && lng <= b[3]) {
        const d = window.distanceMiles(lat, lng, b[4], b[5]);
        if (d < bestD) { bestD = d; best = st; }
      }
    }
    if (best) return best;
    for (const [st, b] of Object.entries(BOX)) {
      const d = window.distanceMiles(lat, lng, b[4], b[5]);
      if (d < bestD) { bestD = d; best = st; }
    }
    return best;
  };
  // Region of the nearest program with coordinates in a (loaded) state.
  window.regionForPoint = (st, lat, lng) => {
    let best = "", bestD = Infinity;
    (window.PROGRAMS ? window.PROGRAMS.byState(st) : []).forEach(p => {
      if (typeof p.lat !== "number" || !p.region) return;
      const d = window.distanceMiles(lat, lng, p.lat, p.lng);
      if (d < bestD) { bestD = d; best = p.region; }
    });
    return best;
  };

  // Kick off the default state's data as early as possible.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.loadStateData(loc.state));
  } else {
    window.loadStateData(loc.state);
  }
})();
