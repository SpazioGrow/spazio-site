/* ============================================================
   SPAZIO — Foundation Form (6-page stepper)
   Page 0: lead capture (name/email/company/service/website)
   Pages 1–5: creative brief questionnaire
   On submit: POST /api/foundation → stores reportId, calls onSuccess()
   ============================================================ */

const SERVICES = ["Brand Identity", "Product Concept", "Automotive Design", "Packaging System", "UX / Digital Experience"];

const FF_STEPS = [
  { key: "you",          title: "About you",      rail: "Name · company · goal" },
  { key: "shaping",      title: "Shaping",        rail: "Project · industry · goal" },
  { key: "direction",    title: "Direction",      rail: "Perception · emotion" },
  { key: "visual",       title: "Visual language",rail: "References · material · light" },
  { key: "output",       title: "Output",         rail: "Directions · boldness" },
  { key: "context",      title: "Context",        rail: "Optional references" },
];

const FF_BLANK = {
  /* lead */
  name: "", email: "", company: "", service: "", website: "",
  /* questionnaire */
  project_type: "", industry: "", goal: "",
  target_perception: [], emotional_outcome: "", metaphor: "",
  visual_references: [], materials: [], lighting: "", avoid_list: "",
  direction_count: 3, boldness_level: 50,
  competitors: "", cultural_inspiration: [],
};

/* ---- re-used atoms (declared in brief-generator scope too; we guard) ---- */

function FFChipSet({ options, selected, onToggle, multi = true }) {
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

function FFQuestion({ q, help, required, children }) {
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

function FFTagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = (raw) => {
    const v = (raw || "").trim();
    if (!v || tags.includes(v)) { setDraft(""); return; }
    onChange([...tags, v]); setDraft("");
  };
  return (
    <div>
      <input className="input" value={draft} placeholder={placeholder}
        onChange={(e) => { const v = e.target.value; if (v.includes(",")) { add(v.replace(/,/g, "")); } else setDraft(v); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1)); }}
        onBlur={() => add(draft)} />
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

function FFBoldnessSlider({ value, onChange }) {
  const trackRef = useRef(null);
  const label = value < 34 ? "Conservative" : value < 67 ? "Balanced" : "Experimental";
  const fromX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    onChange(Math.max(0, Math.min(100, Math.round(((clientX - r.left) / r.width) * 100))));
  };
  const onDown = (e) => {
    e.preventDefault(); fromX(e.clientX);
    const mv = (ev) => fromX(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(0, value - 2)); }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(100, value + 2)); }
  };
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

/* ---- step rail ---- */
function FFStepRail({ step, maxReached, onJump }) {
  return (
    <div className="brail" style={{ borderRight: "1px solid var(--line)", paddingRight: 28 }}>
      <div className="brail-head" style={{ marginBottom: 26 }}>
        <span className="tag tag-dot tag--accent">Foundation brief</span>
        <p className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.02, marginTop: 16 }}>
          Define your <em className="grace">vision</em>.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)", marginTop: 12, maxWidth: "26ch" }}>
          A structured intake that briefs our creative intelligence — shaped by a designer.
        </p>
      </div>
      <div className="brail-list">
        {FF_STEPS.map((s, i) => {
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

/* ---- step bodies ---- */
const PERCEPTIONS_FF = ["Luxury", "Minimal", "Futuristic", "Experimental", "Sustainable", "Heritage-driven"];
const VISUAL_REFS_FF = ["Automotive", "Architecture", "Fashion", "Product Design", "Art Movements"];
const MATERIALS_FF   = ["Metal", "Glass", "Ceramic", "Carbon Fiber", "Textile", "Organic Materials"];
const LIGHTING_FF    = ["Soft ambient", "High contrast studio", "Natural daylight", "Cinematic", "Warm minimal"];

function FFStepBody({ step, f, set, toggle, errors }) {
  const err = (k) => errors[k] && <span className="err-msg" style={{ marginTop: 2 }}>{errors[k]}</span>;

  /* Step 0 — lead capture */
  if (step === 0) return (
    <div style={{ display: "grid", gap: 28 }}>
      <FFQuestion q="Your name" required>
        <input className={`input ${errors.name ? "err" : ""}`} value={f.name} placeholder="Alex Chen"
          onChange={(e) => set("name", e.target.value)} autoFocus />
        {err("name")}
      </FFQuestion>
      <FFQuestion q="Work email" required>
        <input className={`input ${errors.email ? "err" : ""}`} value={f.email} placeholder="alex@brand.com"
          type="email" onChange={(e) => set("email", e.target.value)} />
        {err("email")}
      </FFQuestion>
      <FFQuestion q="Company / brand name">
        <input className="input" value={f.company} placeholder="Brand Co."
          onChange={(e) => set("company", e.target.value)} />
      </FFQuestion>
      <FFQuestion q="What are you primarily interested in?" help="Select one">
        <FFChipSet options={SERVICES} selected={f.service} multi={false}
          onToggle={(o) => set("service", f.service === o ? "" : o)} />
      </FFQuestion>
      <FFQuestion q="Website" help="Optional">
        <input className="input" value={f.website} placeholder="https://brand.com"
          type="url" onChange={(e) => set("website", e.target.value)} />
      </FFQuestion>
    </div>
  );

  /* Step 1 — shaping */
  if (step === 1) return (
    <div style={{ display: "grid", gap: 38 }}>
      <FFQuestion q="What are we shaping?" help="Select one" required>
        <FFChipSet options={SERVICES} selected={f.project_type} multi={false}
          onToggle={(o) => set("project_type", f.project_type === o ? "" : o)} />
        {err("project_type")}
      </FFQuestion>
      <FFQuestion q="What world does it live in?" help="Industry or category">
        <input className="input" value={f.industry} placeholder="Automotive · Hospitality · Fashion…"
          onChange={(e) => set("industry", e.target.value)} />
      </FFQuestion>
      <FFQuestion q="What should this set out to do?" help="The goal, in your words" required>
        <textarea className={`textarea ${errors.goal ? "err" : ""}`} value={f.goal}
          placeholder="Reposition the brand as premium luxury."
          onChange={(e) => set("goal", e.target.value)} />
        {err("goal")}
      </FFQuestion>
    </div>
  );

  /* Step 2 — direction */
  if (step === 2) return (
    <div style={{ display: "grid", gap: 38 }}>
      <FFQuestion q="How should it be perceived?" help="Select all that resonate" required>
        <FFChipSet options={PERCEPTIONS_FF} selected={f.target_perception}
          onToggle={(o) => toggle("target_perception", o)} />
        {err("target_perception")}
      </FFQuestion>
      <FFQuestion q="We want people to feel…" help="The emotional outcome">
        <input className="input" value={f.emotional_outcome} placeholder="Quietly certain they're holding something rare."
          onChange={(e) => set("emotional_outcome", e.target.value)} />
      </FFQuestion>
      <FFQuestion q="If this brand were a person, it would be…" help="A guiding metaphor">
        <input className="input" value={f.metaphor} placeholder="A composed, well-travelled architect."
          onChange={(e) => set("metaphor", e.target.value)} />
      </FFQuestion>
    </div>
  );

  /* Step 3 — visual language */
  if (step === 3) return (
    <div style={{ display: "grid", gap: 38 }}>
      <FFQuestion q="Where do we draw the visual language from?" help="Reference worlds — select all">
        <FFChipSet options={VISUAL_REFS_FF} selected={f.visual_references}
          onToggle={(o) => toggle("visual_references", o)} />
      </FFQuestion>
      <FFQuestion q="What is it made of?" help="Material language — select all">
        <FFChipSet options={MATERIALS_FF} selected={f.materials}
          onToggle={(o) => toggle("materials", o)} />
      </FFQuestion>
      <FFQuestion q="How is it lit?" help="Lighting & atmosphere — select one">
        <FFChipSet options={LIGHTING_FF} selected={f.lighting} multi={false}
          onToggle={(o) => set("lighting", f.lighting === o ? "" : o)} />
      </FFQuestion>
      <FFQuestion q="What should we steer clear of?" help="The avoid list">
        <input className="input" value={f.avoid_list} placeholder="No neon, no cyberpunk, no aggressive forms."
          onChange={(e) => set("avoid_list", e.target.value)} />
      </FFQuestion>
    </div>
  );

  /* Step 4 — output */
  if (step === 4) return (
    <div style={{ display: "grid", gap: 48 }}>
      <FFQuestion q="How many directions should we explore?" help="Distinct creative territories">
        <div className="seg" role="group" aria-label="Number of creative directions">
          {[2, 3, 4].map((n) => (
            <button type="button" key={n} aria-pressed={f.direction_count === n}
              onClick={() => set("direction_count", n)}>{n}</button>
          ))}
        </div>
      </FFQuestion>
      <FFQuestion q="How far should we push?" help="Boldness of the territories">
        <div style={{ maxWidth: 460 }}>
          <FFBoldnessSlider value={f.boldness_level} onChange={(v) => set("boldness_level", v)} />
        </div>
      </FFQuestion>
    </div>
  );

  /* Step 5 — context */
  if (step === 5) return (
    <div style={{ display: "grid", gap: 38 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="tag" style={{ color: "var(--ink-3)" }}>Optional</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.04em" }}>
          Sharpens the brief — skip anything that doesn't apply
        </span>
      </div>
      <FFQuestion q="Who sets the bar?" help="Competitors or references">
        <input className="input" value={f.competitors} placeholder="Aesop, Zenvo, Teenage Engineering…"
          onChange={(e) => set("competitors", e.target.value)} />
      </FFQuestion>
      <FFQuestion q="Any cultural touchstones?" help="Cultural inspiration — press enter to add">
        <FFTagInput tags={f.cultural_inspiration} onChange={(v) => set("cultural_inspiration", v)}
          placeholder="Brutalist architecture, Japanese joinery…" />
      </FFQuestion>
    </div>
  );

  return null;
}

/* ---- main form component ---- */
function FoundationForm({ onSuccess }) {
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [f, setF] = useState(FF_BLANK);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const topRef = useRef(null);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); };
  const toggle = (k, o) => setF((s) => ({ ...s, [k]: s[k].includes(o) ? s[k].filter((x) => x !== o) : [...s[k], o] }));

  const validate = (i) => {
    const e = {};
    if (i === 0) {
      if (!f.name.trim()) e.name = "Please enter your name";
      if (!f.email.trim() || !/\S+@\S+\.\S+/.test(f.email)) e.email = "A valid email is required";
    }
    if (i === 1) {
      if (!f.project_type) e.project_type = "Pick what we're shaping";
      if (f.goal.trim().length < 6) e.goal = "A sentence on the goal helps a lot";
    }
    if (i === 2) {
      if (!f.target_perception.length) e.target_perception = "Pick at least one";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const scrollTop = () => requestAnimationFrame(() => {
    if (topRef.current) {
      const y = topRef.current.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });

  const next = () => {
    if (!validate(step)) return;
    if (step < FF_STEPS.length - 1) {
      const n = step + 1; setStep(n); setMaxReached((m) => Math.max(m, n)); scrollTop();
    } else {
      submit();
    }
  };
  const back = () => { if (step > 0) { setStep(step - 1); scrollTop(); } };
  const jump = (i) => { if (i <= maxReached) { setStep(i); scrollTop(); } };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const boldLabel = f.boldness_level < 34 ? "Conservative" : f.boldness_level < 67 ? "Balanced" : "Experimental";
    const payload = {
      name: f.name.trim(),
      email: f.email.trim(),
      company: f.company.trim(),
      service: f.service,
      website: f.website.trim(),
      answers: {
        shaping:       { project_type: f.project_type, industry: f.industry.trim(), goal: f.goal.trim() },
        direction:     { target_perception: f.target_perception, emotional_outcome: f.emotional_outcome.trim(), metaphor: f.metaphor.trim() },
        visualLanguage:{ visual_references: f.visual_references, materials: f.materials, lighting: f.lighting, avoid_list: f.avoid_list.trim() },
        output:        { direction_count: f.direction_count, boldness_level: boldLabel },
        context:       { competitors: f.competitors.trim(), cultural_inspiration: f.cultural_inspiration },
      },
    };
    try {
      const res = await fetch("/api/foundation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your brief.");
      if (data.reportId && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("spazio_report_id", data.reportId);
      }
      onSuccess && onSuccess();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const isLast = step === FF_STEPS.length - 1;

  return (
    <div ref={topRef}>
      <div className="frame bstudio-grid" style={{ position: "relative", background: "var(--surface)",
        display: "grid", gridTemplateColumns: "300px 1fr", padding: "clamp(24px,3.4vw,44px)", gap: "clamp(28px,3.2vw,52px)" }}>
        <CropMarks color="var(--accent)" />
        <FFStepRail step={step} maxReached={maxReached} onJump={jump} />

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
            paddingBottom: 22, marginBottom: "clamp(28px,3vw,40px)", borderBottom: "1px solid var(--line)" }}>
            <span className="tag tag--accent" style={{ letterSpacing: "0.14em" }}>
              Step {String(step + 1).padStart(2, "0")} <span style={{ color: "var(--ink-4)" }}>/ {String(FF_STEPS.length).padStart(2, "0")}</span>
            </span>
            <span className="tag" style={{ color: "var(--ink-3)" }}>{FF_STEPS[step].title}</span>
          </div>

          <div key={step} className="bstep" style={{ flex: 1 }}>
            <FFStepBody step={step} f={f} set={set} toggle={toggle} errors={errors} />
          </div>

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
                {isLast && (
                  <button type="button" className="txtlink" onClick={next} disabled={submitting}
                    style={{ border: 0, background: "none", opacity: submitting ? 0.5 : 1 }}>
                    Skip — submit brief
                  </button>
                )}
                <button type="button" className="btn btn--primary" onClick={next} disabled={submitting}
                  style={{ padding: "14px 28px", opacity: submitting ? 0.7 : 1 }}>
                  {isLast && submitting ? "Saving…" : isLast ? "Submit brief" : "Continue"}
                  {!submitting && <Arrow />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FoundationForm });
