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

  // Kick off the default state's data as early as possible.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.loadStateData(loc.state));
  } else {
    window.loadStateData(loc.state);
  }
})();
