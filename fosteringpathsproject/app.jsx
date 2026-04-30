// Top-level app — routes between views, owns saved-state with localStorage.
// Routing uses the URL hash (e.g. #/map, #/career/architect) so refresh,
// bookmarks, and browser back/forward all preserve the current view.

const STORAGE_KEY  = "clearpath:saved:v1";
const PROFILE_KEY  = "clearpath:profile:v1";

const useSaved = () => {
  const [saved, setSaved] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {}
  }, [saved]);
  const toggleSave = React.useCallback((id) => {
    setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);
  return [saved, toggleSave];
};

// Aid-eligibility profile, gathered once via the intake survey before
// the cost calculator is shown. null until the user completes it.
const useProfile = () => {
  const [profile, setProfile] = React.useState(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  React.useEffect(() => {
    try {
      if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      else         localStorage.removeItem(PROFILE_KEY);
    } catch {}
  }, [profile]);
  return [profile, setProfile];
};

// ---- URL hash <-> route object -------------------------------------------
const SIMPLE_VIEWS = new Set(["home","map","apprenticeships","money","week","about","compare"]);

const parseHash = () => {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  if (!h) return { view: "home" };
  const [view, id] = h.split("/");
  if (view === "career" && id) return { view: "career", careerId: decodeURIComponent(id) };
  if (view === "aid"    && id) return { view: "aid",    aidId:    decodeURIComponent(id) };
  if (SIMPLE_VIEWS.has(view))  return { view };
  // result has transient state (quiz answers); fall back to home on refresh
  return { view: "home" };
};

const buildHash = (route) => {
  const { view, careerId, aidId } = route;
  if (!view || view === "home")          return "#/";
  if (view === "career" && careerId)     return "#/career/" + encodeURIComponent(careerId);
  if (view === "aid"    && aidId)        return "#/aid/"    + encodeURIComponent(aidId);
  if (view === "result")                 return "#/";   // not addressable; quiz state is transient
  return "#/" + view;
};

const App = () => {
  const [route, setRoute] = React.useState(() => parseHash());
  const [showWiz, setShowWiz] = React.useState(false);
  const [saved, toggleSave] = useSaved();
  const [profile, setProfile] = useProfile();

  // hashchange (back/forward, manual edits, refresh) -> sync state
  React.useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = React.useCallback((view, extra = {}) => {
    const next = { view, ...extra };
    const wantHash = buildHash(next);
    if (window.location.hash === wantHash) {
      // already at this hash — still update state (in case extra changed) + scroll
      setRoute(next);
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      // setting hash fires hashchange → onHash() updates state + scrolls
      window.location.hash = wantHash;
      // Result view carries transient quiz data that the URL can't hold;
      // keep it in state so the rendered page can read it.
      if (view === "result") setRoute(next);
    }
  }, []);

  const onOpenCareer = (id) => go("career", { careerId: id });
  const onOpenAid = (id) => go("aid", { aidId: id });

  const handleMatch = (result) => {
    setShowWiz(false);
    go("result", { result });
  };

  let view;
  switch (route.view) {
    case "career":
      view = <CpCareer careerId={route.careerId} saved={saved} toggleSave={toggleSave} onBack={() => go("home")} onOpenAid={onOpenAid} />;
      break;
    case "money":
      view = <CpMoney onOpenAid={onOpenAid} profile={profile} setProfile={setProfile} />;
      break;
    case "aid":
      view = <CpAidDetail aidId={route.aidId} onBack={() => go("money")} />;
      break;
    case "week":
      view = <CpWeek />;
      break;
    case "about":
      view = <CpAbout />;
      break;
    case "map":
      view = <CpMap onOpenCareer={onOpenCareer} />;
      break;
    case "apprenticeships":
      view = <CpApprenticeships />;
      break;
    case "compare":
      view = <CpCompare saved={saved} toggleSave={toggleSave} onOpen={onOpenCareer} onBack={() => go("home")} />;
      break;
    case "result":
      view = <CpResult result={route.result} onOpen={onOpenCareer} onRetake={() => setShowWiz(true)} onBack={() => go("home")} />;
      break;
    default:
      view = <CpHome onOpen={onOpenCareer} onWizard={() => setShowWiz(true)} saved={saved} toggleSave={toggleSave} />;
  }

  return (
    <>
      <CpHeader view={route.view} go={go} savedCount={saved.length} onCompare={() => go("compare")} />
      {view}
      {showWiz && <CpWizard onClose={() => setShowWiz(false)} onMatch={handleMatch} />}
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
