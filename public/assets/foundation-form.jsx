/* ============================================================
   SPAZIO — Foundation Form (6-page stepper)
   Page 1: Contact + service interest
   Pages 2–6: Brand questionnaire
   On submit → POST /api/foundation → redirects to #brief-ready
   ============================================================ */

const SERVICES = [
  "Brand Identity", "Website", "Digital Product",
  "Creative Direction", "Marketing System", "Packaging", "Not sure yet"
];

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

function FoundationForm({ onSuccess }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ ...BLANK });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
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
            service: f.service, questionnaire,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Submission failed");
        // Store IDs for brief generation
        window.__spazioReport = { reportId: data.reportId, leadId: data.leadId };
        if (onSuccess) onSuccess();
      } catch (err) {
        setSubmitError(err.message || "Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => { if (step > 0) setStep((s) => s - 1); };

  const Input = ({ field, label, placeholder, type = "text", required }) => (
    <div className="field" style={{ gap: 6 }}>
      <label>{label}{!required && <span className="opt">optional</span>}</label>
      <input className={`input${errors[field] ? " err" : ""}`} type={type}
        value={f[field]} onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder} />
      {errors[field] && <span className="err-msg">{errors[field]}</span>}
    </div>
  );

  const TextArea = ({ field, label, placeholder, required }) => (
    <div className="field" style={{ gap: 6 }}>
      <label>{label}{!required && <span className="opt">optional</span>}</label>
      <textarea className={`textarea${errors[field] ? " err" : ""}`}
        value={f[field]} onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder} style={{ minHeight: 100 }} />
      {errors[field] && <span className="err-msg">{errors[field]}</span>}
    </div>
  );

  const stepContent = () => {
    switch (step) {
      case 0: return (
        <div style={{ display: "grid", gap: 24 }}>
          <Input field="name" label="Your name" placeholder="First and last" required />
          <Input field="email" label="Email" placeholder="you@company.com" type="email" required />
          <Input field="company" label="Company" placeholder="Company or brand name" />
          <Input field="website" label="Website" placeholder="https://" />
          <div className="field" style={{ gap: 6 }}>
            <label>What are you looking for?</label>
            <div className="chips">
              {SERVICES.map((s) => (
                <button type="button" key={s} className="chip"
                  aria-pressed={f.service === s}
                  onClick={() => set("service", f.service === s ? "" : s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div style={{ display: "grid", gap: 24 }}>
          <TextArea field="whatYouDo" label="What does your company do?" placeholder="Describe your product or service in a sentence or two." />
          <TextArea field="audience" label="Who is your ideal customer?" placeholder="Demographics, psychographics, the person who gets excited about what you offer." />
          <TextArea field="competitors" label="Who are your main competitors?" placeholder="Names, links, or descriptions. What do they do well? Where do they fall short?" />
        </div>
      );
      case 2: return (
        <div style={{ display: "grid", gap: 24 }}>
          <TextArea field="currentBrand" label="Describe your current brand" placeholder="What exists today — logo, colors, website, social presence. How put-together is it?" />
          <TextArea field="brandPerception" label="How do people perceive your brand right now?" placeholder="What do customers say about you? What impression does your brand leave?" />
          <TextArea field="brandGap" label="Where's the gap?" placeholder="What's the disconnect between how you're perceived and how you want to be perceived?" />
        </div>
      );
      case 3: return (
        <div style={{ display: "grid", gap: 24 }}>
          <TextArea field="shortTermGoal" label="What's the immediate goal for this project?" placeholder="Launch a new identity, redesign the website, create a campaign — what's the first win?" />
          <TextArea field="longTermVision" label="Where do you see the brand in 2–3 years?" placeholder="Growth targets, markets, perception shifts. What does success look like?" />
          <TextArea field="biggestChallenge" label="What's your biggest challenge right now?" placeholder="The thing that keeps you up at night about your brand or business." />
        </div>
      );
      case 4: return (
        <div style={{ display: "grid", gap: 24 }}>
          <TextArea field="visualLike" label="What brands or visuals do you love?" placeholder="Names, links, screenshots. What makes you think 'I want that energy'?" />
          <TextArea field="visualDislike" label="What do you want to avoid?" placeholder="Styles, trends, or aesthetics that feel wrong for your brand." />
          <TextArea field="inspiration" label="Any other references or inspiration?" placeholder="Links, mood boards, Instagram accounts, architecture, fashion — anything that captures the feeling." />
        </div>
      );
      case 5: return (
        <div style={{ display: "grid", gap: 24 }}>
          <div className="field" style={{ gap: 6 }}>
            <label>Timeline</label>
            <div className="chips">
              {["ASAP", "1–2 months", "3–6 months", "Just exploring"].map((t) => (
                <button type="button" key={t} className="chip"
                  aria-pressed={f.timeline === t}
                  onClick={() => set("timeline", f.timeline === t ? "" : t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="field" style={{ gap: 6 }}>
            <label>Budget range</label>
            <div className="chips">
              {["$2k–$5k", "$5k–$10k", "$10k–$25k", "$25k+", "Prefer to discuss"].map((b) => (
                <button type="button" key={b} className="chip"
                  aria-pressed={f.budget === b}
                  onClick={() => set("budget", f.budget === b ? "" : b)}>{b}</button>
              ))}
            </div>
          </div>
          <TextArea field="scope" label="Anything else we should know?" placeholder="Context, constraints, dreams — whatever helps us understand your world." />
        </div>
      );
    }
  };

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
            {FOUNDATION_STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "active" : "pending";
              return (
                <button key={s.key} className="brail-step" data-state={state}
                  disabled={i > step} onClick={() => { if (i < step) setStep(i); }}>
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

          <div key={step} className="bstep" style={{ flex: 1 }}>
            {stepContent()}
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
