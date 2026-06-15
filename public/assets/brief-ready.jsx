/* ============================================================
   SPAZIO — Thank You (post-foundation)
   Client sees this after submitting. Brief generates in background.
   ============================================================ */

function BriefReadyPage() {
  return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(32px,4vw,56px)", textAlign: "center" }}>
      <CropMarks color="var(--accent)" />
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-soft)", border: "2px solid var(--accent-line)",
          display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="var(--accent-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="display" style={{ fontSize: "clamp(30px,4vw,52px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1, margin: "0 0 18px" }}>
          We're on <em className="grace">it</em>.
        </h2>
        <p style={{ fontSize: 17, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: "38ch", margin: "0 auto 12px" }}>
          Your brand intelligence report is being prepared. A Spazio strategist will review it and reach out within 24 hours with your personalized brief.
        </p>
        <div style={{ marginTop: 36, padding: "20px 24px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4, textAlign: "left" }}>
          <p style={{ margin: "0 0 8px", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-deep)" }}>What happens next</p>
          <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--ink)" }}>1.</strong> We research your market, competitors, and positioning.
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--ink)" }}>2.</strong> A strategist reviews the findings and shapes your brief.
          </p>
          <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--ink)" }}>3.</strong> You'll receive a link to review and approve your brief.
          </p>
        </div>
        <button className="btn btn--ghost" style={{ marginTop: 32, padding: "14px 28px" }}
          onClick={function() { window.location.hash = "home"; }}>
          Back to home
        </button>
      </div>
    </div>
  );
}
Object.assign(window, { BriefReadyPage });
