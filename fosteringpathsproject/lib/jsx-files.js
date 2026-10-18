// The JSX sources, in load order. tools/build.js compiles them into dist/app.js;
// lib/boot.js loads that bundle, or compiles these in the browser when it is missing.
window.FP_JSX_FILES = [
  "components/shell.jsx",
  "components/location.jsx",
  "components/resources.jsx",
  "components/scholarships.jsx",
  "components/stateguide.jsx",
  "components/start.jsx",
  "components/faq.jsx",
  "components/home.jsx",
  "components/pages.jsx",
  "components/school.jsx",
  "components/plan.jsx",
  "components/wizard.jsx",
  "components/map.jsx",
  "components/apprenticeships.jsx",
  "app.jsx",
];
