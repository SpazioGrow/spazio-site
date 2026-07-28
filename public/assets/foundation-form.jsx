/* ============================================================
   SPAZIO — Foundation Form (6-page stepper)
   Page 1: Contact + service interest
   Pages 2–6: Brand questionnaire
   On submit → POST /api/foundation → shows the confirmation screen
   ============================================================ */
// Select vocabularies come from the shared source of truth (lib/foundation-options),
// injected by app/route.ts as window.SPAZIO_FOUNDATION_OPTIONS, so the form's chips
// and /api/foundation's validation can never drift.
function fopt(key) {
  try { return (window.SPAZIO_FOUNDATION_OPTIONS && window.SPAZIO_FOUNDATION_OPTIONS[key]) || []; }
  catch (e) { return []; }
}
const FOUNDATION_STEPS = [
  { key: "contact",    title: "You",           rail: "Name · email · company" },
  { key: "business",   title: "Business",      rail: "What you do · audience" },
  { key: "brand",      title: "Brand",         rail: "Current state · perception" },
  { key: "goals",      title: "Goals",         rail: "Where you're headed" },
  { key: "visual",     title: "Visual",        rail: "Look · feel · references" },
  { key: "practical",  title: "Practical",     rail: "Timeline · budget · scope" },
];
const BLANK = {
  name: "", email: "", company: "", website: "", service: "",
  whatYouDo: "", audience: "", competitors: "",
  currentBrand: "", brandPerception: "", brandGap: "",
  shortTermGoal: "", longTermVision: "", biggestChallenge: "",
  visualLike: "", visualDislike: "", inspiration: "",
  timeline: "", budget: "", scope: "",
};
function FndInput({ field, label, placeholder, type, required, value, onChange, error }) {
  return (
    <div className="field" style={{ gap: 6 }}>
      <label>{label}{!required && <span className="opt">optional</span>}</label>
      <input className={"input" + (error ? " err" : "")} type={type || "text"}
        value={value} onChange={onChange}
        placeholder={placeholder} />
      {error && <span className="err-msg">{error}</span>}
    </div>
  );
}
function FndTextArea({ field, label, placeholder, required, value, onChange, error }) {
  return (
    <div className="field" style={{ gap: 6 }}>
      <label>{label}{!required && <span className="opt">optional</span>}</label>
      <textarea className={"textarea" + (error ? " err" : "")}
        value={value} onChange={onChange}
        placeholder={placeholder} style={{ minHeight: 100 }} />
      {error && <span className="err-msg">{error}</span>}
    </div>
  );
}
function FoundationForm({ onSuccess, prefillEmail, comped }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(Object.assign({}, BLANK, prefillEmail ? { email: prefillEmail } : {}));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false); // <-- drives the confirmation screen
  const set = (k, v) => { setF(function(p) { return Object.assign({}, p, { [k]: v }); }); setErrors(function(e) { return Object.assign({}, e, { [k]: undefined }); }); };
  const isLast = step === FOUNDATION_STEPS.length - 1;
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!f.name.trim()) e.name = "Required";
      if (!f.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Invalid email";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = async () => {
    if (!validate()) return;
    if (isLast) {
      setSubmitting(true);
      setSubmitError("");
      try {
        const questionnaire = {
          whatYouDo: f.whatYouDo, audience: f.audience, competitors: f.competitors,
          currentBrand: f.currentBrand, brandPerception: f.brandPerception, brandGap: f.brandGap,
          shortTermGoal: f.shortTermGoal, longTermVision: f.longTermVision, biggestChallenge: f.biggestChallenge,
          visualLike: f.visualLike, visualDislike: f.visualDislike, inspiration: f.inspiration,
          timeline: f.timeline, budget: f.budget, scope: f.scope,
        };
        const res = await fetch("/api/foundation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.name.trim(), email: f.email.trim(),
            company: f.company.trim(), website: f.website.trim(),
            service: f.service, questionnaire: questionnaire,
            comped: comped === true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Submission failed");
        window.__spazioReport = { reportId: data.reportId, leadId: data.leadId };
        // NOTE: /api/foundation already fires generate-deck server-side (via waitUntil),
        // so we do NOT call it again here — that was double-generating the deck.
        setSubmitted(true);          // <-- show the confirmation screen
        if (onSuccess) onSuccess();  // still notify the parent (analytics, etc.)
      } catch (err) {
        setSubmitError(err.message || "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStep(function(s) { return s + 1; });
  };
  const back = () => { if (step > 0) setStep(function(s) { return s - 1; }); };

  // ---- Confirmation screen: shown after a successful submit ----
  if (submitted) {
    const firstName = (f.name || "").trim().split(/\s+/)[0];
    return (
      <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(24px,3.5vw,48px)" }}>
        <CropMarks color="var(--accent)" />
        <div style={{ maxWidth: "56ch" }}>
          <p className="label label--accent label-dot" style={{ marginBottom: 16 }}>Foundation</p>
          <h2 className="display" style={{ fontSize: "clamp(28px,3.8vw,48px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1.05, maxWidth: "20ch" }}>
            We've got it. Your <em className="grace">brief</em> is in motion.
          </h2>
          <p style={{ marginTop: 18, fontSize: 16, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Thanks{firstName ? ", " + firstName : ""} — your answers are in, and we're already putting your brand brief together. You'll hear from us shortly with the next step.
          </p>
          <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-3)", lineHeight: 1.6 }}>
            Watch {f.email ? f.email : "your inbox"} — that's where it lands.
          </p>
        </div>
      </div>
    );
  }

  var stepContent;
  switch (step) {
    case 0: stepContent = (
      <div style={{ display: "grid", gap: 24 }}>
        <FndInput field="name" label="Your name" placeholder="First and last" required={true}
          value={f.name} onChange={function(e) { set("name", e.target.value); }} error={errors.name} />
        <FndInput field="email" label="Email" placeholder="you@company.com" type="email" required={true}
          value={f.email} onChange={function(e) { set("email", e.target.value); }} error={errors.email} />
        <FndInput field="company" label="Company" placeholder="Company or brand name"
          value={f.company} onChange={function(e) { set("company", e.target.value); }} error={errors.company} />
        <FndInput field="website" label="Website" placeholder="https://"
          value={f.website} onChange={function(e) { set("website", e.target.value); }} error={errors.website} />
        <div className="field" style={{ gap: 6 }}>
          <label>What are you looking for?</label>
          <div className="chips">
            {fopt("service").map(function(s) { return (
              <button type="button" key={s} className="chip"
                aria-pressed={f.service === s}
                onClick={function() { set("service", f.service === s ? "" : s); }}>{s}</button>
            ); })}
          </div>
        </div>
      </div>
    ); break;
    case 1: stepContent = (
      <div style={{ display: "grid", gap: 24 }}>
        <FndTextArea field="whatYouDo" label="What does your company do?" placeholder="Describe your product or service in a sentence or two."
          value={f.whatYouDo} onChange={function(e) { set("whatYouDo", e.target.value); }} />
        <FndTextArea field="audience" label="Who is your ideal customer?" placeholder="Demographics, psychographics, the person who gets excited about what you offer."
          value={f.audience} onChange={function(e) { set("audience", e.target.value); }} />
        <FndTextArea field="competitors" label="Who are your main competitors?" placeholder="Names, links, or descriptions. What do they do well? Where do they fall short?"
          value={f.competitors} onChange={function(e) { set("competitors", e.target.value); }} />
      </div>
    ); break;
    case 2: stepContent = (
      <div style={{ display: "grid", gap: 24 }}>
        <FndTextArea field="currentBrand" label="Describe your current brand" placeholder="What exists today — logo, colors, website, social presence. How put-together is it?"
          value={f.currentBrand} onChange={function(e) { set("currentBrand", e.target.value); }} />
        <FndTextArea field="brandPerception" label="How do people perceive your brand right now?" placeholder="What do customers say about you? What impression does your brand leave?"
          value={f.brandPerception} onChange={function(e) { set("brandPerception", e.target.value); }} />
        <FndTextArea field="brandGap" label="Where's the gap?" placeholder="What's the disconnect between how you're perceived and how you want to be perceived?"
          value={f.brandGap} onChange={function(e) { set("brandGap", e.target.value); }} />
      </div>
    ); break;
    case 3: stepContent = (
      <div style={{ display: "grid", gap: 24 }}>
        <FndTextArea field="shortTermGoal" label="What's the immediate goal for this project?" placeholder="Launch a new identity, redesign the website, create a campaign — what's the first win?"
          value={f.shortTermGoal} onChange={function(e) { set("shortTermGoal", e.target.value); }} />
        <FndTextArea field="longTermVision" label="Where do you see the brand in 2–3 years?" placeholder="Growth targets, markets, perception shifts. What does success look like?"
          value={f.longTermVision} onChange={function(e) { set("longTermVision", e.target.value); }} />
        <FndTextArea field="biggestChallenge" label="What's your biggest challenge right now?" placeholder="The thing that keeps you up at night about your brand or business."
          value={f.biggestChallenge} onChange={function(e) { set("biggestChallenge", e.target.value); }} />
      </div>
    ); break;
    case 4: stepContent = (
      <div style={{ display: "grid", gap: 24 }}>
        <FndTextArea field="visualLike" label="What brands or visuals do you love?" placeholder="Names, links, screenshots. What makes you think 'I want that energy'?"
          value={f.visualLike} onChange={function(e) { set("visualLike", e.target.value); }} />
        <FndTextArea field="visualDislike" label="What do you want to avoid?" placeholder="Styles, trends, or aesthetics that feel wrong for your brand."
          value={f.visualDislike} onChange={function(e) { set("visualDislike", e.target.value); }} />
        <FndTextArea field="inspiration" label="Any other references or inspiration?" placeholder="Links, mood boards, Instagram accounts, architecture, fashion — anything that captures the feeling."
          value={f.inspiration} onChange={function(e) { set("inspiration", e.target.value); }} />
      </div>
    ); break;
    case 5: stepContent = (
      <div style={{ display: "grid", gap: 24 }}>
        <div className="field" style={{ gap: 6 }}>
          <label>Timeline</label>
          <div className="chips">
            {fopt("timeline").map(function(t) { return (
              <button type="button" key={t} className="chip"
                aria-pressed={f.timeline === t}
                onClick={function() { set("timeline", f.timeline === t ? "" : t); }}>{t}</button>
            ); })}
          </div>
        </div>
        <div className="field" style={{ gap: 6 }}>
          <label>Budget range</label>
          <div className="chips">
            {fopt("budget").map(function(b) { return (
              <button type="button" key={b} className="chip"
                aria-pressed={f.budget === b}
                onClick={function() { set("budget", f.budget === b ? "" : b); }}>{b}</button>
            ); })}
          </div>
        </div>
        <FndTextArea field="scope" label="Anything else we should know?" placeholder="Context, constraints, dreams — whatever helps us understand your world."
          value={f.scope} onChange={function(e) { set("scope", e.target.value); }} />
      </div>
    ); break;
  }
  return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(24px,3.5vw,48px)" }}>
      <CropMarks color="var(--accent)" />
      {/* Header */}
      <div style={{ marginBottom: "clamp(24px,3vw,36px)", paddingBottom: "clamp(20px,2.6vw,28px)", borderBottom: "1px solid var(--line)" }}>
        <p className="label label--accent label-dot" style={{ marginBottom: 16 }}>Foundation</p>
        <h2 className="display" style={{ fontSize: "clamp(28px,3.8vw,48px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1, maxWidth: "18ch" }}>
          Let's understand your <em className="grace">brand</em>.
        </h2>
        <p style={{ marginTop: 14, fontSize: 15, color: "var(--ink-2)", maxWidth: "48ch", lineHeight: 1.55 }}>
          Six short pages. Takes about five minutes. Every answer sharpens what we build for you.
        </p>
      </div>
      {/* Rail + Content */}
      <div className="bstudio-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "clamp(24px,3vw,40px)" }}>
        {/* Step rail */}
        <div className="brail" style={{ borderRight: "1px solid var(--line)", paddingRight: "clamp(16px,2vw,28px)" }}>
          <div className="brail-list" style={{ display: "flex", flexDirection: "column" }}>
            {FOUNDATION_STEPS.map(function(s, i) {
              var state = i < step ? "done" : i === step ? "active" : "pending";
              return (
                <button key={s.key} className="brail-step" data-state={state}
                  disabled={i > step} onClick={function() { if (i < step) setStep(i); }}>
                  <span className="brail-num">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="brail-ttl">{s.title}</div>
                    <div className="brail-sub">{s.rail}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
            paddingBottom: 22, marginBottom: "clamp(28px,3vw,40px)", borderBottom: "1px solid var(--line)" }}>
            <span className="tag tag--accent" style={{ letterSpacing: "0.14em" }}>
              Step {String(step + 1).padStart(2, "0")} <span style={{ color: "var(--ink-4)" }}>/ {String(FOUNDATION_STEPS.length).padStart(2, "0")}</span>
            </span>
            <span className="tag" style={{ color: "var(--ink-3)" }}>{FOUNDATION_STEPS[step].title}</span>
          </div>
          <div style={{ flex: 1 }}>
            {stepContent}
          </div>
          {submitError && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#FDF2F0", border: "1px solid #E8C4BD", borderRadius: 4 }}>
              <span className="err-msg">{submitError}</span>
            </div>
          )}
          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
            marginTop: "clamp(34px,4vw,52px)", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            <button type="button" className="btn btn--ghost" onClick={back}
              style={{ padding: "13px 22px", visibility: step === 0 ? "hidden" : "visible" }}>
              <svg className="arr" width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: "scaleX(-1)" }}>
                <path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button type="button" className="btn btn--primary" onClick={next}
              disabled={submitting} style={{ padding: "14px 28px", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Submitting…" : isLast ? "Submit" : "Continue"}
              {!submitting && <Arrow />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { FoundationForm });
