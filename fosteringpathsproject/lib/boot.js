// Loads the compiled components (dist/app.js). If the bundle is missing, falls
// back to compiling the JSX sources in the browser with Babel standalone, so an
// edit to components/*.jsx still works before `node tools/build.js` is run.
(function () {
  var files = window.FP_JSX_FILES || [];
  var BABEL = "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js";
  var BABEL_SRI = "sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y";
  function script(src, attrs) {
    var s = document.createElement("script");
    s.src = src; s.async = false;
    Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    return s;
  }
  function fallback() {
    console.warn("Fostering Paths: dist/app.js not found, compiling JSX in the browser. Run `node tools/build.js` to make the site load faster.");
    var b = script(BABEL, { integrity: BABEL_SRI, crossorigin: "anonymous" });
    b.onload = function () {
      files.forEach(function (f) {
        var s = document.createElement("script");
        s.type = "text/babel"; s.src = f;
        document.body.appendChild(s);
      });
      if (window.Babel && window.Babel.transformScriptTags) window.Babel.transformScriptTags();
    };
    b.onerror = function () { console.error("Could not load Babel standalone; the site cannot start."); };
    document.head.appendChild(b);
  }
  var dist = script("dist/app.js");
  dist.onerror = fallback;
  document.body.appendChild(dist);
})();
