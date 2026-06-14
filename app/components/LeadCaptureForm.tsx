"use client";

/**
 * LeadCaptureForm — Spazio "Start a Project" lead form.
 *
 * Drop-in client component. Posts to the /api/lead route handler, which
 * forwards the submission to Airtable server-side.
 *
 * Usage:
 *
 *   // app/page.tsx (or any Server/Client Component)
 *   import LeadCaptureForm from "./components/LeadCaptureForm";
 *
 *   export default function Page() {
 *     return (
 *       <main>
 *         <section id="start">
 *           <LeadCaptureForm />
 *         </section>
 *         <section id="foundation">…</section>
 *       </main>
 *     );
 *   }
 *
 * On a successful submit it shows a success message for 2s, then jumps to
 * the "#foundation" anchor. Fonts (DM Sans + Fraunces) are loaded by the
 * component itself, so it works without any page-level setup.
 */

import { useEffect, useRef, useState } from "react";

const SERVICE_OPTIONS = [
  "Brand Identity",
  "Packaging System",
  "Brand World Build",
] as const;

type Status = "idle" | "submitting" | "success" | "error";

type FormState = {
  name: string;
  email: string;
  company: string;
  website: string;
  service: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  company: "",
  website: "",
  service: "",
};

export default function LeadCaptureForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending redirect timer if the component unmounts.
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  function update(field: keyof FormState) {
    return (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Guard against double submits.
    if (status === "submitting" || status === "success") return;

    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data: { ok?: boolean; error?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong. Please try again.",
        );
      }

      setStatus("success");
      redirectTimer.current = setTimeout(() => {
        window.location.hash = "#foundation";
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  const submitting = status === "submitting";
  const succeeded = status === "success";

  return (
    <div className="spazio-lead">
      <style>{STYLES}</style>

      <div className="spazio-lead__card">
        <span className="spazio-lead__dot" aria-hidden="true" />

        <header className="spazio-lead__header">
          <p className="spazio-lead__eyebrow">Start a Project</p>
          <h2 className="spazio-lead__title">
            Let&rsquo;s build something with space to grow.
          </h2>
        </header>

        <form className="spazio-lead__form" onSubmit={handleSubmit} noValidate>
          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-name">
              Name
            </label>
            <input
              id="lead-name"
              className="spazio-lead__input"
              type="text"
              name="name"
              value={form.name}
              onChange={update("name")}
              autoComplete="name"
              required
              disabled={submitting || succeeded}
            />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-email">
              Email
            </label>
            <input
              id="lead-email"
              className="spazio-lead__input"
              type="email"
              name="email"
              value={form.email}
              onChange={update("email")}
              autoComplete="email"
              required
              disabled={submitting || succeeded}
            />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-company">
              Company
            </label>
            <input
              id="lead-company"
              className="spazio-lead__input"
              type="text"
              name="company"
              value={form.company}
              onChange={update("company")}
              autoComplete="organization"
              required
              disabled={submitting || succeeded}
            />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-website">
              Website <span className="spazio-lead__optional">(optional)</span>
            </label>
            <input
              id="lead-website"
              className="spazio-lead__input"
              type="url"
              name="website"
              value={form.website}
              onChange={update("website")}
              autoComplete="url"
              placeholder="https://"
              disabled={submitting || succeeded}
            />
          </div>

          <div className="spazio-lead__field">
            <label className="spazio-lead__label" htmlFor="lead-service">
              Service
            </label>
            <select
              id="lead-service"
              className="spazio-lead__input spazio-lead__select"
              name="service"
              value={form.service}
              onChange={update("service")}
              required
              disabled={submitting || succeeded}
            >
              <option value="" disabled>
                Select a service&hellip;
              </option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            className="spazio-lead__submit"
            type="submit"
            disabled={submitting || succeeded}
            aria-busy={submitting}
          >
            {submitting && <span className="spazio-lead__spinner" aria-hidden="true" />}
            <span>{submitting ? "Sending…" : "Start the conversation"}</span>
          </button>

          {succeeded && (
            <p className="spazio-lead__success" role="status">
              Thanks &mdash; we&rsquo;ve got it. Taking you to what&rsquo;s next&hellip;
            </p>
          )}

          {status === "error" && error && (
            <p className="spazio-lead__error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap');

.spazio-lead {
  --lime: #ADE514;
  --ink: #1C2418;
  --cream: #FBF9F3;
  --cream-2: #F4F1E9;
  --line: rgba(28, 36, 24, 0.14);
  --muted: rgba(28, 36, 24, 0.55);
  --sans: 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --display: 'Fraunces', Georgia, 'Times New Roman', serif;

  font-family: var(--sans);
  color: var(--ink);
  display: flex;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  padding: 32px 20px;
  background: var(--cream-2);
}

.spazio-lead *,
.spazio-lead *::before,
.spazio-lead *::after {
  box-sizing: border-box;
}

.spazio-lead__card {
  position: relative;
  width: 100%;
  max-width: 480px;
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

@keyframes spazio-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.spazio-lead__header {
  margin-bottom: 28px;
}

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

.spazio-lead__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.spazio-lead__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.spazio-lead__label {
  font-family: var(--display);
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.01em;
  color: var(--ink);
}

.spazio-lead__optional {
  font-family: var(--sans);
  font-weight: 400;
  font-size: 12px;
  color: var(--muted);
}

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

.spazio-lead__input::placeholder {
  color: rgba(28, 36, 24, 0.4);
}

.spazio-lead__input:focus {
  outline: none;
  border-color: var(--lime);
  box-shadow: 0 0 0 3px rgba(173, 229, 20, 0.35);
}

.spazio-lead__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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

.spazio-lead__submit:hover:not(:disabled) {
  box-shadow: 0 10px 24px -10px rgba(173, 229, 20, 0.9);
  transform: translateY(-1px);
}

.spazio-lead__submit:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.spazio-lead__submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.spazio-lead__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(28, 36, 24, 0.25);
  border-top-color: var(--ink);
  animation: spazio-spin 0.7s linear infinite;
}

@keyframes spazio-spin {
  to { transform: rotate(360deg); }
}

.spazio-lead__success {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: #2F7A12;
}

.spazio-lead__error {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: #C0331F;
}

@media (max-width: 480px) {
  .spazio-lead {
    padding: 20px 14px;
  }
  .spazio-lead__card {
    padding: 32px 22px;
    border-radius: 16px;
  }
  .spazio-lead__title {
    font-size: 24px;
  }
  .spazio-lead__dot {
    top: 22px;
    right: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spazio-lead__dot,
  .spazio-lead__spinner,
  .spazio-lead__submit {
    animation: none;
    transition: none;
  }
}
`;
