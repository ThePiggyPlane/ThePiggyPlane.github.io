// Apprenticeship registry — keyed by DAS varOccId.
// Each apprenticeship record is added via window.registerApprenticeships([...]).
// The site's data/apprenticeships.js file is the bulk register call,
// scraped from https://www.dir.ca.gov/databases/das/aigstart.asp.
(function () {
  const map = {};

  window.registerApprenticeship = function (a) {
    if (!a || !a.id) return;
    map[a.id] = { id: a.id, ...a };
  };

  window.registerApprenticeships = function (list) {
    if (!Array.isArray(list)) return;
    for (const a of list) {
      if (a && a.id) map[a.id] = { id: a.id, ...a };
    }
  };

  window.APPRENTICESHIPS = {
    get: (id) => map[id],
    all: () => Object.values(map),
    count: () => Object.keys(map).length,
  };
})();
