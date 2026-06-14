/* ============================================================
   SPAZIO — Pages
   ============================================================ */

/* ---------- Reusable inner-page header ---------- */
function PageHeader({ label, title, lede, children }) {
  return (
    <section style={{ paddingTop: "clamp(48px,7vw,104px)", paddingBottom: "clamp(28px,3vw,40px)" }}>
      <div className="wrap">
        <Reveal>
          <p className="label label--accent label-dot" style={{ marginBottom: 26 }}>{label}</p>
        </Reveal>
        <div className="grid12" style={{ rowGap: 28, alignItems: "end" }}>
          <div className="col-span-7">
            <Reveal delay={60}>
              <h1 className="display d2" style={{ maxWidth: "16ch" }}>{title}</h1>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={120}>
              {lede && <p className="lede" style={{ marginLeft: "auto" }}>{lede}</p>}
              {children}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Embedded intake (home) ---------- */
function IntakeSection() {
  return (
    <section className="section band" id="start-section">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 36, alignItems: "start" }}>
          <div className="col-span-5">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 24 }}>Start</p>
              <h2 className="section-title" style={{ maxWidth: "12ch" }}>
                Tell us what you're <em className="grace">building</em>.
              </h2>
              <p className="lede" style={{ marginTop: 22 }}>
                A short brief is all we need to begin. Founders and brands start here —
                it takes about two minutes.
              </p>
              <div style={{ marginTop: 30, display: "grid", gap: 14 }}>
                {[
                  ["A human reads every word", "No bots, no sales funnel."],
                  ["Reply within 2 business days", "With honest next steps."],
                  ["Automation-ready", "Routes straight into our workflow."],
                ].map(([t, d]) => (
                  <div key={t} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flex: "0 0 auto", transform: "translateY(-2px)" }} />
                    <p style={{ margin: 0, fontSize: 15.5 }}><strong style={{ fontWeight: 600 }}>{t}.</strong> <span className="muted">{d}</span></p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <div className="col-span-7">
            <Reveal delay={100}><IntakeForm /></Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Subscribe band (home + reused) ---------- */
function SubscribeSection() {
  return (
    <section className="section--tight band-soft">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 28, alignItems: "center", paddingBlock: "clamp(20px,3vw,40px)" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 20 }}>Subscribe</p>
              <h2 className="display d3" style={{ fontWeight: 600, maxWidth: "20ch" }}>
                Occasional notes on design, branding, and digital work for founders.
              </h2>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={90}>
              <SubscribeForm variant="page" />
              <p style={{ marginTop: 14, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", letterSpacing: "0.03em" }}>
                No spam. Unsubscribe anytime.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA band ---------- */
function CtaBand() {
  const { navigate } = useRouter();
  const { openLead } = useLeadModal();
  return (
    <section className="section" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="wrap" style={{ textAlign: "center" }}>
        <Reveal>
          <p className="display d2" style={{ margin: "0 auto", maxWidth: "16ch", color: "var(--bg)" }}>
            Let's design the space your brand <em className="grace" style={{ color: "var(--accent)" }}>grows into</em>.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 36 }}>
            <button className="btn btn--accent" style={{ padding: "15px 28px" }} onClick={() => openLead()}>
              Start a project <Arrow />
            </button>
            <button className="btn btn--ghost" style={{ padding: "15px 28px", color: "var(--bg)", borderColor: "color-mix(in oklab, var(--bg) 30%, transparent)" }}
              onClick={() => navigate("work")}>
              See our work
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= HOME ================= */
function HomePage() {
  return (
    <main>
      <Hero />
    </main>
  );
}

/* ================= SERVICES ================= */
function ServicesPage() {
  return (
    <main>
      <PageHeader
        label="Services" title="Design that earns its place."
        lede="Outcome-focused work across brand, product, and marketing — built as systems your team can grow with. AI accelerates our process; humans lead the craft."
      />
      <section className="section--tight">
        <div className="wrap">
          <div style={{ borderBottom: "1px solid var(--line)" }}>
            <ColTicks count={12} />
            {SERVICES_DATA.map((s) => <ServiceRow key={s.n} s={s} expanded />)}
          </div>
        </div>
      </section>
      <CtaBand />
    </main>
  );
}

/* ================= PROCESS · HOW WE WORK (visual system) ================= */

const OS_STAGES = [
  {
    n: "01", key: "Expand", role: "AI-assisted", motif: "expand",
    verb: "Generate breadth",
    desc: "AI opens up directions, references, and rough concepts fast — so we start from many possibilities, not one guess.",
  },
  {
    n: "02", key: "Define", role: "Human-led", motif: "define",
    verb: "Decide what's right",
    desc: "A designer applies taste, intent, and judgment to narrow the field to the one direction worth building.",
  },
  {
    n: "03", key: "Craft", role: "Human-led", motif: "craft",
    verb: "Execute the output",
    desc: "We build the chosen direction by hand into a finished, scalable system — the part that can't be automated.",
  },
];

function OSMotif({ kind }) {
  if (kind === "expand") {
    const dots = [0.5,1,0.7,0.55,0.85,0.5,0.7,0.55, 0.6,0.7,0.5,1,0.6,0.85,0.5,0.65, 0.75,0.55,0.85,0.5,0.65,0.6,1,0.55];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 9, width: "100%", maxWidth: 168 }} aria-hidden="true">
        {dots.map((o, i) => (
          <span key={i} style={{ width: 8, height: 8, borderRadius: "50%",
            background: o === 1 ? "var(--accent)" : "var(--ink)", opacity: o === 1 ? 1 : o * 0.4 }} />
        ))}
      </div>
    );
  }
  if (kind === "define") {
    const bars = [12, 20, 15, 24, 44, 17, 13, 21];
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 48 }} aria-hidden="true">
        {bars.map((h, i) => (
          <span key={i} style={{ width: 8, height: h, borderRadius: 3,
            background: i === 4 ? "var(--accent)" : "var(--ink)", opacity: i === 4 ? 1 : 0.2 }} />
        ))}
      </div>
    );
  }
  // craft — an assembled system grid
  const on = [0, 1, 2, 4, 6, 7, 8];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, width: 54 }} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{ aspectRatio: "1", borderRadius: 4, background: "var(--accent)", opacity: on.includes(i) ? 1 : 0.22 }} />
      ))}
    </div>
  );
}

function OSRoleTag({ role }) {
  const ai = role === "AI-assisted";
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "5px 11px", borderRadius: 100, whiteSpace: "nowrap",
      color: ai ? "var(--accent-deep)" : "var(--accent-ink)",
      background: ai ? "transparent" : "var(--accent)",
      border: ai ? "1px solid var(--accent-line)" : "1px solid var(--accent)",
    }}>{role}</span>
  );
}

function OSStage({ s }) {
  return (
    <article className="os-stage" style={{
      flex: "1 1 0", minWidth: 0, background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "clamp(22px,2.2vw,30px)", display: "flex", flexDirection: "column", gap: 22,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent-deep)" }}>{s.n}</span>
        <OSRoleTag role={s.role} />
      </div>
      <div style={{ minHeight: 56, display: "flex", alignItems: "center" }}><OSMotif kind={s.motif} /></div>
      <div>
        <h3 className="display" style={{ fontSize: "clamp(24px,2.4vw,32px)", fontWeight: 600, letterSpacing: "-0.02em" }}>{s.key}</h3>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--accent-deep)" }}>{s.verb}</p>
        <p style={{ margin: "14px 0 0", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{s.desc}</p>
      </div>
    </article>
  );
}

function OSFlow() {
  return (
    <div className="os-flow" aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: "var(--accent)" }}>
      <svg className="os-flow-h" width="38" height="14" viewBox="0 0 38 14" fill="none">
        <path d="M0 7h33M28 2l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="os-flow-v" width="14" height="30" viewBox="0 0 14 30" fill="none" style={{ display: "none" }}>
        <path d="M7 0v25M2 20l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ProcessHero() {
  return (
    <section style={{ paddingTop: "clamp(56px,8vw,116px)", paddingBottom: "clamp(36px,4vw,56px)" }}>
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 28, alignItems: "end" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 26 }}>Process · How we work</p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="display" style={{ fontSize: "clamp(42px,6.4vw,88px)", fontWeight: 600, letterSpacing: "-0.03em", maxWidth: "14ch" }}>
                An operating system for <em className="grace">design</em>.
              </h1>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={120}>
              <p className="lede" style={{ marginLeft: "auto" }}>
                Three layers, one principle: AI expands what's possible, humans decide what's right,
                and craft turns the decision into something real.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesignOS() {
  return (
    <section className="section--tight" style={{ paddingTop: "clamp(8px,2vw,24px)" }}>
      <div className="wrap">
        <Reveal>
          <div className="os-grid" style={{ display: "flex", alignItems: "stretch", gap: "clamp(8px,1.4vw,18px)" }}>
            <OSStage s={OS_STAGES[0]} />
            <OSFlow />
            <OSStage s={OS_STAGES[1]} />
            <OSFlow />
            <OSStage s={OS_STAGES[2]} />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="os-legend" style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 28, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
            {[["AI-assisted", "Expands ideas and directions", false],
              ["Human-led", "Defines intent and makes the call", true],
              ["Human craft", "Executes the finished output", true]].map(([t, d, fill]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, flex: "0 0 auto",
                  background: fill ? "var(--accent)" : "transparent", border: "1.5px solid var(--accent)" }} />
                <span style={{ fontSize: 14.5, color: "var(--ink-2)" }}>
                  <strong style={{ fontWeight: 600, color: "var(--ink)" }}>{t}.</strong> {d}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const PROCESS_MOVES = [
  ["01", "Understand", "Goals, audience, context", "Human"],
  ["02", "Explore", "Generate many directions", "AI"],
  ["03", "Define", "Choose the right one", "Human"],
  ["04", "Design", "Craft the system by hand", "Human"],
  ["05", "Deliver", "Scalable, ready to run", "Human"],
];

function ProcessRibbon() {
  return (
    <section className="section band">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 18, alignItems: "end", marginBottom: "clamp(32px,4vw,52px)" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 20 }}>The five moves</p>
              <h2 className="section-title" style={{ fontSize: "clamp(28px,3.6vw,48px)" }}>Inside the system.</h2>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={80}>
              <p className="lede" style={{ marginLeft: "auto" }}>
                Every project runs the same loop. Only the <span className="accent-text">Explore</span> move is AI-assisted — the rest are human.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="moves-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "clamp(10px,1.4vw,18px)" }}>
          {PROCESS_MOVES.map(([n, title, micro, kind], i) => {
            const ai = kind === "AI";
            return (
              <Reveal as="div" key={n} delay={i * 60} style={{
                background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
                padding: "20px 18px 22px", borderTop: `2px solid ${ai ? "var(--accent)" : "var(--line-2)"}`,
                display: "flex", flexDirection: "column", gap: 10, minHeight: 168,
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent-deep)" }}>{n}</span>
                <h3 className="display" style={{ fontSize: "clamp(19px,1.5vw,23px)", fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)", flex: 1 }}>{micro}</p>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: ai ? "var(--accent-deep)" : "var(--ink-3)" }}>{ai ? "AI-assisted" : "Human-led"}</span>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProcessQuote() {
  return (
    <section className="section">
      <div className="wrap">
        <Reveal>
          <blockquote style={{ margin: "0 auto", maxWidth: 980, textAlign: "center" }}>
            <p className="display" style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.08 }}>
              AI can generate possibilities, but it cannot determine meaning, taste, or intent.
              <span style={{ color: "var(--accent-deep)" }}> That responsibility stays human.</span>
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

function ProcessSummary() {
  return (
    <section className="section--tight" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="wrap">
        <div className="os-law" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(20px,3vw,48px)", alignItems: "start" }}>
          {[["Expand", "AI expands ideas."],
            ["Define", "Humans interpret meaning."],
            ["Craft", "Craft defines the outcome."]].map(([k, line], i) => (
            <Reveal as="div" key={k} delay={i * 80}>
              <p style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "color-mix(in oklab, var(--bg) 48%, transparent)", marginBottom: 14 }}>0{i + 1} · {k}</p>
              <p className="display" style={{ margin: 0, fontSize: "clamp(22px,2.4vw,32px)", fontWeight: 600, letterSpacing: "-0.02em",
                color: i === 2 ? "var(--accent)" : "var(--bg)" }}>{line}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessPage() {
  return (
    <main>
      <ProcessHero />
      <DesignOS />
      <ProcessRibbon />
      <ProcessQuote />
      <ProcessSummary />
      <CtaBand />
    </main>
  );
}

/* ================= WORK ================= */
function WorkPage() {
  return (
    <main>
      <PageHeader
        label="Selected work" title="Brands we've helped find their space."
        lede="Identity, packaging, naming, and systems work for founders and growing brands. Visuals are placeholders — drop in real project imagery where marked."
      />
      <section className="section--tight" style={{ paddingTop: "clamp(8px,2vw,24px)" }}>
        <div className="wrap">
          <WorkRows />
        </div>
      </section>
      <CtaBand />
    </main>
  );
}

/* ================= START (intake) ================= */
function StartPage() {
  return (
    <main>
      <section id="foundation" style={{ paddingTop: "clamp(40px,6vw,84px)", paddingBottom: "clamp(56px,8vw,108px)", scrollMarginTop: 80 }}>
        <div className="wrap">
          <BriefStudio />
        </div>
      </section>
    </main>
  );
}

/* ================= SUBSCRIBE ================= */
function SubscribePage() {
  return (
    <main>
      <section style={{ minHeight: "62vh", display: "flex", alignItems: "center", paddingTop: "clamp(56px,8vw,96px)", paddingBottom: "clamp(56px,8vw,96px)" }}>
        <div className="wrap" style={{ width: "100%" }}>
          <div style={{ maxWidth: 720 }}>
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 28 }}>Subscribe</p>
              <h1 className="display d2" style={{ maxWidth: "16ch" }}>
                A little signal, <em className="grace">never</em> noise.
              </h1>
              <p className="lede" style={{ marginTop: 24, maxWidth: "46ch" }}>
                Occasional updates on design, branding, and digital work for founders and
                growing brands. One short email when we have something genuinely worth sharing.
              </p>
              <div style={{ marginTop: 36 }}>
                <SubscribeForm variant="page" />
              </div>
              <div style={{ marginTop: 32, display: "flex", gap: 26, flexWrap: "wrap" }}>
                {[["No spam", "Ever."], ["Occasional", "A few times a year."], ["Unsubscribe", "One click."]].map(([t,d]) => (
                  <div key={t} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", transform: "translateY(-2px)" }} />
                    <span style={{ fontSize: 14.5 }}><strong style={{ fontWeight: 600 }}>{t}.</strong> <span className="muted">{d}</span></span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, {
  PageHeader, IntakeSection, SubscribeSection, CtaBand,
  HomePage, ServicesPage,
  OSMotif, OSRoleTag, OSStage, OSFlow, ProcessHero, DesignOS, ProcessRibbon, ProcessQuote, ProcessSummary, ProcessPage,
  WorkPage, StartPage, SubscribePage,
});
