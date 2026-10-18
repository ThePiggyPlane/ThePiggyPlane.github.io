// Programs registry — a flat dictionary keyed by program id.
// Legacy: careers reference programs via career.programs: ["uc-arch", ...].
// New (state files): programs declare careers: ["paralegal"], plus state/region.
// Add a program by calling window.registerProgram({ id, ... }) or
// window.registerPrograms({ id: {...}, ... }).
(function () {
  const map = {};
  // careerId -> Set(programId), built from program.careers[] (state files)
  const careerIndex = {};

  // Legacy CA data has no state/region; derive from the city.
  const CA_CITY_REGION = {
    "Riverside": "Inland Empire", "San Bernardino": "Inland Empire", "Rancho Cucamonga": "Inland Empire",
    "San Jacinto": "Inland Empire", "Victorville": "Inland Empire", "Ontario": "Inland Empire", "Norco": "Inland Empire",
    "Moreno Valley": "Inland Empire", "Palm Desert": "Inland Empire", "Yucaipa": "Inland Empire", "Temecula": "Inland Empire",
    "Menifee": "Inland Empire", "Barstow": "Inland Empire", "Loma Linda": "Inland Empire", "Colton": "Inland Empire",
    "Chino": "Inland Empire", "Fontana": "Inland Empire", "Redlands": "Inland Empire", "Apple Valley": "Inland Empire",
    "Indio": "Inland Empire", "Corona": "Inland Empire", "Hesperia": "Inland Empire", "Murrieta": "Inland Empire",
    "Palm Springs": "Inland Empire", "Joshua Tree": "Inland Empire", "Upland": "Inland Empire", "Chino Hills": "Inland Empire",
    "Fullerton": "Orange County", "Mission Viejo": "Orange County", "Santa Ana": "Orange County", "Costa Mesa": "Orange County",
    "Irvine": "Orange County", "Cypress": "Orange County", "Orange": "Orange County", "Anaheim": "Orange County",
    "Garden Grove": "Orange County", "Tustin": "Orange County", "Huntington Beach": "Orange County", "Fountain Valley": "Orange County",
    "Laguna Beach": "Orange County", "Newport Beach": "Orange County", "Buena Park": "Orange County", "La Mirada": "Los Angeles",
    "Walnut": "Los Angeles", "Pomona": "Los Angeles", "Pasadena": "Los Angeles", "Long Beach": "Los Angeles",
    "Los Angeles": "Los Angeles", "Whittier": "Los Angeles", "Glendora": "Los Angeles", "Azusa": "Los Angeles",
    "La Verne": "Los Angeles", "Claremont": "Los Angeles", "San Marcos": "San Diego", "San Diego": "San Diego",
    "Westminster": "Orange County", "Laguna Hills": "Orange County", "Blythe": "Inland Empire", "Montclair": "Inland Empire",
    "Beaumont": "Inland Empire", "Bloomington": "Inland Empire", "Jurupa Valley": "Inland Empire", "Rialto": "Inland Empire",
    "Huntington Park": "Los Angeles", "San Luis Obispo": "Central Coast", "San Francisco": "Bay Area", "San Jose": "Bay Area",
  };

  const add = (id, p) => {
    const prog = { id, ...p };
    if (!prog.state) prog.state = "CA";
    if (!prog.region && prog.state === "CA" && prog.loc && CA_CITY_REGION[prog.loc]) prog.region = CA_CITY_REGION[prog.loc];
    if (!prog.inst && typeof prog.name === "string") {
      const i = prog.name.indexOf(" — ");
      prog.inst = i === -1 ? prog.name : prog.name.slice(0, i).trim();
    }
    map[id] = prog;
    if (Array.isArray(prog.careers)) {
      for (const c of prog.careers) {
        if (!careerIndex[c]) careerIndex[c] = new Set();
        careerIndex[c].add(id);
      }
    }
  };

  window.registerProgram = function (p) {
    if (!p || !p.id) return;
    add(p.id, p);
  };

  window.registerPrograms = function (obj) {
    Object.entries(obj).forEach(([id, p]) => add(id, p));
    try { window.dispatchEvent(new CustomEvent("fp:data")); } catch (e) {}
  };

  window.PROGRAMS = {
    get: (id) => map[id],
    all: () => Object.values(map),
    count: () => Object.keys(map).length,
    byState: (st) => Object.values(map).filter(p => p.state === st),
    // Programs for a career: the career's own curated list (any state) plus
    // every program whose careers[] names it. Curated ones come first.
    forCareer: (careerId, opts = {}) => {
      const career = window.CAREERS && window.CAREERS.byId(careerId);
      const seen = new Set();
      const out = [];
      ((career && career.programs) || []).forEach(pid => {
        const p = map[pid];
        if (p && !seen.has(pid)) { seen.add(pid); out.push({ ...p, curated: true }); }
      });
      (careerIndex[careerId] ? [...careerIndex[careerId]] : []).forEach(pid => {
        if (!seen.has(pid)) { seen.add(pid); out.push(map[pid]); }
      });
      let xs = out;
      if (opts.state) xs = xs.filter(p => p.state === opts.state);
      if (opts.region) xs = xs.filter(p => p.region === opts.region);
      return xs;
    },
    // Distinct regions for a state, most programs first.
    regions: (st) => {
      const counts = {};
      Object.values(map).forEach(p => { if (p.state === st && p.region) counts[p.region] = (counts[p.region] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r]) => r);
    },
  };
})();
