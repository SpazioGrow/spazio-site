/* ============================================================
   SPAZIO — Lead capture modal
   Port of the Next component app/components/LeadCaptureForm.tsx into
   the in-browser SPA runtime (this page has no bundler, so the .tsx
   cannot be imported directly). Same fields, states, and branding.

   Flow: a "Start a project" button calls openLead() -> modal opens with
   the form -> on submit it posts to /api/lead -> on success the modal
   shows a confirmation, then closes and sends the visitor to
   #foundation (the brief questionnaire).

   Wiring: <LeadModalProvider> is mounted at the app root (app.jsx).
   Any component can open it with:  const { openLead } = useLeadModal();
   ============================================================ */

const SERVICE_OPTIONS = ["Brand Identity", "Packaging System", "Brand World Build"];

const LeadModalCtx = React.createContext({
  isOpen: false,
  openLead: () => {},
  closeLead: () => {},
});
const useLeadModal = () => React.useContext(LeadModalCtx);

const LEAD_EMPTY = { name: "", email: "", company: "", website: "", service: "" };
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ---------------- the form ---------------- */
function LeadCaptureForm({ onDone }) {
  const [form, setForm] = React.useState(LEAD_EMPTY);
  const [status, setStatus] = React.useState("idle"); // idle | submitting | success | error
  const [error, setError] = React.useState("");
  const doneTimer = React.useRef(null);

  React.useEffect(() => () => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
  }, []);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitting = status === "submitting";
  const succeeded = status === "success";

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || succeeded) return; // guard double submit

    const name = form.name.trim();
    const email = form.email.trim();
    const company = form.company.trim();
    if (!name || !email || !company || !form.service) {
      setStatus("error");
      setError("Please fill in name, email, company, and service.");
      return;
    }
    if (!isEmail(email)) {
      setStatus("error");
      setError("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          website: form.website.trim(),
          service: form.service,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      // Show the confirmation briefly, then close + go to the questionnaire.
      doneTimer.current = setTimeout(() => {
        if (onDone) onDone();
        window.location.hash = "#foundation";
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="spazio-lead">
      <div className="spazio-lead__card">
        <span className="spazio-lead__dot" aria-hidden="true" />

        <header className="spazio-lead__header">
          <p className="spazio-lead__eyebrow">Start a Project</p>
          <h2 className="spazio-lead__title">Let&rsquo;s build something with space to grow.</h2>
        </header>

        <form className="spazio-lead__form" onSubmit={handleSubmit} noValidate>
          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-name">Name</label>
            <input id="lead-name" className="spazio-lead__input" type="text" name="name"
              value={form.name} onChange={update("name")} autoComplete="name"
              required disabled={submitting || succeeded} />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-email">Email</label>
            <input id="lead-email" className="spazio-lead__input" type="email" name="email"
              value={form.email} onChange={update("email")} autoComplete="email"
              required disabled={submitting || succeeded} />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-company">Company</label>
            <input id="lead-company" className="spazio-lead__input" type="text" name="company"
              value={form.company} onChange={update("company")} autoComplete="organization"
              required disabled={submitting || succeeded} />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-website">
              Website <span className="spazio-lead__optional">(optional)</span>
            </label>
            <input id="lead-website" className="spazio-lead__input" type="url" name="website"
              value={form.website} onChange={update("website")} autoComplete="url"
              placeholder="https://" disabled={submitting || succeeded} />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-service">Service</label>
            <select id="lead-service" className="spazio-lead__input spazio-lead__select" name="service"
              value={form.service} onChange={update("service")} required
              disabled={submitting || succeeded}>
              <option value="" disabled>Select a service&hellip;</option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <button className="spazio-lead__submit" type="submit"
            disabled={submitting || succeeded} aria-busy={submitting}>
            {submitting && <span className="spazio-lead__spinner" aria-hidden="true" />}
            <span>{submitting ? "Sending…" : "Start the conversation"}</span>
          </button>

          {succeeded && (
            <p className="spazio-lead__success" role="status">
              Thanks &mdash; we&rsquo;ve got it. Taking you to what&rsquo;s next&hellip;
            </p>
          )}

          {status === "error" && error && (
            <p className="spazio-lead__error" role="alert">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}

/* ---------------- modal shell ---------------- */
function LeadModal() {
  const { isOpen, closeLead } = useLeadModal();

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeLead(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog.
    const t = setTimeout(() => {
      const el = document.getElementById("lead-name");
      if (el) el.focus();
    }, 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [isOpen, closeLead]);

  if (!isOpen) return null;

  return (
    <div className="slm-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget) closeLead();
    }}>
      <div className="slm-dialog" role="dialog" aria-modal="true" aria-label="Start a project">
        <button type="button" className="slm-close" aria-label="Close" onClick={closeLead}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <LeadCaptureForm onDone={closeLead} />
      </div>
    </div>
  );
}

/* ---------------- provider ---------------- */
function LeadModalProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const openLead = React.useCallback(() => setIsOpen(true), []);
  const closeLead = React.useCallback(() => setIsOpen(false), []);

  // Inject the form + modal styles once.
  React.useEffect(() => {
    if (document.getElementById("slm-styles")) return;
    const el = document.createElement("style");
    el.id = "slm-styles";
    el.textContent = LEAD_MODAL_STYLES;
    document.head.appendChild(el);
  }, []);

  return (
    <LeadModalCtx.Provider value={{ isOpen, openLead, closeLead }}>
      {children}
      <LeadModal />
    </LeadModalCtx.Provider>
  );
}

const LEAD_MODAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap');

/* ---- modal chrome ---- */
.slm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 32px 16px;
  background: rgba(20, 26, 17, 0.55);
  backdrop-filter: blur(4px);
  animation: slm-fade 0.2s ease;
}
.slm-dialog {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: auto;
  animation: slm-rise 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
.slm-close {
  position: absolute;
  top: -14px;
  right: -14px;
  z-index: 1;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(28, 36, 24, 0.14);
  background: #fff;
  color: #1C2418;
  cursor: pointer;
  box-shadow: 0 6px 18px -8px rgba(28, 36, 24, 0.4);
  transition: transform 0.12s ease;
}
.slm-close:hover { transform: scale(1.06); }
.slm-close:focus-visible { outline: 2px solid #ADE514; outline-offset: 2px; }

@keyframes slm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes slm-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

/* ---- form (ported from LeadCaptureForm.tsx) ---- */
.spazio-lead {
  --lime: #ADE514;
  --ink: #1C2418;
  --cream: #FBF9F3;
  --line: rgba(28, 36, 24, 0.14);
  --muted: rgba(28, 36, 24, 0.55);
  --sans: 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --display: 'Fraunces', Georgia, 'Times New Roman', serif;
  font-family: var(--sans);
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}
.spazio-lead *, .spazio-lead *::before, .spazio-lead *::after { box-sizing: border-box; }
.spazio-lead__card {
  position: relative;
  width: 100%;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow: 0 24px 60px -32px rgba(28, 36, 24, 0.35);
}
.spazio-lead__dot {
  position: absolute;
  top: 28px;
  right: 32px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--lime);
  box-shadow: 0 0 0 6px rgba(173, 229, 20, 0.18);
  animation: spazio-float 4s ease-in-out infinite;
}
@keyframes spazio-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.spazio-lead__header { margin-bottom: 28px; }
.spazio-lead__eyebrow {
  margin: 0 0 10px;
  font-family: var(--display);
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink);
}
.spazio-lead__title {
  margin: 0;
  font-family: var(--display);
  font-weight: 500;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.spazio-lead__form { display: flex; flex-direction: column; gap: 18px; }
.spazio-lead__field { display: flex; flex-direction: column; gap: 7px; }
.spazio-lead__label {
  font-family: var(--display);
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--ink);
}
.spazio-lead__optional { font-family: var(--sans); font-weight: 400; font-size: 12px; color: var(--muted); }
.spazio-lead__input {
  width: 100%;
  font-family: var(--sans);
  font-size: 15px;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  appearance: none;
}
.spazio-lead__input::placeholder { color: rgba(28, 36, 24, 0.4); }
.spazio-lead__input:focus { outline: none; border-color: var(--lime); box-shadow: 0 0 0 3px rgba(173, 229, 20, 0.35); }
.spazio-lead__input:disabled { opacity: 0.6; cursor: not-allowed; }
.spazio-lead__select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231C2418' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 38px;
  cursor: pointer;
}
.spazio-lead__submit {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 15px;
  color: var(--ink);
  background: var(--lime);
  border: none;
  border-radius: 10px;
  padding: 14px 20px;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.spazio-lead__submit:hover:not(:disabled) { box-shadow: 0 10px 24px -10px rgba(173, 229, 20, 0.9); transform: translateY(-1px); }
.spazio-lead__submit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.spazio-lead__submit:disabled { cursor: not-allowed; opacity: 0.7; }
.spazio-lead__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(28, 36, 24, 0.25);
  border-top-color: var(--ink);
  animation: spazio-spin 0.7s linear infinite;
}
@keyframes spazio-spin { to { transform: rotate(360deg); } }
.spazio-lead__success { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: #2F7A12; }
.spazio-lead__error { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: #C0331F; }

@media (max-width: 480px) {
  .slm-backdrop { padding: 16px 12px; }
  .slm-close { top: 6px; right: 6px; }
  .spazio-lead__card { padding: 34px 22px; border-radius: 16px; }
  .spazio-lead__title { font-size: 24px; }
  .spazio-lead__dot { top: 22px; right: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .slm-backdrop, .slm-dialog, .spazio-lead__dot, .spazio-lead__spinner, .spazio-lead__submit, .slm-close {
    animation: none;
    transition: none;
  }
}
`;

Object.assign(window, {
  LeadModalCtx, useLeadModal, LeadCaptureForm, LeadModal, LeadModalProvider,
});
