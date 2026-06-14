/* ============================================================
   SPAZIO — Creative Brief Generator (multi-step studio)
   A structured creative intake that feeds an automated pipeline:
     payload → Perplexity (research) → OpenAI (3 directions)
             → DALL·E (mockups) → Airtable (memory) → Vision deck
   Output is a single machine-structured object (see buildPayload).
   ============================================================ */

const BRIEF_TYPES   = ["Brand Identity", "Product Concept", "Automotive Design", "Packaging System", "UX / Digital Experience"];
const PERCEPTIONS   = ["Luxury", "Minimal", "Futuristic", "Experimental", "Sustainable", "Heritage-driven"];
const VISUAL_REFS   = ["Automotive", "Architecture", "Fashion", "Product Design", "Art Movements"];
const MATERIALS     = ["Metal", "Glass", "Ceramic", "Carbon Fiber", "Textile", "Organic Materials"];
const LIGHTING      = ["Soft ambient", "High contrast studio", "Natural daylight", "Cinematic", "Warm minimal"];
const DIRECTION_COUNTS = [2, 3, 4];

const BRIEF_STEPS = [
  { key: "foundation", title: "Foundation",       rail: "Project · industry · goal" },
  { key: "direction",  title: "Direction",        rail: "Perception · emotion" },
  { key: "visual",     title: "Visual language",  rail: "References · material · light" },
  { key: "output",     title: "Output",           rail: "Directions · boldness" },
  { key: "context",    title: "Context",          rail: "Optional references" },
];

const boldnessLabel = (v) => (v < 34 ? "Conservative" : v < 67 ? "Balanced" : "Experimental");

const BRIEF_BLANK = {
  project_type: "",
  industry: "",
  goal: "",
  target_perception: [],
  emotional_outcome: "",
  metaphor: "",
  visual_references: [],
  materials: [],
  lighting: "",
  avoid_list: "",
  direction_count: 3,
  boldness_level: 50,
  competitors: "",
  cultural_inspiration: [],
};

/* The single structured object the automation pipeline consumes */
function buildPayload(f) {
  return {
    project_type: f.project_type,
    industry: f.industry.trim(),
    goal: f.goal.trim(),
    target_perception: f.target_perception,
    emotional_outcome: f.emotional_outcome.trim(),
    metaphor: f.metaphor.trim(),
    visual_references: f.visual_references,
    materials: f.materials,
    lighting: f.lighting,
    avoid_list: f.avoid_list.trim(),
    direction_count: f.direction_count,
    boldness_level: boldnessLabel(f.boldness_level),
    competitors: f.competitors.trim(),
    cultural_inspiration: f.cultural_inspiration,
  };
}

/* ---------------- small field atoms ---------------- */

function ChipSet({ options, selected, onToggle, multi = true }) {
  const isOn = (o) => (multi ? selected.includes(o) : selected === o);
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className="chip chip--lg"
          aria-pressed={isOn(o)} onClick={() => onToggle(o)}>{o}</button>
      ))}
    </div>
  );
}

function Question({ q, help, required, children }) {
  return (
    <div className="field" style={{ gap: 14 }}>
      <div>
        <p className="bq">{q}{required && <span className="breq"> *</span>}</p>
        {help && <span className="bhelp">{help}</span>}
      </div>
      {children}
    </div>
  );
}

/* tag input — comma / enter to add (cultural inspiration) */
function TagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const addValue = (raw) => {
    const v = (raw || "").trim();
    if (!v || tags.includes(v)) { setDraft(""); return; }
    onChange([...tags, v]); setDraft("");
  };
  return (
    <div>
      <input className="input" value={draft} placeholder={placeholder}
        onChange={(e) => { const v = e.target.value; if (v.includes(",")) { addValue(v.replace(/,/g, "")); } else setDraft(v); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(draft); } if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1)); }}
        onBlur={() => addValue(draft)} />
      {tags.length > 0 && (
        <div className="chips" style={{ marginTop: 12 }}>
          {tags.map((t, i) => (
            <span key={i} className="chip" style={{ background: "var(--surface-2)", color: "var(--ink-2)", display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((_, x) => x !== i))}
                style={{ border: "none", background: "none", color: "var(--ink-3)", padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* boldness slider — custom, pointer + keyboard */
function BoldnessSlider({ value, onChange }) {
  const trackRef = useRef(null);
  const fromX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    let p = (clientX - r.left) / r.width;
    onChange(Math.max(0, Math.min(100, Math.round(p * 100))));
  };
  const onDown = (e) => {
    e.preventDefault();
    fromX(e.clientX);
    const move = (ev) => fromX(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(0, value - 2)); }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(100, value + 2)); }
  };
  const label = boldnessLabel(value);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <span className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--accent-deep)" }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-3)", textTransform: "uppercase" }}>{value} / 100</span>
      </div>
      <div ref={trackRef} className="bold-track" onPointerDown={onDown}>
        <div className="bold-fill" style={{ width: `${value}%` }} />
        {[50].map((t) => <span key={t} className="bold-tick" style={{ left: `${t}%` }} />)}
        <div className="bold-thumb" style={{ left: `${value}%` }}
          role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={label}
          onKeyDown={onKey} onPointerDown={(e) => e.stopPropagation()} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        {["Conservative", "Balanced", "Experimental"].map((s) => (
          <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase",
            color: s === label ? "var(--accent-deep)" : "var(--ink-4)", transition: "color .3s var(--ease)" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- step rail ---------------- */
function StepRail({ step, maxReached, onJump }) {
  return (
    <div className="brail" style={{ borderRight: "1px solid var(--line)", paddingRight: 28 }}>
      <div className="brail-head" style={{ marginBottom: 26 }}>
        <span className="tag tag-dot tag--accent">Creative brief</span>
        <p className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.02, marginTop: 16 }}>
          Define your <em className="grace">vision</em>.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)", marginTop: 12, maxWidth: "26ch" }}>
          A structured intake that briefs our creative intelligence — and a designer who shapes every direction.
        </p>
      </div>
      <div className="brail-list">
        {BRIEF_STEPS.map((s, i) => {
          const state = i === step ? "active" : i < step ? "done" : "todo";
          const reachable = i <= maxReached;
          return (
            <button type="button" key={s.key} className="brail-step" data-state={state}
              disabled={!reachable} onClick={() => reachable && onJump(i)}>
              <span className="brail-num" aria-hidden="true">
                {i < step
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="brail-ttl" style={{ display: "block" }}>{s.title}</span>
                <span className="brail-sub" style={{ display: "block" }}>{s.rail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- step bodies ---------------- */
function StepBody({ step, f, set, toggle, errors }) {
  const err = (k) => errors[k] && <span className="err-msg" style={{ marginTop: 2 }}>{errors[k]}</span>;

  if (step === 0) return (
    <div className="stack-lg" style={{ display: "grid", gap: 38 }}>
      <Question q="What are we shaping?" help="Select one" required>
        <ChipSet options={BRIEF_TYPES} selected={f.project_type} multi={false}
          onToggle={(o) => set("project_type", f.project_type === o ? "" : o)} />
        {err("project_type")}
      </Question>
      <Question q="What world does it live in?" help="Industry or category">
        <input className="input" value={f.industry} placeholder="Automotive · Hospitality · Fashion…"
          onChange={(e) => set("industry", e.target.value)} />
      </Question>
      <Question q="What should this set out to do?" help="The goal, in your words" required>
        <textarea className={`textarea ${errors.goal ? "err" : ""}`} value={f.goal}
          placeholder="Reposition the brand as premium luxury."
          onChange={(e) => set("goal", e.target.value)} />
        {err("goal")}
      </Question>
    </div>
  );

  if (step === 1) return (
    <div style={{ display: "grid", gap: 38 }}>
      <Question q="How should it be perceived?" help="Select all that resonate" required>
        <ChipSet options={PERCEPTIONS} selected={f.target_perception}
          onToggle={(o) => toggle("target_perception", o)} />
        {err("target_perception")}
      </Question>
      <Question q="We want people to feel…" help="The emotional outcome">
        <input className="input" value={f.emotional_outcome} placeholder="Quietly certain they're holding something rare."
          onChange={(e) => set("emotional_outcome", e.target.value)} />
      </Question>
      <Question q="If this brand were a person, it would be…" help="A guiding metaphor">
        <input className="input" value={f.metaphor} placeholder="A composed, well-travelled architect."
          onChange={(e) => set("metaphor", e.target.value)} />
      </Question>
    </div>
  );

  if (step === 2) return (
    <div style={{ display: "grid", gap: 38 }}>
      <Question q="Where do we draw the visual language from?" help="Reference worlds — select all">
        <ChipSet options={VISUAL_REFS} selected={f.visual_references}
          onToggle={(o) => toggle("visual_references", o)} />
      </Question>
      <Question q="What is it made of?" help="Material language — select all">
        <ChipSet options={MATERIALS} selected={f.materials}
          onToggle={(o) => toggle("materials", o)} />
      </Question>
      <Question q="How is it lit?" help="Lighting & atmosphere — select one">
        <ChipSet options={LIGHTING} selected={f.lighting} multi={false}
          onToggle={(o) => set("lighting", f.lighting === o ? "" : o)} />
      </Question>
      <Question q="What should we steer clear of?" help="The avoid list">
        <input className="input" value={f.avoid_list} placeholder="No neon, no cyberpunk, no aggressive forms."
          onChange={(e) => set("avoid_list", e.target.value)} />
      </Question>
    </div>
  );

  if (step === 3) return (
    <div style={{ display: "grid", gap: 48 }}>
      <Question q="How many directions should we explore?" help="Distinct creative territories">
        <div className="seg" role="group" aria-label="Number of creative directions">
          {DIRECTION_COUNTS.map((n) => (
            <button type="button" key={n} aria-pressed={f.direction_count === n}
              onClick={() => set("direction_count", n)}>{n}</button>
          ))}
        </div>
      </Question>
      <Question q="How far should we push?" help="Boldness of the territories">
        <div style={{ maxWidth: 460 }}>
          <BoldnessSlider value={f.boldness_level} onChange={(v) => set("boldness_level", v)} />
        </div>
      </Question>
    </div>
  );

  if (step === 4) return (
    <div style={{ display: "grid", gap: 38 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="tag" style={{ color: "var(--ink-3)" }}>Optional</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.04em" }}>
          Sharpens the brief — skip anything that doesn't apply
        </span>
      </div>
      <Question q="Who sets the bar?" help="Competitors or references">
        <input className="input" value={f.competitors} placeholder="Aesop, Zenvo, Teenage Engineering…"
          onChange={(e) => set("competitors", e.target.value)} />
      </Question>
      <Question q="Any cultural touchstones?" help="Cultural inspiration — press enter to add">
        <TagInput tags={f.cultural_inspiration} onChange={(v) => set("cultural_inspiration", v)}
          placeholder="Brutalist architecture, Japanese joinery…" />
      </Question>
    </div>
  );

  return null;
}

/* ---------------- the studio ---------------- */
function BriefStudio() {
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [f, setF] = useState(BRIEF_BLANK);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [reportId, setReportId] = useState(null);
  const topRef = useRef(null);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); };
  const toggle = (k, o) => { setF((s) => ({ ...s, [k]: s[k].includes(o) ? s[k].filter((x) => x !== o) : [...s[k], o] })); setErrors((e) => ({ ...e, [k]: null })); };

  const validateStep = (i) => {
    const e = {};
    if (i === 0) {
      if (!f.project_type) e.project_type = "Pick what we're shaping";
      if (f.goal.trim().length < 6) e.goal = "A sentence on the goal helps a lot";
    }
    if (i === 1) {
      if (!f.target_perception.length) e.target_perception = "Pick at least one";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToTop = () => requestAnimationFrame(() => {
    if (topRef.current) {
      const y = topRef.current.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });

  const next = () => {
    if (!validateStep(step)) return;
    if (step < BRIEF_STEPS.length - 1) {
      const n = step + 1;
      setStep(n); setMaxReached((m) => Math.max(m, n)); goToTop();
    } else {
      submit();
    }
  };
  const back = () => { if (step > 0) { setStep(step - 1); goToTop(); } };
  const jump = (i) => { if (i <= maxReached) { setStep(i); goToTop(); } };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const payload = buildPayload(f);
    const leadId = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("spazio_lead_id")) || null;

    const answers = {
      shaping:       { project_type: payload.project_type, industry: payload.industry, goal: payload.goal },
      direction:     { target_perception: payload.target_perception, emotional_outcome: payload.emotional_outcome, metaphor: payload.metaphor },
      visualLanguage:{ visual_references: payload.visual_references, materials: payload.materials, lighting: payload.lighting, avoid_list: payload.avoid_list },
      output:        { direction_count: payload.direction_count, boldness_level: payload.boldness_level },
      context:       { competitors: payload.competitors, cultural_inspiration: payload.cultural_inspiration },
    };

    try {
      const res = await fetch("/api/foundation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your brief.");
      if (leadId) sessionStorage.removeItem("spazio_lead_id");
      if (data.id) setReportId(data.id);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setDone(true);
    goToTop();
  };

  const reset = () => { setF(BRIEF_BLANK); setErrors({}); setStep(0); setMaxReached(0); setDone(false); goToTop(); };

  if (done) return <span ref={topRef}><BriefQueued f={f} reportId={reportId} onReset={reset} onHome={() => navigate("home")} /></span>;

  const isLast = step === BRIEF_STEPS.length - 1;

  return (
    <div ref={topRef}>
      <div className="frame bstudio-grid" style={{ position: "relative", background: "var(--surface)",
        display: "grid", gridTemplateColumns: "300px 1fr", padding: "clamp(24px,3.4vw,44px)", gap: "clamp(28px,3.2vw,52px)" }}>
        <CropMarks color="var(--accent)" />
        <StepRail step={step} maxReached={maxReached} onJump={jump} />

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* step header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
            paddingBottom: 22, marginBottom: "clamp(28px,3vw,40px)", borderBottom: "1px solid var(--line)" }}>
            <span className="tag tag--accent" style={{ letterSpacing: "0.14em" }}>
              Step {String(step + 1).padStart(2, "0")} <span style={{ color: "var(--ink-4)" }}>/ {String(BRIEF_STEPS.length).padStart(2, "0")}</span>
            </span>
            <span className="tag" style={{ color: "var(--ink-3)" }}>{BRIEF_STEPS[step].title}</span>
          </div>

          {/* animated body */}
          <div key={step} className="bstep" style={{ flex: 1 }}>
            <StepBody step={step} f={f} set={set} toggle={toggle} errors={errors} />
          </div>

          {/* nav */}
          <div style={{ marginTop: "clamp(34px,4vw,52px)", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            {submitError && (
              <div style={{ marginBottom: 16, padding: "11px 14px", background: "#FFF0EE", border: "1px solid #C0492E", borderRadius: 4,
                fontFamily: "var(--mono)", fontSize: 12, color: "#B0432B", letterSpacing: "0.03em" }}>
                {submitError}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <button type="button" className="btn btn--ghost" onClick={back}
                style={{ padding: "13px 22px", visibility: step === 0 ? "hidden" : "visible" }}>
                <svg className="arr" width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: "scaleX(-1)" }}><path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {step === 4 && (
                  <button type="button" className="txtlink" onClick={next} disabled={submitting}
                    style={{ border: 0, background: "none", opacity: submitting ? 0.5 : 1 }}>
                    Skip — queue brief
                  </button>
                )}
                <button type="button" className="btn btn--primary" onClick={next} disabled={submitting}
                  style={{ padding: "14px 28px", opacity: submitting ? 0.7 : 1 }}>
                  {isLast && submitting ? "Saving…" : isLast ? "Queue my brief" : "Continue"} {!submitting && <Arrow />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- confirmation: brief queued ---------------- */
const PIPELINE = [
  ["Research", "Market + trend signals"],
  ["Directions", "Creative territories"],
  ["Visual mockups", "AI-rendered per direction"],
  ["Vision deck", "Client-ready, reviewed"],
];

function SummaryRow({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 0.3fr) 1fr", gap: "clamp(16px,3vw,40px)", alignItems: "baseline",
      paddingBlock: 18, borderTop: "1px solid var(--line)" }}>
      <span className="bhelp" style={{ paddingTop: 3 }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}
function FlatChips({ items }) {
  if (!items || !items.length) return <span style={{ color: "var(--ink-4)" }}>—</span>;
  return (
    <div className="chips">
      {items.map((t) => <span key={t} className="chip" style={{ pointerEvents: "none", background: "var(--surface-2)", color: "var(--ink)" }}>{t}</span>)}
    </div>
  );
}
const Val = ({ children, muted }) => (
  <span style={{ fontSize: 16.5, lineHeight: 1.5, color: muted ? "var(--ink-4)" : "var(--ink)" }}>{children || (muted ? "—" : "")}</span>
);

function BriefQueued({ f, reportId, onReset, onHome }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const generateBrief = async () => {
    if (!reportId) { setGenError("No report ID — please re-submit the form."); return; }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Brief generation failed.");
      // Open the HTML brief in a new tab via a blob URL
      const blob = new Blob([data.html], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      setGenError(err.message || "Something went wrong. Please try again.");
    }
    setGenerating(false);
  };
  const ref = ((f.industry || f.project_type || "SPZ").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SPZ") + "\u201326";
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(24px,3.5vw,48px)" }}>
      <CropMarks color="var(--accent)" />

      {/* header */}
      <div style={{ paddingBottom: "clamp(24px,3vw,36px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: "clamp(22px,3vw,32px)" }}>
          <span className="tag tag-dot tag--accent">Brief queued</span>
          <span className="tag" style={{ color: "var(--ink-3)" }}>REF {ref}</span>
        </div>
        <h2 className="display" style={{ fontSize: "clamp(32px,4.4vw,60px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 0.98, maxWidth: "16ch" }}>
          Your vision is <em className="grace">in the studio</em>.
        </h2>
        <p className="lede" style={{ marginTop: 18, maxWidth: "46ch" }}>
          We've structured your brief and handed it to our creative intelligence. Research begins now —
          a Spazio designer reviews every direction before it reaches you.
        </p>
      </div>

      {/* pipeline */}
      <div style={{ paddingBlock: "clamp(26px,3.4vw,40px)", borderBottom: "1px solid var(--line)" }}>
        <p className="label label--accent" style={{ marginBottom: 22, letterSpacing: "0.1em" }}>What happens next</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(16px,2.4vw,30px)" }} className="brief-grid">
          {PIPELINE.map(([t, d], i) => (
            <div key={t} className="pipe-stage" data-active={i === 0 ? "true" : "false"}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="pipe-dot" />
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 ? "var(--accent-deep)" : "var(--ink-3)" }}>
                  {i === 0 ? "In progress" : "Queued"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontFamily: "var(--display)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em" }}>{t}</p>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45, color: "var(--ink-3)" }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* captured brief — editorial summary */}
      <div style={{ paddingTop: "clamp(20px,2.6vw,30px)" }}>
        <p className="label label--accent" style={{ marginBottom: 6, letterSpacing: "0.1em" }}>Your brief</p>

        <SummaryRow label="Shaping"><Val>{f.project_type || "—"}</Val></SummaryRow>
        <SummaryRow label="Industry"><Val muted={!f.industry}>{f.industry}</Val></SummaryRow>
        <SummaryRow label="Goal">
          <span style={{ fontSize: "clamp(18px,1.8vw,21px)", lineHeight: 1.4, letterSpacing: "-0.015em", color: "var(--ink)", display: "block", maxWidth: "44ch", textWrap: "pretty" }}>{f.goal || "—"}</span>
        </SummaryRow>
        <SummaryRow label="Perception"><FlatChips items={f.target_perception} /></SummaryRow>
        {f.emotional_outcome && <SummaryRow label="Feeling"><Val>{f.emotional_outcome}</Val></SummaryRow>}
        {f.metaphor && <SummaryRow label="Metaphor"><Val>{f.metaphor}</Val></SummaryRow>}
        <SummaryRow label="References"><FlatChips items={f.visual_references} /></SummaryRow>
        <SummaryRow label="Material"><FlatChips items={f.materials} /></SummaryRow>
        <SummaryRow label="Lighting"><Val muted={!f.lighting}>{f.lighting}</Val></SummaryRow>
        {f.avoid_list && <SummaryRow label="Avoid"><Val>{f.avoid_list}</Val></SummaryRow>}
        <SummaryRow label="Output">
          <Val>{f.direction_count} directions · <span style={{ color: "var(--accent-deep)" }}>{boldnessLabel(f.boldness_level)}</span></Val>
        </SummaryRow>
        {f.competitors && <SummaryRow label="Benchmarks"><Val>{f.competitors}</Val></SummaryRow>}
        {f.cultural_inspiration.length > 0 && <SummaryRow label="Culture"><FlatChips items={f.cultural_inspiration} /></SummaryRow>}
      </div>

      {/* human-led note */}
      <div style={{ marginTop: "clamp(26px,3.4vw,38px)", padding: "16px 18px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", borderRadius: 8 }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--accent-deep)" }}>
          <strong style={{ fontWeight: 600 }}>AI expands. Humans decide.</strong> The system generates research-backed
          territories from your brief — every direction is then shaped and approved by a Spazio designer. Generated {today}.
        </p>
      </div>

      {/* actions */}
      <div style={{ marginTop: "clamp(24px,3vw,34px)", paddingTop: "clamp(22px,3vw,30px)", borderTop: "1px solid var(--line)" }}>
        {genError && (
          <div style={{ marginBottom: 16, padding: "11px 14px", background: "#FFF0EE", border: "1px solid #C0492E", borderRadius: 4,
            fontFamily: "var(--mono)", fontSize: 12, color: "#B0432B", letterSpacing: "0.03em" }}>
            {genError}
          </div>
        )}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn--accent" style={{ padding: "14px 26px", opacity: generating ? 0.7 : 1 }}
            onClick={generateBrief} disabled={generating}>
            {generating
              ? <><span className="brief-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", display: "inline-block" }} /> Generating…</>
              : <>Generate brief <Arrow /></>}
          </button>
          <button className="btn btn--ghost" style={{ padding: "14px 22px" }} onClick={onReset}>New brief</button>
          <button className="txtlink" style={{ border: 0, background: "none" }} onClick={onHome}>Back to home</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  BRIEF_TYPES, PERCEPTIONS, VISUAL_REFS, MATERIALS, LIGHTING, BRIEF_STEPS,
  buildPayload, boldnessLabel,
  BriefStudio, BriefQueued, BoldnessSlider, ChipSet, Question, TagInput, StepRail, StepBody,
});
