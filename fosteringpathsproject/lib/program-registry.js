// Programs registry — a flat dictionary keyed by program id.
// Programs are referenced by careers via career.programs: ["uc-arch", ...].
// Add a program by calling window.registerProgram({ id, ... }).
(function () {
  const map = {};

  window.registerProgram = function (p) {
    if (!p || !p.id) return;
    map[p.id] = p;
  };

  window.registerPrograms = function (obj) {
    Object.entries(obj).forEach(([id, p]) => {
      map[id] = { id, ...p };
    });
  };

  window.PROGRAMS = {
    get: (id) => map[id],
    all: () => Object.values(map),
  };
})();
