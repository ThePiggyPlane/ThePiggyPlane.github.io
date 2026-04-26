// Top-level app — routes between views, owns saved-state with localStorage.

const STORAGE_KEY = "clearpath:saved:v1";

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

const App = () => {
  const [route, setRoute] = React.useState({ view: "home" });
  const [showWiz, setShowWiz] = React.useState(false);
  const [saved, toggleSave] = useSaved();

  const go = React.useCallback((view, extra = {}) => {
    setRoute({ view, ...extra });
    window.scrollTo({ top: 0, behavior: 'instant' });
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
      view = <CpMoney onOpenAid={onOpenAid} />;
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
      <CpFooter />
      {showWiz && <CpWizard onClose={() => setShowWiz(false)} onMatch={handleMatch} />}
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
