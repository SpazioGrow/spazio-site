/* ============================================================
   SPAZIO — Core components: Router, Nav, Footer, Logo, atoms
   ============================================================ */

const { useState, useEffect, useRef, useContext, createContext, useCallback } = React;

/* ---------- Router (lightweight client routing) ---------- */
const RouterCtx = createContext({ route: "home", navigate: () => {} });
const useRouter = () => useContext(RouterCtx);

const ROUTES = ["home", "services", "process", "work", "start", "foundation", "subscribe"];

/* ---------- Scroll reveal ---------- */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in");
      return;
    }
    let done = false;
    let timer;
    const reveal = () => {
      if (done) return;
      done = true;
      el.classList.add("in");
      cleanup();
    };
    const check = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      if (r.top < vh * 0.94 && r.bottom > -40) reveal();
    };
    const cleanup = () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      clearTimeout(timer);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    // Safety: never leave content hidden even if scroll events are throttled
    timer = setTimeout(reveal, 1500);
    requestAnimationFrame(check);
    requestAnimationFrame(() => requestAnimationFrame(check));
    return cleanup;
  }, []);
  return ref;
}

function Reveal({ children, delay = 0, className = "", as = "div", ...rest }) {
  const ref = useReveal();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------- Arrow glyph ---------- */
const Arrow = ({ size = 14 }) => (
  <svg className="arr" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowDown = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 3v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- Signature spatial primitives ---------- */
function CropMarks({ color = "var(--ink-3)" }) {
  return (
    <>
      <span className="crop crop--tl" style={{ color }} aria-hidden="true" />
      <span className="crop crop--tr" style={{ color }} aria-hidden="true" />
      <span className="crop crop--bl" style={{ color }} aria-hidden="true" />
      <span className="crop crop--br" style={{ color }} aria-hidden="true" />
    </>
  );
}
function ColTicks({ count = 12, style }) {
  return (
    <div className="colticks" style={style} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>{String(i + 1).padStart(2, "0")}</span>
      ))}
    </div>
  );
}
function Measure({ label, vertical = false, style }) {
  return (
    <div className={`measure ${vertical ? "measure--v" : ""}`} style={style} aria-hidden="true">
      <span>{label}</span>
      <span className="measure__line" />
    </div>
  );
}

/* ---------- Logo / wordmark ---------- */
function Logo({ onClick, compact = false }) {
  return (
    <a href="#home" onClick={onClick} aria-label="Spazio — home"
       style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span aria-hidden="true" style={{
        width: 12, height: 12, borderRadius: "50%",
        background: "var(--accent)",
        boxShadow: "0 0 0 4px var(--accent-soft)",
        flex: "0 0 auto",
      }} />
      <span style={{
        fontFamily: "var(--display)", fontWeight: 600, fontSize: 22,
        letterSpacing: "-0.03em", color: "var(--ink)",
      }}>
        Spazio{compact ? "" : ""}
      </span>
    </a>
  );
}

/* ---------- Navigation ---------- */
const NAV_LINKS = [
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "process", label: "Process" },
];

function Nav() {
  const { route, navigate } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [route]);

  const go = (e, id) => { e.preventDefault(); navigate(id); };

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "color-mix(in oklab, var(--bg) 86%, transparent)" : "transparent",
      backdropFilter: scrolled ? "saturate(1.2) blur(10px)" : "none",
      borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
      transition: "background .4s var(--ease), border-color .4s var(--ease)",
    }}>
      <div className="wrap" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 72,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo onClick={(e) => go(e, "home")} />
          <span className="nav-meta tag" style={{
            display: "none", color: "var(--ink-3)", paddingLeft: 16,
            borderLeft: "1px solid var(--line-2)",
          }}>Digital Design Studio</span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 4 }} className="nav-desktop">
          {NAV_LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={(e) => go(e, l.id)}
               style={{
                 fontSize: 15, fontWeight: 500, padding: "8px 14px", borderRadius: 100,
                 color: route === l.id ? "var(--ink)" : "var(--ink-2)",
                 background: route === l.id ? "var(--surface)" : "transparent",
                 transition: "color .3s var(--ease), background .3s var(--ease)",
               }}
               onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
               onMouseLeave={(e) => (e.currentTarget.style.color = route === l.id ? "var(--ink)" : "var(--ink-2)")}
            >{l.label}</a>
          ))}
          <a href="#subscribe" onClick={(e) => go(e, "subscribe")}
             style={{ fontSize: 15, fontWeight: 500, padding: "8px 14px", borderRadius: 100,
               color: route === "subscribe" ? "var(--ink)" : "var(--ink-2)" }}
          >Subscribe</a>
          <a href="/lead" className="btn btn--primary"
             style={{ marginLeft: 10, padding: "11px 20px" }}>
            Start a project <Arrow />
          </a>
        </nav>

        <button className="nav-burger" aria-label="Menu" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "none", background: "none", border: 0, padding: 8,
            color: "var(--ink)",
          }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {open
              ? <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              : <><path d="M3 8h18M3 16h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>}
          </svg>
        </button>
      </div>

      {/* Mobile sheet */}
      <div className="nav-mobile" style={{
        display: "none",
        maxHeight: open ? 460 : 0,
        overflow: "hidden",
        transition: "max-height .5s var(--ease)",
        borderBottom: open ? "1px solid var(--line)" : "1px solid transparent",
        background: "var(--bg)",
      }}>
        <div className="wrap" style={{ paddingBlock: open ? 16 : 0 }}>
          <ColTicks count={12} style={{ marginBottom: 8, opacity: open ? 1 : 0, transition: "opacity .4s var(--ease)" }} />
          {[...NAV_LINKS, { id: "subscribe", label: "Subscribe" }].map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={(e) => go(e, l.id)}
               style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                 padding: "16px 2px", borderBottom: "1px solid var(--line)",
                 fontSize: 22, fontFamily: "var(--display)", fontWeight: 600,
                 letterSpacing: "-0.02em", color: "var(--ink)" }}>
              {l.label} <Arrow size={16} />
            </a>
          ))}
          <a href="/lead" className="btn btn--primary"
             style={{ width: "100%", justifyContent: "center", marginTop: 18, padding: "15px" }}>
            Start a project <Arrow />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ---------- Marquee ---------- */
function Marquee({ items, sep = "·" }) {
  const row = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", width: "100%", maskImage:
      "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
      <div className="marquee-track" style={{ display: "flex", gap: 0, width: "max-content" }}>
        {row.map((it, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--display)", fontWeight: 600,
              fontSize: "clamp(28px,4vw,52px)", letterSpacing: "-0.03em",
              padding: "0 28px", color: "var(--ink)", whiteSpace: "nowrap" }}>{it}</span>
            <span style={{ color: "var(--accent)", fontSize: 24 }}>{sep}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Footer subscribe (compact) ---------- */
function FooterSubscribe() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);
  const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const submit = (e) => {
    e.preventDefault();
    if (!valid(email)) { setErr(true); return; }
    setErr(false); setDone(true);
  };
  if (done) {
    return (
      <p style={{ color: "var(--accent)", fontSize: 16, margin: 0, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
        You're on the list. Talk soon.
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <p style={{ color: "color-mix(in oklab, var(--bg) 66%, transparent)", margin: "0 0 14px", fontSize: 15, lineHeight: 1.45, maxWidth: "30ch" }}>
        Occasional notes on design, branding, and digital work for founders.
      </p>
      <div style={{ display: "flex", gap: 8, border: `1px solid ${err ? "#E08769" : "color-mix(in oklab, var(--bg) 26%, transparent)"}`,
        borderRadius: 100, padding: 5, background: "color-mix(in oklab, var(--bg) 8%, transparent)" }}>
        <input type="email" value={email} onChange={(e)=>{setEmail(e.target.value); setErr(false);}}
          placeholder="you@company.com" aria-label="Email address"
          style={{ flex: 1, background: "transparent", border: 0, outline: "none",
            color: "var(--bg)", fontFamily: "var(--sans)", fontSize: 15, padding: "8px 14px" }} />
        <button type="submit" className="btn" style={{ background: "var(--accent)", color: "var(--accent-ink)", padding: "9px 16px" }}>
          Subscribe
        </button>
      </div>
    </form>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const { navigate } = useRouter();
  const go = (e, id) => { e.preventDefault(); navigate(id); };
  const year = 2026;
  return (
    <footer className="foot" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="wrap" style={{ paddingBlock: "clamp(56px,8vw,96px)" }}>
        <div className="grid12" style={{ rowGap: 48 }}>
          <div className="col-span-5">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--accent)" }} />
              <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.03em" }}>Spazio</span>
            </div>
            <p style={{ color: "color-mix(in oklab, var(--bg) 66%, transparent)", maxWidth: "34ch",
              fontSize: 18, lineHeight: 1.5, margin: 0 }}>
              A digital design agency for founders and growing brands. <em className="grace" style={{ color: "var(--accent)" }}>Human-led</em>, AI-accelerated.
            </p>
          </div>

          <div className="col-span-3" style={{ gridColumn: "span 3" }}>
            <p className="label" style={{ color: "color-mix(in oklab, var(--bg) 50%, transparent)", marginBottom: 18 }}>Explore</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {[["work","Work"],["services","Services"],["process","Process"]].map(([id,l]) => (
                <li key={id}><a href={`#${id}`} onClick={(e)=>go(e,id)}
                  style={{ color: "color-mix(in oklab, var(--bg) 80%, transparent)", fontSize: 16, transition: "color .3s" }}>{l}</a></li>
              ))}
              <li><a href="/lead"
                style={{ color: "color-mix(in oklab, var(--bg) 80%, transparent)", fontSize: 16, transition: "color .3s" }}>Start a project</a></li>
            </ul>
          </div>

          <div className="col-span-4" style={{ gridColumn: "span 4" }}>
            <p className="label" style={{ color: "color-mix(in oklab, var(--bg) 50%, transparent)", marginBottom: 18 }}>Stay in the loop</p>
            <FooterSubscribe />
          </div>
        </div>

        <hr style={{ border: 0, height: 1, background: "color-mix(in oklab, var(--bg) 16%, transparent)", margin: "48px 0 22px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between",
          color: "color-mix(in oklab, var(--bg) 50%, transparent)", fontFamily: "var(--mono)", fontSize: 12,
          letterSpacing: "0.04em" }}>
          <span>© {year} Spazio Studio</span>
          <span>Designed in the open · Built for growth</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  RouterCtx, useRouter, ROUTES, useReveal, Reveal, Arrow, ArrowDown,
  CropMarks, ColTicks, Measure,
  Logo, Nav, Marquee, Footer,
});
