/* ============================================================
   SPAZIO — Client Review Page
   Client receives link: spaziographics.com/#review=recXXX
   ============================================================ */

function ClientReviewPage(props) {
  var reportId = props.reportId || "";
  var stateHook = useState("loading");
  var state = stateHook[0]; var setState = stateHook[1];
  var briefHook = useState("");
  var briefHTML = briefHook[0]; var setBriefHTML = briefHook[1];
  var errorHook = useState("");
  var error = errorHook[0]; var setError = errorHook[1];
  var fbHook = useState("");
  var feedback = fbHook[0]; var setFeedback = fbHook[1];
  var subHook = useState(false);
  var submitting = subHook[0]; var setSubmitting = subHook[1];

  useEffect(function() {
    if (!reportId) { setError("No report ID provided."); setState("error"); return; }
    fetch("/api/review?id=" + reportId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.ok) { setError(data.error || "Could not load brief."); setState("error"); return; }
        setBriefHTML(data.briefHTML);
        if (data.status === "Client Approved") setState("approved");
        else setState("ready");
      })
      .catch(function() { setError("Could not reach server."); setState("error"); });
  }, []);

  var doAction = function(action) {
    setSubmitting(true);
    fetch("/api/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId, action: action, feedback: feedback }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) setState(action === "approve" ? "approved" : "changes");
      else setError(data.error || "Something went wrong.");
    })
    .catch(function() { setError("Could not reach server."); })
    .finally(function() { setSubmitting(false); });
  };

  if (state === "loading") return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(40px,5vw,64px)", textAlign: "center" }}>
      <CropMarks color="var(--accent)" />
      <p style={{ fontSize: 16, color: "var(--ink-3)" }}>Loading your brief...</p>
    </div>
  );
  if (state === "error") return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(40px,5vw,64px)", textAlign: "center" }}>
      <CropMarks color="var(--accent)" />
      <p style={{ fontSize: 16, color: "#9C4234" }}>{error}</p>
    </div>
  );
  if (state === "approved") return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(40px,5vw,64px)", textAlign: "center" }}>
      <CropMarks color="var(--accent)" />
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-soft)", border: "2px solid var(--accent-line)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--accent-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="display" style={{ fontSize: "clamp(28px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, marginBottom: 16 }}>Brief <em className="grace">approved</em>.</h2>
        <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.55 }}>Thank you! Your Spazio designer will begin creative development. We'll be in touch soon with visual directions.</p>
      </div>
    </div>
  );
  if (state === "changes") return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(40px,5vw,64px)", textAlign: "center" }}>
      <CropMarks color="var(--accent)" />
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2 className="display" style={{ fontSize: "clamp(28px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, marginBottom: 16 }}>Feedback <em className="grace">received</em>.</h2>
        <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.55 }}>We'll revise your brief and send an updated version shortly.</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(24px,3.5vw,48px)" }}>
        <CropMarks color="var(--accent)" />
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <span className="tag tag-dot tag--accent" style={{ display: "inline-flex" }}>Your Brand Intelligence Report</span>
          <div style={{ marginTop: 14 }}>
            <a href={"/api/export-deck?id=" + reportId} className="btn btn--ghost" style={{ padding: "10px 20px", fontSize: 13, textDecoration: "none" }}>
              Download as deck (.pptx)
            </a>
          </div>
        </div>
        <div dangerouslySetInnerHTML={{ __html: briefHTML }} />
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--ink)" }}>What do you think?</p>
            <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              <button className="btn btn--accent" style={{ padding: "14px 28px", flex: 1, opacity: submitting ? 0.6 : 1 }}
                disabled={submitting} onClick={function() { doAction("approve"); }}>
                {submitting ? "Sending..." : "Approve — let's go"} {!submitting && <Arrow />}
              </button>
            </div>
            <div style={{ padding: "20px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 4 }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink-2)" }}>Want changes? Tell us what to adjust:</p>
              <textarea className="textarea" value={feedback} onChange={function(e) { setFeedback(e.target.value); }}
                placeholder="e.g. The positioning feels too broad — we're specifically targeting..."
                style={{ minHeight: 80, marginBottom: 12 }} />
              <button className="btn btn--ghost" style={{ padding: "11px 20px", opacity: submitting ? 0.6 : 1 }}
                disabled={submitting || !feedback.trim()} onClick={function() { doAction("changes"); }}>
                Request changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { ClientReviewPage });
