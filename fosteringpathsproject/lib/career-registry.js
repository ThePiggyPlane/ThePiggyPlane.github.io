// Career registry — every career file calls window.registerCareer({...})
// to add itself to the catalog. Order is preserved by registration order
// unless `order` is set. Add a new career by writing a new file under
// careers/ and including its <script> tag in clear-path.html.
(function () {
  const list = [];
  const byId = new Map();

  window.registerCareer = function (career) {
    if (!career || !career.id) {
      console.warn('registerCareer: missing id', career);
      return;
    }
    if (byId.has(career.id)) {
      // Allow hot-replacement (helpful during editing)
      const idx = list.findIndex(c => c.id === career.id);
      list[idx] = career;
      byId.set(career.id, career);
      return;
    }
    list.push(career);
    byId.set(career.id, career);
  };

  window.CAREERS = {
    all: () => [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    byId: (id) => byId.get(id),
    count: () => list.length,
    // Filter helpers
    byInterest: (interest) => list.filter(c => c.interests?.includes(interest)),
    byLengthBucket: (bucket) => list.filter(c => (c.lengthBucket || 'mid') === bucket),
  };
})();
