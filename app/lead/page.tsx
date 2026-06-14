"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export default function LeadPage() {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    website: "",
    service: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      setState("success");
      setTimeout(() => {
        window.location.href = "/#foundation";
      }, 1400);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Bricolage+Grotesque:wght@400;600;700&family=Space+Mono:wght@400&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        body {
          margin: 0;
          background: #F4F1E9;
          color: #17160F;
          font-family: "Archivo", system-ui, sans-serif;
          font-size: 17px;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }

        .page {
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto 1fr auto;
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px clamp(20px, 5vw, 76px);
          border-bottom: 1px solid #DFD9C9;
        }

        .wordmark {
          font-family: "Bricolage Grotesque", system-ui, sans-serif;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.04em;
          color: #17160F;
          text-decoration: none;
        }

        .back {
          font-family: "Space Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #847F71;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5em;
          transition: color 0.3s ease;
        }
        .back:hover { color: #17160F; }

        .main {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: clamp(40px, 8vw, 96px) clamp(20px, 5vw, 76px);
        }

        .card {
          background: #FBF9F3;
          border: 1px solid #DFD9C9;
          border-radius: 8px;
          padding: clamp(32px, 5vw, 60px);
          width: 100%;
          max-width: 520px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: oklch(0.52 0.115 156);
          margin-bottom: 28px;
        }

        .heading {
          font-family: "Bricolage Grotesque", system-ui, sans-serif;
          font-weight: 600;
          font-size: clamp(28px, 4vw, 40px);
          line-height: 1.05;
          letter-spacing: -0.028em;
          margin: 0 0 10px;
        }

        .sub {
          font-size: 16px;
          color: #514E44;
          margin: 0 0 36px;
          line-height: 1.5;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 18px;
        }

        label {
          font-family: "Space Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #847F71;
        }

        .req { color: oklch(0.52 0.115 156); }

        input, select {
          font-family: "Archivo", system-ui, sans-serif;
          font-size: 16px;
          color: #17160F;
          background: #FFFFFF;
          border: 1px solid #CFC8B5;
          border-radius: 3px;
          padding: 13px 15px;
          width: 100%;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
          letter-spacing: -0.008em;
          appearance: none;
        }

        input::placeholder { color: #ADA897; }

        input:focus, select:focus {
          outline: none;
          border-color: oklch(0.52 0.115 156);
          box-shadow: 0 0 0 4px oklch(0.948 0.028 156);
        }

        .select-wrap {
          position: relative;
        }
        .select-wrap::after {
          content: "";
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid #847F71;
          pointer-events: none;
        }

        select { color: #17160F; cursor: pointer; }
        select option[value=""] { color: #ADA897; }

        .opt-label { font-size: 10px; color: #ADA897; letter-spacing: 0; text-transform: none; }

        .submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6em;
          width: 100%;
          padding: 15px 22px;
          margin-top: 8px;
          border: none;
          border-radius: 100px;
          background: oklch(0.52 0.115 156);
          color: #F8F6EF;
          font-family: "Archivo", system-ui, sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: background 0.3s ease, transform 0.2s ease;
        }
        .submit:hover:not(:disabled) { background: oklch(0.40 0.095 158); }
        .submit:active:not(:disabled) { transform: translateY(1px); }
        .submit:disabled { opacity: 0.6; cursor: default; }

        .error-banner {
          background: #FFF0EE;
          border: 1px solid #C0492E;
          border-radius: 4px;
          padding: 12px 16px;
          font-family: "Space Mono", monospace;
          font-size: 12px;
          color: #B0432B;
          letter-spacing: 0.03em;
          margin-bottom: 18px;
        }

        .success-box {
          text-align: center;
          padding: 24px 0 12px;
        }
        .success-check {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: oklch(0.948 0.028 156);
          border: 1.5px solid oklch(0.825 0.05 157);
          display: inline-grid;
          place-items: center;
          margin-bottom: 18px;
          color: oklch(0.40 0.095 158);
        }
        .success-title {
          font-family: "Bricolage Grotesque", system-ui, sans-serif;
          font-weight: 600;
          font-size: 22px;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }
        .success-note {
          font-size: 15px;
          color: #514E44;
          margin: 0;
        }

        .footer {
          text-align: center;
          padding: 24px;
          font-family: "Space Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #ADA897;
          border-top: 1px solid #DFD9C9;
        }

        @media (max-width: 540px) {
          .card { border: none; background: transparent; padding: 0; }
        }
      `}</style>

      <div className="page">
        <header className="nav">
          <a href="/" className="wordmark">Spazio</a>
          <a href="/" className="back">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Home
          </a>
        </header>

        <main className="main">
          <div className="card">
            <div className="dot" aria-hidden="true" />
            <h1 className="heading">Start a project</h1>
            <p className="sub">Tell us a bit about what you&rsquo;re building and we&rsquo;ll be in touch.</p>

            {state === "success" ? (
              <div className="success-box">
                <div className="success-check" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M5 11.5L9 15.5L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="success-title">Got it — thanks!</p>
                <p className="success-note">Taking you to the next step&hellip;</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {state === "error" && errorMsg && (
                  <div className="error-banner" role="alert">{errorMsg}</div>
                )}

                <div className="field">
                  <label htmlFor="lead-name">
                    Name <span className="req">*</span>
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="lead-email">
                    Email <span className="req">*</span>
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="lead-company">
                    Company <span className="opt-label">(optional)</span>
                  </label>
                  <input
                    id="lead-company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Where do you work?"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="lead-website">
                    Website <span className="opt-label">(optional)</span>
                  </label>
                  <input
                    id="lead-website"
                    type="url"
                    autoComplete="url"
                    placeholder="https://yoursite.com"
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="lead-service">
                    What are you looking for? <span className="opt-label">(optional)</span>
                  </label>
                  <div className="select-wrap">
                    <select
                      id="lead-service"
                      value={form.service}
                      onChange={(e) => set("service", e.target.value)}
                    >
                      <option value="">Pick one&hellip;</option>
                      <option value="Brand Identity">Brand Identity</option>
                      <option value="Website">Website</option>
                      <option value="Digital Product">Digital Product</option>
                      <option value="Marketing System">Marketing System</option>
                      <option value="Full Package">Full Package</option>
                      <option value="Not sure yet">Not sure yet</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit"
                  disabled={state === "loading"}
                >
                  {state === "loading" ? "Sending…" : <>Let's talk <span aria-hidden="true">&rarr;</span></>}
                </button>
              </form>
            )}
          </div>
        </main>

        <footer className="footer">
          &copy; {new Date().getFullYear()} Spazio
        </footer>
      </div>
    </>
  );
}
