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
  return (
    <section className="section" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="wrap" style={{ textAlign: "center" }}>
        <Reveal>
          <h2 className="display d2" style={{ margin: "0 auto", maxWidth: "16ch", color: "var(--bg)" }}>
            Ready to close the <em className="grace" style={{ color: "var(--accent)" }}>gap</em>?
          </h2>
          <p className="lede" style={{ margin: "20px auto 0", color: "color-mix(in oklab, var(--bg) 70%, transparent)" }}>
            You built the business. Let’s build the brand it deserves.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 36 }}>
            <a href="https://calendly.com/hi-spaziographics" target="_blank" rel="noopener" className="btn btn--accent" style={{ padding: "15px 28px" }}>
              Start a conversation <Arrow />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= HOME ================= */

/* ---- The Gap ---- */
function HomeGap() {
  return (
    <section className="section band">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 28, alignItems: "start" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 22 }}>The gap</p>
              <h2 className="section-title" style={{ maxWidth: "16ch" }}>
                Your business is ahead of your brand. You can <em className="grace">feel</em> it.
              </h2>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={80}>
              <p className="lede" style={{ marginBottom: 18 }}>
                You’ve built something genuinely good — but the brand around it is a step behind,
                and your users feel it before they can name it. They decide you’re “fine” before
                they ever sign up.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ink-2)", margin: 0, maxWidth: "46ch" }}>
                That gap quietly costs you: interest that doesn’t convert, deals that take longer to
                close, the competitor who simply looked the part winning by default. Closing it is the
                whole job — and it’s the part we love.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Who it's for ---- */
const HOME_AUDIENCE = [
  ["Consumer apps", "Mobile-first products with real users and real ambition."],
  ["B2C SaaS", "Subscription products that live or die on first impressions."],
  ["Platforms & marketplaces", "Two-sided products that have to feel trustworthy fast."],
  ["Founder-led, product-first teams", "You make the calls — and you sweat the details."],
];
function HomeWho() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 20, alignItems: "end", marginBottom: "clamp(36px,5vw,60px)" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 22 }}>Who it’s for</p>
              <h2 className="section-title" style={{ maxWidth: "18ch" }}>
                For founders whose product is ahead of their brand.
              </h2>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={80}>
              <p className="lede" style={{ marginLeft: "auto" }}>
                If you’ve got real traction and a brand that hasn’t caught up to the ambition —
                and you’re about to raise, launch, or scale — this is for you.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="grid12" style={{ rowGap: 0 }}>
          {HOME_AUDIENCE.map(([t, d], i) => (
            <Reveal as="div" key={t} delay={i * 60} className="col-span-6"
              style={{ display: "flex", gap: 16, padding: "22px 0", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent-deep)", paddingTop: 4 }}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>{t}</h3>
                <p style={{ margin: "6px 0 0", fontSize: 15.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- What we do ---- */
const HOME_SERVICES = [
  ["Brand Strategy & Positioning", "The sharp, defensible story of why you win — before a single pixel."],
  ["Visual Identity", "Logo, type, color, and a system built to hold up across product, web, and app store."],
  ["Creative Direction", "One consistent point of view across every surface your users touch."],
  ["Brand & Web", "Messaging and a site that make the product feel inevitable."],
];
function HomeWhatWeDo() {
  return (
    <section className="section band-soft">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 20, alignItems: "end", marginBottom: "clamp(36px,5vw,60px)" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 22 }}>What we do</p>
              <h2 className="section-title" style={{ maxWidth: "16ch" }}>
                Strategy first. Then the identity to <em className="grace">carry</em> it.
              </h2>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={80}>
              <p className="lede" style={{ marginLeft: "auto" }}>
                We start with the thinking and end with a brand system your team can actually run
                with — not a logo and a shrug.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="grid12" style={{ rowGap: 0 }}>
          {HOME_SERVICES.map(([t, d], i) => (
            <Reveal as="div" key={t} delay={i * 60} className="col-span-6"
              style={{ padding: "26px 0", borderTop: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 600, fontSize: "clamp(22px,2vw,28px)", letterSpacing: "-0.02em" }}>{t}</h3>
              <p style={{ margin: "10px 0 0", fontSize: 16, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: "42ch" }}>{d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- The Brand Gap Audit ---- */
const AUDIT_POINTS = [
  "A clear read on exactly where your brand lags your product",
  "How you stack up in your category, and the opening you’re missing",
  "2–3 strategic directions to close the gap",
  "A tight deck, plus a 30-minute walkthrough with us",
];
function HomeAudit() {
  return (
    <section className="section" id="audit" style={{ scrollMarginTop: 80 }}>
      <div className="wrap">
        <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(28px,4vw,56px)" }}>
          <CropMarks color="var(--accent)" />
          <div className="grid12" style={{ rowGap: 32, alignItems: "start" }}>
            <div className="col-span-6">
              <Reveal>
                <p className="label label--accent label-dot" style={{ marginBottom: 22 }}>The Brand Gap Audit</p>
                <h2 className="section-title" style={{ maxWidth: "13ch" }}>
                  Start here. <span style={{ color: "var(--accent-deep)" }}>$750</span>, credited toward your engagement.
                </h2>
                <p className="lede" style={{ marginTop: 20, maxWidth: "42ch" }}>
                  The fastest way to see what’s holding the brand back — and whether we’re a fit.
                  In about five business days, you’ll get:
                </p>
                <div style={{ marginTop: 28 }}>
                  <a href="/api/checkout?tier=brand-gap-audit" className="btn btn--primary" style={{ padding: "15px 28px" }}>
                    Start with a Brand Gap Audit <Arrow />
                  </a>
                </div>
              </Reveal>
            </div>
            <div className="col-span-6">
              <Reveal delay={80}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {AUDIT_POINTS.map((p) => (
                    <li key={p} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "16px 0", borderTop: "1px solid var(--line)", fontSize: 16.5, lineHeight: 1.5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flex: "0 0 auto", transform: "translateY(-2px)" }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ marginTop: 22, fontSize: 15, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: "44ch" }}>
                  If you move into a full engagement, the $750 comes right off the top. So it’s
                  risk-free if you’re serious — and genuinely useful even if the timing’s not right yet.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Why Spazio ---- */
const WHY_POINTS = [
  ["Direct access", "No hand-offs, no telephone game. You talk to the decision-maker."],
  ["Speed you can feel", "Weeks, not quarters — at the same bar."],
  ["Senior-level craft", "The thinking and care of a top studio, applied to your stage — without the layers in between."],
];
function HomeWhy() {
  return (
    <section className="section band">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 36, alignItems: "start" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 24 }}>Why Spazio</p>
              <h2 className="section-title" style={{ maxWidth: "16ch" }}>
                You, talking to the people who actually <em className="grace">do the work</em>.
              </h2>
              <p className="lede" style={{ marginTop: 22, maxWidth: "46ch" }}>
                Spazio brings a senior standard to your stage — without the layers, the lag, or the
                account managers in between. You work directly with us, the people making the
                creative calls, and the work moves at the speed your stage actually needs.
              </p>
              <p style={{ marginTop: 22, fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.04em", color: "var(--ink-3)" }}>
                — The Spazio team
              </p>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={90}>
              <div style={{ display: "grid", gap: 0 }}>
                {WHY_POINTS.map(([t, d]) => (
                  <div key={t} style={{ padding: "18px 0", borderTop: "1px solid var(--line)" }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em" }}>{t}</h3>
                    <p style={{ margin: "6px 0 0", fontSize: 15.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{d}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- How it works ---- */
const HOW_STEPS = [
  ["Brand Gap Audit", "We map the exact gap between how good you are and how good you look."],
  ["Strategy & positioning", "Your story, sharpened into something defensible."],
  ["Identity & system", "The look, built to scale across product and web."],
  ["Handoff", "Assets and guidelines your team can run with right away."],
];
function HomeHow() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="grid12" style={{ rowGap: 20, alignItems: "end", marginBottom: "clamp(36px,5vw,60px)" }}>
          <div className="col-span-7">
            <Reveal>
              <p className="label label--accent label-dot" style={{ marginBottom: 22 }}>How it works</p>
              <h2 className="section-title" style={{ maxWidth: "16ch" }}>
                From audit to identity in <em className="grace">weeks</em>, not quarters.
              </h2>
            </Reveal>
          </div>
          <div className="col-span-5">
            <Reveal delay={80}>
              <p className="lede" style={{ marginLeft: "auto" }}>
                A clear path from first read to a finished system — with you in the room for the
                decisions that matter.
              </p>
            </Reveal>
          </div>
        </div>
        <div className="moves-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(10px,1.4vw,18px)" }}>
          {HOW_STEPS.map(([t, d], i) => (
            <Reveal as="div" key={t} delay={i * 60} style={{
              background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
              padding: "22px 20px 24px", borderTop: "2px solid var(--accent)",
              display: "flex", flexDirection: "column", gap: 10, minHeight: 178 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent-deep)" }}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display" style={{ fontSize: "clamp(19px,1.5vw,23px)", fontWeight: 600, letterSpacing: "-0.02em" }}>{t}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)", flex: 1 }}>{d}</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <p style={{ marginTop: 28, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Engagements run roughly six weeks.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ================= PROCESS — spazioOS ================= */
function ProcessEye({ pupil, scan }) {
  return (
    <svg width="62" height="62" viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block" }}>
      <circle cx="24" cy="24" r="23" fill="var(--ink)" />
      <circle cx="24" cy="24" r="14.5" fill="var(--paper)" />
      <circle cx="24" cy="24" r="6.6" fill={pupil} />
      {scan ? <line x1="24" y1="9.5" x2="24" y2="38.5" stroke="var(--ink)" strokeWidth="1.5" /> : null}
    </svg>
  );
}

function ProcessStep({ n, label, title, body, pupil, scan }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 16, padding: "clamp(22px,2.4vw,30px)", height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <ProcessEye pupil={pupil} scan={scan} />
      <p className="tag" style={{ color: "var(--clay)", marginTop: 22, letterSpacing: "0.14em" }}>{n} / {label}</p>
      <h3 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: "clamp(24px,2.4vw,30px)", letterSpacing: "-0.02em", color: "var(--ink)", margin: "10px 0 12px" }}>{title}</h3>
      <p style={{ fontFamily: "var(--sans)", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink-2)", margin: 0 }}>{body}</p>
    </div>
  );
}

function ProcessArrow() {
  return (
    <span className="oss-arrow" aria-hidden="true"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 26, padding: "0 10px" }}>→</span>
  );
}

function ProcessBlock() {
  return (
    <section className="section--tight">
      <div className="wrap">
        <Reveal>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 26, padding: "clamp(26px,4vw,52px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: "clamp(30px,4.4vw,46px)", letterSpacing: "-0.025em", color: "var(--ink)", lineHeight: 1 }}>
                spazio<em style={{ fontStyle: "italic", color: "var(--accent)" }}>OS</em>
              </span>
              <span className="tag" style={{ color: "var(--clay)", letterSpacing: "0.2em" }}>The system behind the work</span>
            </div>
            <p style={{ fontFamily: "var(--serif)", fontSize: "clamp(19px,1.9vw,24px)", lineHeight: 1.4, color: "var(--ink)", margin: "16px 0 0", maxWidth: "42ch" }}>
              One brain, three moves. Research becomes diagnosis becomes a brand the client can run.
            </p>
            <div className="oss-grid" style={{ marginTop: "clamp(28px,4vw,44px)" }}>
              <Reveal delay={0} style={{ height: "100%" }}>
                <ProcessStep n="01" label="INTELLIGENCE" title="Intelligence" pupil="var(--teal)"
                  body="The research read. Category, competitors, and where the business already outpaces how it looks." />
              </Reveal>
              <ProcessArrow />
              <Reveal delay={100} style={{ height: "100%" }}>
                <ProcessStep n="02" label="AUDIT" title="Audit" pupil="var(--gold)" scan
                  body="The verdict. Scored diagnostics turn the read into a clear gap — named, ranked, defensible." />
              </Reveal>
              <ProcessArrow />
              <Reveal delay={200} style={{ height: "100%" }}>
                <ProcessStep n="03" label="IDENTITY" title="Identity" pupil="var(--coral)"
                  body="The system shipped. A running brand that makes them look like the leader they're becoming." />
              </Reveal>
            </div>
            <div style={{ marginTop: "clamp(26px,4vw,44px)", borderTop: "1px solid var(--line)", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(19px,2vw,24px)", color: "var(--ink)" }}>Close the gap.</span>
              <div style={{ width: 200, maxWidth: "42vw", height: 9, borderRadius: 99, background: "var(--line)", overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
                <span style={{ display: "flex", width: "56%" }}>
                  <i style={{ flex: 6, background: "var(--ink)" }} />
                  <i style={{ flex: 2, background: "var(--coral)" }} />
                  <i style={{ flex: 2, background: "var(--teal)" }} />
                  <i style={{ flex: 2, background: "var(--gold)" }} />
                  <i style={{ flex: 1, background: "var(--clay)" }} />
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <main>
      <Hero />
      <Pattern rows={1} size={140} style={{ borderBlock: "1px solid var(--line)" }} />
      <HomeGap />
      <ProcessBlock />
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
/* ---------- Brand-audit example gallery (Carlos) ---------- */
function CarlosAuditGallery() {
  const foundation = Array.from({ length: 10 }, (_, i) =>
    `/work/carlos/foundation-${String(i + 1).padStart(2, "0")}.jpg`);
  const kit = Array.from({ length: 7 }, (_, i) =>
    `/work/carlos/kit-${String(i + 1).padStart(2, "0")}.jpg`);

  const Group = ({ label, title, note, imgs }) => (
    <div style={{ marginTop: "clamp(34px,5vw,64px)" }}>
      <Reveal>
        <p className="label label--accent label-dot" style={{ marginBottom: 14 }}>{label}</p>
        <h3 className="display d3" style={{ maxWidth: "22ch" }}>{title}</h3>
        <p className="lede" style={{ marginTop: 12, maxWidth: "48ch" }}>{note}</p>
      </Reveal>
      <div style={{
        marginTop: 26, display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "clamp(14px,2vw,24px)",
      }}>
        {imgs.map((src, i) => (
          <Reveal as="figure" key={src} delay={i * 40} className="frame"
            style={{ margin: 0, background: "var(--surface)", overflow: "hidden" }}>
            <CropMarks color="var(--accent)" />
            <img src={src} alt={`${title} — page ${i + 1}`} loading="lazy"
              style={{ width: "100%", height: "auto", display: "block" }} />
          </Reveal>
        ))}
      </div>
    </div>
  );

  return (
    <section className="section--tight">
      <div className="wrap">
        <Reveal>
          <p className="label label--accent label-dot" style={{ marginBottom: 20 }}>Example · Brand audit</p>
          <h2 className="section-title" style={{ maxWidth: "18ch" }}>
            A brand audit, <em className="grace">designed</em> — not generated.
          </h2>
          <p className="lede" style={{ marginTop: 18, maxWidth: "54ch" }}>
            Every page below was built by a human designer. AI helps us move faster through research
            and options, but the diagnosis, the layout, the typography, and the final call are ours.
            This is a real estate brand system, start to finish.
          </p>
        </Reveal>
        <Group
          label="Foundation deck"
          title="Real Estate Brand System — Foundation Deck"
          note="The strategic read: positioning, audience, and the exact gap to close."
          imgs={foundation} />
        <Group
          label="Master kit"
          title="Real Estate Brand System — Master Kit"
          note="The system that comes out of the audit — applied, consistent, and ready to run."
          imgs={kit} />
      </div>
    </section>
  );
}

function WorkPage() {
  const [filter, setFilter] = useState("all");
  const chips = [["all", "All"], ["work", "Work"], ["audit", "Brand audit"]];
  const showWork = filter === "all" || filter === "work";
  const showAudit = filter === "all" || filter === "audit";
  return (
    <main>
      <PageHeader
        label="Selected work" title="Brands we've helped find their space."
        lede="Identity, packaging, naming, and systems work for founders and growing brands. Every project here is led by a human designer — not a template, not a generator. AI widens the field of ideas; the diagnosis, the craft, and the final call are always ours."
      />
      <section className="section--tight" style={{ paddingTop: "clamp(8px,2vw,24px)", paddingBottom: 0 }}>
        <div className="wrap">
          <div className="chips" role="tablist" aria-label="Filter projects">
            {chips.map(([id, label]) => (
              <button key={id} type="button" className="chip" aria-pressed={filter === id}
                onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
        </div>
      </section>
      {showWork && (
        <section className="section--tight" style={{ paddingTop: "clamp(16px,2vw,28px)" }}>
          <div className="wrap">
            <WorkRows />
          </div>
        </section>
      )}
      {showAudit && <CarlosAuditGallery />}
      <CtaBand />
    </main>
  );
}

/* ================= ABOUT ================= */
function AboutPage() {
  const para = { fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)", marginTop: 18 };
  return (
    <main>
      <PageHeader
        label="About"
        title="Creating brands people feel."
        lede="Spazio is a creative studio where strategy, storytelling, and design come together to build brands with depth."
      />
      <section className="section--tight" style={{ paddingTop: "clamp(8px,2vw,24px)" }}>
        <div className="wrap">
          <div className="grid12" style={{ rowGap: 44, alignItems: "start" }}>
            <div className="col-span-7">
              <Reveal>
                <p style={{ fontSize: "clamp(18px,1.7vw,21px)", lineHeight: 1.65, color: "var(--ink)", marginTop: 0, maxWidth: "44ch" }}>
                  Founded by <strong style={{ fontWeight: 600 }}>Christine Montalbano</strong>, a UX and brand designer
                  with experience shaping global experiences and collaborating with founder-led businesses,
                  Spazio was created from a desire to bring humanity back into branding.
                </p>
                <p style={Object.assign({}, para, { maxWidth: "52ch" })}>
                  Backed by a collective of talented creatives, Spazio partners with founders and growing
                  brands to craft distinctive identities, packaging, and digital experiences that capture
                  not only what a brand looks like — but what it stands for.
                </p>
                <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(21px,2.4vw,30px)", lineHeight: 1.35, color: "var(--accent-deep)", marginTop: 36, maxWidth: "24ch" }}>
                  We believe the most memorable brands are built through connection, intention, and a story worth sharing.
                </p>
              </Reveal>
            </div>
            <div className="col-span-5">
              <Reveal delay={100}>
                <figure className="frame" style={{ margin: 0, position: "relative", background: "var(--surface)", overflow: "hidden" }}>
                  <CropMarks color="var(--accent)" />
                  <img src="/about/christine-montalbano.jpg" alt="Christine Montalbano, founder of Spazio, at work in the studio"
                    loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
                </figure>
                <p className="label" style={{ marginTop: 14, color: "var(--ink-3)" }}>Christine Montalbano · Founder</p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
      <CtaBand />
    </main>
  );
}

/* ================= START (intake) ================= */
/* ================= START A PROJECT (public inquiry — Journey 1) ================= */
/* Client-facing lead capture. Submits to /api/lead (Airtable Leads, Source =
   "Start a Project"). Separate from the paid Brand Intelligence Report pipeline. */
function StartProjectForm() {
  const [f, setF] = useState({ name: "", email: "", company: "", website: "", service: "", message: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);
  const set = (k, v) => {
    setF(function (p) { return Object.assign({}, p, { [k]: v }); });
    setErrors(function (e) { return Object.assign({}, e, { [k]: undefined }); });
  };
  const services = (typeof window !== "undefined" && window.SPAZIO_FOUNDATION_OPTIONS && window.SPAZIO_FOUNDATION_OPTIONS.service)
    || ["Brand Identity", "Packaging", "Website", "Digital Product", "Full Package", "UX", "Not Sure"];

  const submit = async () => {
    const e = {};
    if (!f.name.trim()) e.name = "Your name, please.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "A valid email, please.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true); setSubmitError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, email: f.email, company: f.company, website: f.website, service: f.service, message: f.message }),
      });
      if (!res.ok) { const d = await res.json().catch(function () { return {}; }); throw new Error(d.error || "Something went wrong."); }
      setDone(true);
    } catch (err) {
      setSubmitError((err && err.message) || "Could not send. Please try again.");
    } finally { setSubmitting(false); }
  };

  const card = { border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", padding: "clamp(24px,3.4vw,40px)" };

  if (done) {
    return (
      <div style={card}>
        <p className="label label--accent label-dot" style={{ marginBottom: 16 }}>Received</p>
        <h2 className="display d3" style={{ maxWidth: "15ch" }}>Thank you — we've got it.</h2>
        <p className="lede" style={{ marginTop: 14, maxWidth: "40ch" }}>
          A real designer reads every inquiry. We'll get back to you within two business days.
        </p>
      </div>
    );
  }

  return (
    <div style={card}>
      <div className="grid12" style={{ columnGap: 16, rowGap: 0 }}>
        <div className="col-span-6">
          <div className="field" style={{ gap: 6, marginBottom: 16 }}>
            <label>Name <span className="breq">*</span></label>
            <input className={"input" + (errors.name ? " err" : "")} value={f.name}
              onChange={function (e) { set("name", e.target.value); }} placeholder="Your name" />
            {errors.name && <span className="err-msg">{errors.name}</span>}
          </div>
        </div>
        <div className="col-span-6">
          <div className="field" style={{ gap: 6, marginBottom: 16 }}>
            <label>Email <span className="breq">*</span></label>
            <input className={"input" + (errors.email ? " err" : "")} type="email" value={f.email}
              onChange={function (e) { set("email", e.target.value); }} placeholder="you@company.com" />
            {errors.email && <span className="err-msg">{errors.email}</span>}
          </div>
        </div>
        <div className="col-span-6">
          <div className="field" style={{ gap: 6, marginBottom: 16 }}>
            <label>Company <span className="opt">optional</span></label>
            <input className="input" value={f.company}
              onChange={function (e) { set("company", e.target.value); }} placeholder="Company name" />
          </div>
        </div>
        <div className="col-span-6">
          <div className="field" style={{ gap: 6, marginBottom: 16 }}>
            <label>Website <span className="opt">optional</span></label>
            <input className="input" value={f.website}
              onChange={function (e) { set("website", e.target.value); }} placeholder="yoursite.com" />
          </div>
        </div>
      </div>

      <div className="field" style={{ gap: 8, marginBottom: 18 }}>
        <label>What do you need? <span className="opt">optional</span></label>
        <div className="chips">
          {services.map(function (s) {
            return (
              <button key={s} type="button" className="chip" aria-pressed={f.service === s}
                onClick={function () { set("service", f.service === s ? "" : s); }}>{s}</button>
            );
          })}
        </div>
      </div>

      <div className="field" style={{ gap: 6, marginBottom: 20 }}>
        <label>Tell us about your project <span className="opt">optional</span></label>
        <textarea className="textarea" value={f.message} onChange={function (e) { set("message", e.target.value); }}
          placeholder="Where you are, what you're building, and what you're hoping to fix." style={{ minHeight: 120 }} />
      </div>

      {submitError && <p className="err-msg" style={{ marginBottom: 14 }}>{submitError}</p>}

      <button type="button" className="btn btn--primary" onClick={submit} disabled={submitting}
        style={{ padding: "15px 26px", opacity: submitting ? 0.7 : 1 }}>
        {submitting ? "Sending…" : "Send inquiry"} <Arrow />
      </button>
    </div>
  );
}

function StartProjectPage() {
  return (
    <main>
      <section className="section--tight" style={{ paddingTop: "clamp(40px,6vw,88px)", paddingBottom: "clamp(56px,8vw,108px)" }}>
        <div className="wrap">
          <div className="grid12" style={{ rowGap: 44, alignItems: "start" }}>
            <div className="col-span-6">
              <Reveal>
                <p className="label label--accent label-dot" style={{ marginBottom: 22 }}>Start a project</p>
                <h1 className="display d2" style={{ maxWidth: "14ch" }}>
                  Let's build the brand your business has <em className="grace">earned</em>.
                </h1>
                <p className="lede" style={{ marginTop: 24, maxWidth: "42ch" }}>
                  Tell us where you are and what you need. We read every inquiry ourselves and reply
                  within two business days — a real conversation, not a funnel.
                </p>
                <div style={{ marginTop: 34, display: "grid", gap: 0, maxWidth: 400 }}>
                  {[["Human-led", "A designer reads and replies — every time."],
                    ["No obligation", "A conversation first; scope and pricing come after."],
                    ["Fast", "We reply within two business days."]].map(function (row) {
                    return (
                      <div key={row[0]} style={{ display: "flex", gap: 12, alignItems: "baseline", borderTop: "1px solid var(--line)", paddingBlock: 14 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flex: "0 0 auto", transform: "translateY(-1px)" }} />
                        <span style={{ fontSize: 15 }}><strong style={{ fontWeight: 600 }}>{row[0]}.</strong> <span className="muted">{row[1]}</span></span>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            </div>
            <div className="col-span-6">
              <Reveal delay={100}><StartProjectForm /></Reveal>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StartPage() {
  return (
    <main>
      <section style={{ paddingTop: "clamp(40px,6vw,84px)", paddingBottom: "clamp(56px,8vw,108px)" }}>
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
  HomeGap, HomeWho, HomeWhatWeDo, HomeAudit, HomeWhy, HomeHow,
  HomePage, AboutPage, ServicesPage,
  ProcessEye, ProcessStep, ProcessArrow, ProcessBlock,
  OSMotif, OSRoleTag, OSStage, OSFlow, ProcessHero, DesignOS, ProcessRibbon, ProcessQuote, ProcessSummary, ProcessPage,
  CarlosAuditGallery, WorkPage, StartProjectForm, StartProjectPage, StartPage, SubscribePage,
});
