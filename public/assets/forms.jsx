/* ============================================================
   SPAZIO — Forms & AI brief generator
   IntakeForm (form → AI brief → result) · SubscribeForm
   Field names are automation-ready: Make / Airtable / email
   ============================================================ */

const PROJECT_TYPES = ["Brand Identity", "Website", "Digital Product", "Creative Direction", "Marketing System", "Not sure yet"];
const TIMELINES = ["ASAP", "1–2 months", "3–6 months", "Just exploring"];
const BUDGETS = ["$2k–$5k", "$5k–$10k", "$10k–$25k", "$25k–$50k", "$50k+", "Prefer to discuss"];
const STAGE_CTX = ["Launching something new", "Full revamp", "Enhancing what we have"];

const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* Pull JSON out of a model response that may be fenced or chatty */
function extractJSON(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/,"").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

async function generateBrief(f, inspo) {
  const links = (inspo && inspo.links) || [];
  const images = (inspo && inspo.images) || [];
  let inspoBlock = "";
  if (links.length || images.length) {
    inspoBlock = `

Inspiration / references the client provided. Interpret the visual intent — do NOT copy or recreate these. Read tone, typography direction, layout structure, visual density, and color mood, and let them sharpen (not replace) your direction.`;
    if (links.length) inspoBlock += `
- Links: ${links.join(", ")}`;
    if (images.length) inspoBlock += `
- ${images.length} image(s): ` + images.map((im) => `${im.name}${im.colors && im.colors.length ? ` (dominant colors ${im.colors.join(", ")})` : ""}`).join("; ");
  }

  const prompt = `You are a senior creative director at Spazio, a high-end digital design agency. You are not a summarizer or a chatbot. You interpret client intent, identify positioning and perception gaps, and reframe the problem with strong, opinionated taste. When the client shares references, you read visual intent and translate it into structured direction — never copying. Humans still make every final creative decision — your job is to elevate the client's thinking, not mirror it.

Client intake
- Name: ${f.name}
- Company: ${f.company}
- Stage / context: ${f.context || "not specified"}
- Project type(s): ${f.types.join(", ") || "not specified"}
- In their words: ${f.brief}
- Timeline: ${f.timeline || "not specified"}
- Budget: ${f.budget || "not specified"}${inspoBlock}

Interpret the underlying business problem — do not restate inputs. Commit to a SINGLE strong direction. No multiple weak options, no generic "modern and clean" language, no SaaS/product clichés, no filler. Be confident, concise, and design-led.

Return ONLY valid JSON (no prose, no markdown) in exactly this shape:
{
  "summary": "1-3 sentence strategic overview",
  "core_problem": "the real underlying issue, not a restatement of their words",
  "strategic_reframe": "reframe the project into its true strategic intent (e.g. 'This is not a redesign — it is a repositioning exercise to elevate perceived value.')",
  "recommended_service": "one of: Brand Identity, Web & Digital Product, Creative Direction, Marketing Design System",
  "creative_direction": {
    "concept": "a single strong concept line with a clear point of view",
    "tone": "3-5 short descriptors",
    "visual_language": "1-2 sentence design direction"
  },
  "inspiration_analysis": {
    "interpreted_style": "how you read their references",
    "visual_patterns": ["3-4 concrete patterns — typography, layout, density, color mood"],
    "tone_mood": "the mood the references signal",
    "design_implications": "how this sharpens the direction, without copying"
  },
  "risks_or_mistakes_to_avoid": ["3-4 opinionated risks that would weaken this project"],
  "key_considerations": ["3-4 short considerations"],
  "timeline": "a short phased timeline estimate",
  "next_steps": ["3-4 practical, execution-oriented steps"]
}
If no inspiration/references were provided, set "inspiration_analysis" to null.`;
  const raw = await window.claude.complete(prompt);
  return extractJSON(raw);
}

/* Extract a small dominant-color palette from an image (client-side signal for the model) */
function extractPalette(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const s = 24;
        const c = document.createElement("canvas");
        c.width = s; c.height = s;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, s, s);
        const data = ctx.getImageData(0, 0, s, s).data;
        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 125) continue;
          const r = Math.round(data[i] / 36) * 36, g = Math.round(data[i + 1] / 36) * 36, b = Math.round(data[i + 2] / 36) * 36;
          const k = `${r},${g},${b}`;
          buckets[k] = (buckets[k] || 0) + 1;
        }
        const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => {
          const [r, g, b] = k.split(",").map(Number);
          return "#" + [r, g, b].map((x) => Math.min(255, x).toString(16).padStart(2, "0")).join("");
        });
        resolve(top);
      } catch { resolve([]); }
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}

const prettyHost = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

/* ---------------- INSPIRATION FIELD ---------------- */
function InspirationField({ value, onChange }) {
  const { images, links } = value;
  const [drag, setDrag] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const addFiles = async (fileList) => {
    const files = [...fileList].filter((file) => file.type.startsWith("image/")).slice(0, 6 - images.length);
    const read = await Promise.all(files.map((file) => new Promise((res) => {
      const r = new FileReader();
      r.onload = async () => { const colors = await extractPalette(r.result); res({ name: file.name, dataUrl: r.result, colors }); };
      r.onerror = () => res(null);
      r.readAsDataURL(file);
    })));
    onChange({ ...value, images: [...images, ...read.filter(Boolean)] });
  };

  const addLink = () => {
    const v = draft.trim();
    if (!v) return;
    const url = /^https?:\/\//i.test(v) ? v : "https://" + v;
    onChange({ ...value, links: [...links, url] });
    setDraft("");
  };
  const removeImage = (i) => onChange({ ...value, images: images.filter((_, x) => x !== i) });
  const removeLink = (i) => onChange({ ...value, links: links.filter((_, x) => x !== i) });

  return (
    <div className="field">
      <label>Inspiration / references <span className="opt">optional</span></label>
      <p style={{ margin: "0 0 4px", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-3)" }}>
        Drop images or paste links — Pinterest, Behance, Dribbble, a site you admire. We interpret the intent and translate it into direction. We never copy.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{
          border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line-2)"}`,
          background: drag ? "var(--accent-soft)" : "var(--surface-2)",
          borderRadius: 10, padding: "26px 20px", textAlign: "center", cursor: "pointer",
          transition: "border-color .25s var(--ease), background .25s var(--ease)",
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block", color: "var(--accent-deep)" }}>
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)" }}>
          Drag &amp; drop images, or <span style={{ color: "var(--accent-deep)", borderBottom: "1px solid var(--accent-line)" }}>browse</span>
        </p>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-4)", textTransform: "uppercase" }}>PNG · JPG · up to 6</p>
      </div>

      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, marginTop: 12 }}>
          {images.map((im, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", background: "var(--surface-2)" }}>
              <img src={im.dataUrl} alt={im.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
              {im.colors && im.colors.length > 0 && (
                <div style={{ display: "flex", height: 6 }}>
                  {im.colors.map((c, k) => <span key={k} style={{ flex: 1, background: c }} />)}
                </div>
              )}
              <button type="button" aria-label="Remove image" onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", border: "none", background: "color-mix(in oklab, var(--ink) 72%, transparent)", color: "var(--bg)", display: "grid", placeItems: "center", lineHeight: 1, fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input className="input" value={draft} placeholder="Paste an inspiration link…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
        <button type="button" className="btn btn--ghost" style={{ padding: "12px 20px", flex: "0 0 auto" }} onClick={addLink}>Add</button>
      </div>

      {links.length > 0 && (
        <div className="chips" style={{ marginTop: 10 }}>
          {links.map((l, i) => (
            <span key={i} className="chip" style={{ background: "var(--surface-2)", color: "var(--ink-2)", display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
              {prettyHost(l)}
              <button type="button" aria-label="Remove link" onClick={() => removeLink(i)} style={{ border: "none", background: "none", color: "var(--ink-3)", padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- INTAKE FORM ---------------- */
function IntakeForm() {
  const [f, setF] = useState({ name: "", company: "", email: "", context: "", types: [], brief: "", timeline: "", budget: "" });
  const [inspo, setInspo] = useState({ images: [], links: [] });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("form"); // form | loading | result
  const [brief, setBrief] = useState(null);
  const [aiError, setAiError] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); };
  const toggleType = (t) => setF((s) => ({ ...s, types: s.types.includes(t) ? s.types.filter((x) => x !== t) : [...s.types, t] }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Your name, please";
    if (!f.company.trim()) e.company = "What's the company called?";
    if (!validEmail(f.email)) e.email = "A valid email so we can reply";
    if (!f.types.length) e.types = "Pick at least one";
    if (f.brief.trim().length < 12) e.brief = "A sentence or two helps a lot";
    if (!f.timeline) e.timeline = "Roughly when?";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setPhase("loading"); setAiError(false);
    // In production this POSTs to /api/brief (Next.js). In this prototype we call Claude directly.
    try {
      let result = null;
      if (window.claude && window.claude.complete) result = await generateBrief(f, inspo);
      if (!result) throw new Error("no result");
      setBrief(result); setPhase("result");
    } catch (err) {
      setAiError(true); setPhase("result");
    }
  };

  const reset = () => { setPhase("form"); setBrief(null); setAiError(false); setSent(false); };

  if (phase === "loading") return <BriefLoading f={f} />;
  if (phase === "result") return <BriefResult f={f} inspo={inspo} brief={brief} aiError={aiError} sent={sent} onSend={() => setSent(true)} onEdit={reset} />;

  const fieldErr = (k) => errors[k] && <span className="err-msg">{errors[k]}</span>;

  return (
    <form onSubmit={submit} noValidate className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(24px,3.5vw,44px)" }}>
      <CropMarks color="var(--accent)" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap",
        marginBottom: "clamp(22px,3vw,32px)", paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
        <span className="tag tag-dot tag--accent">Project intake</span>
        <span className="tag" style={{ color: "var(--ink-3)" }}>Form → AI brief → human reply</span>
      </div>
      <div style={{ display: "grid", gap: 24 }}>
        <div className="grid12" style={{ rowGap: 24 }}>
          <div className="field col-span-6" style={{ gridColumn: "span 6" }}>
            <label htmlFor="in-name">Name</label>
            <input id="in-name" name="name" className={`input ${errors.name ? "err" : ""}`} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Founder" />
            {fieldErr("name")}
          </div>
          <div className="field col-span-6" style={{ gridColumn: "span 6" }}>
            <label htmlFor="in-company">Company</label>
            <input id="in-company" name="company" className={`input ${errors.company ? "err" : ""}`} value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Inc." />
            {fieldErr("company")}
          </div>
        </div>

        <div className="field">
          <label htmlFor="in-email">Email</label>
          <input id="in-email" name="email" type="email" className={`input ${errors.email ? "err" : ""}`} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
          {fieldErr("email")}
        </div>

        <div className="field">
          <label>Where are you — roughly?</label>
          <div className="chips">
            {STAGE_CTX.map((c) => (
              <button type="button" key={c} className="chip" aria-pressed={f.context === c} onClick={() => set("context", f.context === c ? "" : c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Project type <span className="opt">select all that apply</span></label>
          <div className="chips">
            {PROJECT_TYPES.map((t) => (
              <button type="button" key={t} className="chip" aria-pressed={f.types.includes(t)} onClick={() => { toggleType(t); setErrors((e) => ({ ...e, types: null })); }}>{t}</button>
            ))}
          </div>
          {fieldErr("types")}
        </div>

        <div className="field">
          <label htmlFor="in-brief">What are you looking to build or improve?</label>
          <textarea id="in-brief" name="brief" className={`textarea ${errors.brief ? "err" : ""}`} value={f.brief} onChange={(e) => set("brief", e.target.value)} placeholder="Tell us about the project, the goal, and what 'great' looks like to you." />
          {fieldErr("brief")}
        </div>

        <InspirationField value={inspo} onChange={setInspo} />

        <div className="grid12" style={{ rowGap: 24 }}>
          <div className="field col-span-6" style={{ gridColumn: "span 6" }}>
            <label>Timeline</label>
            <div className="chips">
              {TIMELINES.map((t) => (
                <button type="button" key={t} className="chip" aria-pressed={f.timeline === t} onClick={() => set("timeline", t)}>{t}</button>
              ))}
            </div>
            {fieldErr("timeline")}
          </div>
          <div className="field col-span-6" style={{ gridColumn: "span 6" }}>
            <label htmlFor="in-budget">Budget <span className="opt">optional</span></label>
            <select id="in-budget" name="budget" className="select" value={f.budget} onChange={(e) => set("budget", e.target.value)}>
              <option value="">Select a range…</option>
              {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 6, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
          <button type="submit" className="btn btn--primary" style={{ padding: "15px 28px" }}>
            Generate my brief <Arrow />
          </button>
          <p style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", letterSpacing: "0.03em", maxWidth: "34ch", lineHeight: 1.5 }}>
            AI structures your brief in seconds. A human reads it and replies within 2 business days.
          </p>
        </div>
      </div>
    </form>
  );
}

/* ---------------- BRIEF: LOADING ---------------- */
function BriefLoading({ f }) {
  const steps = ["Reading your intake", "Finding the real problem", "Shaping a direction"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % steps.length), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "clamp(40px,6vw,72px)", textAlign: "center", minHeight: 320, display: "grid", placeItems: "center" }}>
      <div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 26 }}>
          {[0, 1, 2].map((d) => (
            <span key={d} className="brief-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", animationDelay: `${d * 0.18}s` }} />
          ))}
        </div>
        <p className="display d3" style={{ fontWeight: 600 }}>{steps[i]}…</p>
        <p style={{ marginTop: 14, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-3)", textTransform: "uppercase" }}>
          AI · supporting the workflow
        </p>
      </div>
    </div>
  );
}

/* ---------------- BRIEF: CREATIVE DIRECTION DOCUMENT ---------------- */
function BriefBullets({ items, warn = false }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
      {(items || []).map((x, i) => (
        <li key={i} style={{ display: "flex", gap: 11, alignItems: "baseline", fontSize: 16, lineHeight: 1.5, color: warn ? "#7c4326" : "var(--ink-2)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: warn ? "#b5673f" : "var(--accent)", flex: "0 0 auto", transform: "translateY(-3px)" }} />
          {x}
        </li>
      ))}
    </ul>
  );
}

function StratCard({ label, children, emphasis = false }) {
  return (
    <div style={{
      background: emphasis ? "var(--accent-soft)" : "var(--surface-2)",
      border: `1px solid ${emphasis ? "var(--accent-line)" : "var(--line)"}`,
      borderRadius: 10, padding: "22px 22px 24px",
    }}>
      <p className="label label--accent" style={{ marginBottom: 12, letterSpacing: "0.1em" }}>{label}</p>
      {children}
    </div>
  );
}

function BriefResult({ f, inspo, brief, aiError, sent, onSend, onEdit }) {
  const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "clamp(24px,3.5vw,44px)" };
  const ref = ((f.company || "SPZ").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SPZ") + "\u201326";

  if (aiError || !brief) {
    return (
      <div style={{ ...card, textAlign: "center" }}>
        <h3 className="display d3" style={{ fontWeight: 600 }}>Brief is processing.</h3>
        <p className="lede" style={{ margin: "14px auto 0", maxWidth: "44ch" }}>
          We couldn't generate your brief just now. Please refresh or try again — your details
          are safe, and you can resend in a moment.
        </p>
        <button className="btn btn--primary" style={{ marginTop: 26 }} onClick={onEdit}>Try again <Arrow /></button>
      </div>
    );
  }

  // Normalize — tolerate a leaner shape so the UI never breaks
  const cd = typeof brief.creative_direction === "string"
    ? { concept: brief.creative_direction }
    : (brief.creative_direction || {});
  const concept = cd.concept || brief.creativeDirection || "";
  const toneItems = Array.isArray(cd.tone)
    ? cd.tone
    : (cd.tone ? String(cd.tone).split(/[,•;]/).map((s) => s.trim()).filter(Boolean) : []);
  const service = brief.recommended_service || brief.recommendedService || "—";
  const risks = brief.risks_or_mistakes_to_avoid || [];
  const considerations = brief.key_considerations || brief.considerations || [];
  const nextSteps = brief.next_steps || brief.nextSteps || [];
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const ptext = (t, em = false) => <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.55, color: em ? "var(--accent-deep)" : "var(--ink-2)", fontWeight: em ? 500 : 400 }}>{t}</p>;

  return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(24px,3.5vw,44px)" }}>
      <CropMarks color="var(--accent)" />
      {/* Header — measured cover */}
      <div style={{ paddingBottom: "clamp(22px,3vw,34px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: "clamp(20px,3vw,30px)" }}>
          <span className="tag tag-dot tag--accent">Creative Direction Brief</span>
          <span className="tag" style={{ color: "var(--ink-3)" }}>REF {ref}</span>
        </div>
        <h3 className="display" style={{ fontSize: "clamp(30px,3.8vw,52px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 0.98 }}>{f.company}</h3>
        <div className="colticks" style={{ marginTop: 16, gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[["Project", (f.types || []).join(", ") || "\u2014"], ["Generated", today], ["Prepared by", "Spazio CD"], ["Status", "Draft"]].map(([k, v]) => (
            <span key={k} style={{ padding: "10px 0 0 10px", display: "block" }}>
              <span style={{ display: "block", color: "var(--ink-4)", marginBottom: 5 }}>{k}</span>
              <span style={{ display: "block", fontFamily: "var(--sans)", fontSize: 13.5, letterSpacing: "-0.01em", color: "var(--ink)", fontWeight: 500, textTransform: "none" }}>{v}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Summary — hero insight */}
      <div style={{ paddingBlock: "clamp(26px,3.5vw,40px)", borderBottom: "1px solid var(--line)" }}>
        <p className="label label--accent" style={{ marginBottom: 16, letterSpacing: "0.1em" }}>Summary</p>
        <p style={{ margin: 0, fontSize: "clamp(20px,2vw,26px)", lineHeight: 1.42, letterSpacing: "-0.018em", color: "var(--ink)", maxWidth: "38ch", textWrap: "pretty" }}>
          {brief.summary}
        </p>
      </div>

      {/* Strategic grid */}
      <div className="brief-grid" style={{ paddingBlock: "clamp(26px,3.5vw,40px)", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {brief.core_problem && <StratCard label="Core insight">{ptext(brief.core_problem)}</StratCard>}
        {brief.strategic_reframe && <StratCard label="Reframe" emphasis>{ptext(brief.strategic_reframe, true)}</StratCard>}
        <StratCard label="Recommended direction">
          <span style={{ display: "inline-block", fontFamily: "var(--display)", fontWeight: 600, fontSize: 21, letterSpacing: "-0.02em", color: "var(--accent-deep)" }}>{service}</span>
        </StratCard>
        {brief.timeline && <StratCard label="Timeline">{ptext(brief.timeline)}</StratCard>}
      </div>

      {/* Creative direction — visual centerpiece */}
      {concept && (
        <div style={{ padding: "clamp(28px,3.6vw,44px)", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", borderRadius: 12, marginBottom: "clamp(26px,3.5vw,40px)" }}>
          <p className="label label--accent" style={{ marginBottom: 18, letterSpacing: "0.1em" }}>Creative direction</p>
          <p className="display" style={{ margin: 0, fontSize: "clamp(26px,3.4vw,42px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1.04, color: "var(--ink)", maxWidth: "17ch", textWrap: "balance" }}>
            {concept}
          </p>
          <div style={{ marginTop: 26, display: "grid", gap: 20 }}>
            {toneItems.length > 0 && (
              <div>
                <p className="label" style={{ color: "var(--ink-3)", marginBottom: 10 }}>Tone</p>
                <div className="chips">
                  {toneItems.map((t) => <span key={t} className="chip" style={{ pointerEvents: "none", background: "var(--surface-2)", color: "var(--ink)" }}>{t}</span>)}
                </div>
              </div>
            )}
            {cd.visual_language && (
              <div>
                <p className="label" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Visual language</p>
                <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "48ch" }}>{cd.visual_language}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspiration analysis — how we read the references */}
      {brief.inspiration_analysis && (
        <div style={{ paddingBlock: "clamp(26px,3.5vw,40px)", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <p className="label label--accent" style={{ letterSpacing: "0.1em", margin: 0 }}>Reading your references</p>
            {(inspo && (inspo.images.length + inspo.links.length) > 0) && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                {inspo.images.length} image{inspo.images.length === 1 ? "" : "s"} · {inspo.links.length} link{inspo.links.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {brief.inspiration_analysis.interpreted_style && (
            <p style={{ margin: "0 0 22px", fontSize: "clamp(18px,1.8vw,22px)", lineHeight: 1.45, letterSpacing: "-0.015em", color: "var(--ink)", maxWidth: "40ch", textWrap: "pretty" }}>
              {brief.inspiration_analysis.interpreted_style}
            </p>
          )}
          <div className="brief-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {brief.inspiration_analysis.tone_mood && <StratCard label="Tone &amp; mood">{ptext(brief.inspiration_analysis.tone_mood)}</StratCard>}
            {brief.inspiration_analysis.design_implications && <StratCard label="Design implications" emphasis>{ptext(brief.inspiration_analysis.design_implications, true)}</StratCard>}
          </div>
          {Array.isArray(brief.inspiration_analysis.visual_patterns) && brief.inspiration_analysis.visual_patterns.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p className="label" style={{ color: "var(--ink-3)", marginBottom: 12 }}>Visual patterns we picked up</p>
              <div className="chips">
                {brief.inspiration_analysis.visual_patterns.map((p, i) => (
                  <span key={i} className="chip" style={{ pointerEvents: "none", background: "var(--surface-2)", color: "var(--ink)" }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          <p style={{ margin: "20px 0 0", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.04em", lineHeight: 1.5 }}>
            Interpreted for direction — never copied. A human makes the final call.
          </p>
        </div>
      )}

      {/* Considerations + What to avoid */}
      {(considerations.length > 0 || risks.length > 0) && (
        <div className="brief-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(20px,3vw,36px)", paddingBottom: "clamp(26px,3.5vw,40px)", borderBottom: "1px solid var(--line)" }}>
          {considerations.length > 0 && (
            <div>
              <p className="label label--accent" style={{ marginBottom: 16, letterSpacing: "0.1em" }}>Key considerations</p>
              <BriefBullets items={considerations} />
            </div>
          )}
          {risks.length > 0 && (
            <div style={{ background: "color-mix(in oklab, #C0492E 7%, var(--surface))", border: "1px solid color-mix(in oklab, #C0492E 22%, var(--line))", borderRadius: 10, padding: "20px 22px" }}>
              <p style={{ margin: "0 0 14px", fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9c4a2b" }}>What to avoid</p>
              <BriefBullets items={risks} warn />
            </div>
          )}
        </div>
      )}

      {/* Next steps — checklist */}
      {nextSteps.length > 0 && (
        <div style={{ paddingBlock: "clamp(26px,3.5vw,40px)" }}>
          <p className="label label--accent" style={{ marginBottom: 6, letterSpacing: "0.1em" }}>Next steps</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {nextSteps.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBlock: 15, borderTop: "1px solid var(--line)" }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid var(--accent)", flex: "0 0 auto", marginTop: 1 }} />
                <span style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--ink)" }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Human-led note */}
      <div style={{ padding: "16px 18px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", borderRadius: 8 }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--accent-deep)" }}>
          <strong style={{ fontWeight: 600 }}>A starting point, not a verdict.</strong> A senior eye shaped this from your words.
          Every final creative decision — direction, identity, craft — is made by a Spazio designer.
        </p>
      </div>

      {/* CTA */}
      <div style={{ marginTop: "clamp(24px,3vw,34px)", paddingTop: "clamp(22px,3vw,30px)", borderTop: "1px solid var(--line)" }}>
        {sent ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span style={{ fontWeight: 500 }}>Sent to Spazio. A human will reply within 2 business days.</span>
          </div>
        ) : (
          <>
            <p className="display" style={{ fontSize: "clamp(20px,2vw,26px)", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 18 }}>
              Want to move forward with this direction?
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn--primary" style={{ padding: "14px 26px" }} onClick={onSend}>Start project refinement <Arrow /></button>
              <button className="btn btn--ghost" style={{ padding: "14px 22px" }} onClick={onEdit}>Edit my answers</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- SUBSCRIBE FORM ---------------- */
function SubscribeForm({ variant = "page" }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);
  const [done, setDone] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!validEmail(email)) { setErr(true); return; }
    setDone(true);
  };
  if (done) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 22px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", borderRadius: 100 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span style={{ fontWeight: 500 }}>You're subscribed. We'll keep it occasional and worth it.</span>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: variant === "page" ? 520 : "none" }}>
        <input type="email" aria-label="Email address" value={email} onChange={(e) => { setEmail(e.target.value); setErr(false); }} placeholder="you@company.com" className={`input ${err ? "err" : ""}`} style={{ flex: "1 1 240px" }} />
        <button type="submit" className="btn btn--accent" style={{ padding: "14px 26px" }}>Subscribe <Arrow /></button>
      </div>
      {err && <p className="err-msg" style={{ marginTop: 10 }}>Please enter a valid email.</p>}
    </form>
  );
}

Object.assign(window, {
  PROJECT_TYPES, TIMELINES, BUDGETS, STAGE_CTX, validEmail,
  IntakeForm, BriefLoading, BriefResult, BriefBullets, StratCard, SubscribeForm,
});
