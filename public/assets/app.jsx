/* ============================================================
   SPAZIO — App shell, routing, tweaks, mount
   ============================================================ */

/* ---- Tweak presets ---- */
const ACCENTS = {
  "#3E7D5A": { // Pine (refined default)
    accent: "oklch(0.52 0.115 156)", deep: "oklch(0.40 0.095 158)", bright: "oklch(0.60 0.125 154)",
    soft: "oklch(0.948 0.028 156)", mid: "oklch(0.885 0.055 156)", line: "oklch(0.825 0.05 157)",
  },
  "#86A18C": { // Sage (softer, more feminine)
    accent: "oklch(0.68 0.052 150)", deep: "oklch(0.52 0.05 152)", bright: "oklch(0.74 0.06 150)",
    soft: "oklch(0.955 0.018 150)", mid: "oklch(0.90 0.032 150)", line: "oklch(0.85 0.035 150)",
  },
  "#1F8A5B": { // Emerald (deeper, richer)
    accent: "oklch(0.57 0.13 161)", deep: "oklch(0.43 0.11 162)", bright: "oklch(0.64 0.14 160)",
    soft: "oklch(0.94 0.045 162)", mid: "oklch(0.86 0.078 161)", line: "oklch(0.80 0.078 162)",
  },
};
const PAPERS = {
  warm: { bg: "#F4F1E9", bg2: "#ECE8DD", bg3: "#E4DFD1", surface: "#FBF9F3", line: "#DFD9C9", line2: "#CFC8B5", line3: "#BCB4A0", ink: "#17160F", ink2: "#514E44", ink3: "#847F71", ink4: "#ADA897" },
  cool: { bg: "#F4F5F4", bg2: "#EAECEA", bg3: "#E0E3E0", surface: "#FBFCFB", line: "#E0E3E0", line2: "#D0D4D1", line3: "#BEC4C0", ink: "#15171A", ink2: "#4C5157", ink3: "#828990", ink4: "#AEB4B8" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3E7D5A",
  "displayFont": "Grotesk",
  "paper": "warm",
  "motion": true
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const r = document.documentElement.style;
  const a = ACCENTS[t.accent] || ACCENTS["#3E7D5A"];
  r.setProperty("--accent", a.accent);
  r.setProperty("--accent-deep", a.deep);
  r.setProperty("--accent-bright", a.bright);
  r.setProperty("--accent-soft", a.soft);
  r.setProperty("--accent-mid", a.mid);
  r.setProperty("--accent-line", a.line);

  const p = PAPERS[t.paper] || PAPERS.warm;
  r.setProperty("--bg", p.bg); r.setProperty("--bg-2", p.bg2); r.setProperty("--bg-3", p.bg3);
  r.setProperty("--surface", p.surface);
  r.setProperty("--line", p.line); r.setProperty("--line-2", p.line2); r.setProperty("--line-3", p.line3);
  r.setProperty("--ink", p.ink); r.setProperty("--ink-2", p.ink2);
  r.setProperty("--ink-3", p.ink3); r.setProperty("--ink-4", p.ink4);

  r.setProperty("--display", t.displayFont === "Serif" ? "var(--serif)" : "var(--display-face)");

  document.documentElement.classList.toggle("no-motion", !t.motion);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { applyTweaks(t); }, [t]);

  const getHash = () => {
    const h = (window.location.hash || "#home").replace("#", "");
    if (h.startsWith("review=")) return "review";
    return ROUTES.includes(h) ? h : "home";
  };
  const getReviewId = () => {
    const h = (window.location.hash || "").replace("#", "");
    if (h.startsWith("review=")) return h.split("=")[1] || "";
    return "";
  };
  const [route, setRoute] = useState(getHash());
  const [reviewId, setReviewId] = useState(getReviewId());

  const navigate = useCallback((id) => {
    if (!ROUTES.includes(id)) id = "home";
    if (window.location.hash !== `#${id}`) window.location.hash = id;
    setRoute(id);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, []);

  useEffect(() => {
    const onHash = () => { setRoute(getHash()); setReviewId(getReviewId()); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Per-route <title> + meta description (the static <head> in site-html.ts
  // carries the homepage/OG defaults; this updates them as the SPA navigates).
  useEffect(() => {
    const META = {
      home:      ["Spazio — Brand Strategy and Identity for App and SaaS Founders", "Spazio helps app and SaaS founders close the gap between a great product and a brand that matches it — strategy, positioning, and identity. Start with a $750 Brand Gap Audit."],
      about:     ["About — Spazio | Brand Strategy for App and SaaS Founders", "Meet Christine, founder of Spazio. Agency-caliber brand strategy and identity for app and SaaS founders — delivered direct and fast, by the person doing the work."],
      services:  ["Services — Spazio | Brand Strategy, Identity and Web", "Brand strategy and positioning, visual identity, creative direction, and brand-led web for app and SaaS founders."],
      process:   ["Process — Spazio | From Audit to Identity in Weeks", "How Spazio works: from Brand Gap Audit to strategy, identity, and handoff — in weeks, not quarters."],
      work:      ["Work — Spazio | Selected Brand and Identity Projects", "Selected brand strategy and identity work for founders and growing digital products."],
      start:     ["Start a Brand Gap Audit — Spazio", "Start with a $750 Brand Gap Audit, credited toward your engagement."],
      subscribe: ["Subscribe — Spazio", "Occasional notes on brand, design, and digital work for founders."],
    };
    const [title, desc] = META[route] || META.home;
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);
  }, [route]);

  let Page;
  switch (route) {
    case "services": Page = <ServicesPage />; break;
    case "process":  Page = <ProcessPage />; break;
    case "work":     Page = <WorkPage />; break;
    case "about":    Page = <AboutPage />; break;
    case "start":    Page = <StartPage />; break;
    case "subscribe":Page = <SubscribePage />; break;
    case "foundation": Page = <main><section style={{ paddingTop: "clamp(40px,6vw,84px)", paddingBottom: "clamp(56px,8vw,108px)" }}><div className="wrap"><PaidFoundationGate /></div></section></main>; break;
    case "brief-ready": Page = <main><section style={{ paddingTop: "clamp(40px,6vw,84px)", paddingBottom: "clamp(56px,8vw,108px)" }}><div className="wrap"><BriefReadyPage /></div></section></main>; break;
    case "review": Page = <main><section style={{ paddingTop: "clamp(40px,6vw,84px)", paddingBottom: "clamp(56px,8vw,108px)" }}><div className="wrap"><ClientReviewPage reportId={reviewId} /></div></section></main>; break;
    default:         Page = <HomePage />;
  }

  return (
    <RouterCtx.Provider value={{ route, navigate }}>
      <Nav />
      <div key={route} className="page-fade">{Page}</div>
      <Footer />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent — pine family" />
        <TweakColor label="Accent" value={t.accent}
          options={Object.keys(ACCENTS)}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Type & surface" />
        <TweakRadio label="Display font" value={t.displayFont}
          options={["Grotesk", "Serif"]}
          onChange={(v) => setTweak("displayFont", v)} />
        <TweakRadio label="Paper" value={t.paper}
          options={["warm", "cool"]}
          onChange={(v) => setTweak("paper", v)} />
        <TweakSection label="Motion" />
        <TweakToggle label="Entrance motion" value={t.motion}
          onChange={(v) => setTweak("motion", v)} />
      </TweaksPanel>
    </RouterCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
