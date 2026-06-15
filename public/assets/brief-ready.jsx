/* ============================================================
   SPAZIO — Brief Ready (post-foundation landing)
   Shows after foundation form submit. "Generate Brief" button
   calls /api/brief → loading → BriefReviewModal.
   ============================================================ */

function BriefReadyPage() {
  const [state, setState] = useState("idle"); // idle | generating | reviewing | approved | error
  const [briefHTML, setBriefHTML] = useState("");
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);

  const reportData = window.__spazioReport || {};

  const generate = async () => {
    if (!reportData.reportId) {
      setError("No report found. Please fill out the foundation form first.");
      setState("error");
      return;
    }
    setState("generating");
    setError("");
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: reportData.reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Brief generation failed");
      setBriefHTML(data.briefHTML);
      setState("reviewing");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setState("error");
    }
  };

  const approve = async () => {
    setApproving(true);
    try {
      const res = await fetch("/api/approve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: reportData.reportId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Approval failed");
      }
      setState("approved");
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const reject = () => {
    setState("idle");
    setBriefHTML("");
  };

  if (state === "approved") {
    return (
      <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(32px,4vw,56px)", textAlign: "center" }}>
        <CropMarks color="var(--accent)" />
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-soft)", border: "2px solid var(--accent-line)",
            display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="var(--accent-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="display" style={{ fontSize: "clamp(28px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, marginBottom: 16 }}>
            Brief <em className="grace">approved</em>.
          </h2>
          <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 32 }}>
            The report has been marked complete in our system. A Spazio designer will begin creative development.
          </p>
          <button className="btn btn--primary" style={{ padding: "14px 28px" }}
            onClick={() => { window.location.hash = "home"; }}>
            Back to home <Arrow />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(32px,4vw,56px)" }}>
        <CropMarks color="var(--accent)" />

        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <span className="tag tag-dot tag--accent" style={{ marginBottom: 24, display: "inline-flex" }}>Foundation complete</span>

          <h2 className="display" style={{ fontSize: "clamp(30px,4vw,52px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1, margin: "24px 0 18px" }}>
            Ready to generate your <em className="grace">brief</em>.
          </h2>

          <p style={{ fontSize: 16.5, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: "42ch", margin: "0 auto 36px" }}>
            Our system will research your market, analyze your positioning, and build a strategic brand intelligence report.
          </p>

          {/* Pipeline preview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 36, textAlign: "left" }}>
            {[
              ["Research", "Market signals and trends"],
              ["Strategy", "Positioning and direction"],
              ["Brief", "3-page report for review"],
            ].map(([t, d], i) => (
              <div key={t} style={{ padding: "16px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-deep)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p style={{ margin: "6px 0 2px", fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.02em" }}>{t}</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.4 }}>{d}</p>
              </div>
            ))}
          </div>

          {state === "generating" && (
            <div style={{ marginBottom: 28 }}>
              <div className="brief-dot" style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", margin: "0 auto 16px" }} />
              <p style={{ fontSize: 15, color: "var(--ink-2)" }}>Researching and building your brief…</p>
              <p style={{ fontSize: 13, color: "var(--ink-4)", marginTop: 4 }}>This takes 15–30 seconds</p>
            </div>
          )}

          {state === "error" && (
            <div style={{ marginBottom: 28, padding: "14px 18px", background: "#FDF2F0", border: "1px solid #E8C4BD", borderRadius: 4, textAlign: "left" }}>
              <span className="err-msg">{error}</span>
            </div>
          )}

          {(state === "idle" || state === "error") && (
            <button className="btn btn--accent" style={{ padding: "16px 36px", fontSize: 16 }} onClick={generate}>
              Generate brief <Arrow />
            </button>
          )}

          {!reportData.reportId && (state === "idle") && (
            <p style={{ marginTop: 20, fontSize: 14, color: "var(--ink-3)" }}>
              No intake data found. <a href="#foundation" style={{ color: "var(--accent-deep)", borderBottom: "1px solid var(--accent-line)" }}>Fill out the form first</a>.
            </p>
          )}
        </div>
      </div>

      {/* Review modal */}
      {state === "reviewing" && briefHTML && (
        <BriefReviewModal
          briefHTML={briefHTML}
          onApprove={approve}
          onReject={reject}
          approving={approving}
        />
      )}
    </div>
  );
}

Object.assign(window, { BriefReadyPage });
