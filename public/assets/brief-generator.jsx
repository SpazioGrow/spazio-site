/* ============================================================
   SPAZIO — Brief Generator
   Reads reportId from sessionStorage, calls /api/brief,
   then shows BriefReviewModal for review and approval.
   ============================================================ */

function BriefGenerator() {
  const { navigate } = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [briefHTML, setBriefHTML] = useState(null);
  const [reportId] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem("spazio_report_id") : null
  );

  const generateBrief = async () => {
    if (!reportId) {
      setGenError("No report found — please complete the foundation form first.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Brief generation failed.");
      setBriefHTML(data.html || data.briefHTML);
    } catch (err) {
      setGenError(err.message || "Something went wrong. Please try again.");
    }
    setGenerating(false);
  };

  const handleReject = () => {
    setBriefHTML(null);
  };

  const handleClose = () => {
    setBriefHTML(null);
  };

  return (
    <>
      <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(32px,4.5vw,60px)" }}>
        <CropMarks color="var(--accent)" />

        <div style={{ maxWidth: 560 }}>
          <span className="tag tag-dot tag--accent" style={{ marginBottom: 24, display: "inline-block" }}>Brief ready</span>
          <h2 className="display" style={{ fontSize: "clamp(34px,4.8vw,64px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 0.98, marginBottom: 20 }}>
            Your brief is <em className="grace">in the studio</em>.
          </h2>
          <p style={{ fontSize: "clamp(16px,1.5vw,18px)", lineHeight: 1.6, color: "var(--ink-2)", maxWidth: "44ch", marginBottom: 36 }}>
            We've structured your vision. Click below and our creative intelligence will generate a full 3-page Brand Intelligence Report — reviewed by a Spazio designer before it reaches your client.
          </p>

          {genError && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "#FFF0EE", border: "1px solid #C0492E", borderRadius: 6,
              fontFamily: "var(--mono)", fontSize: 12, color: "#B0432B", letterSpacing: "0.03em" }}>
              {genError}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn--accent" style={{ padding: "15px 30px", fontSize: 16, opacity: generating ? 0.7 : 1 }}
              onClick={generateBrief} disabled={generating}>
              {generating
                ? <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 8, animation: "pulse 1s ease-in-out infinite" }} />Generating…</>
                : <>Generate brief <Arrow /></>}
            </button>
            <button className="btn btn--ghost" style={{ padding: "15px 22px" }} onClick={() => navigate("foundation")}>
              Edit brief
            </button>
            <button className="txtlink" style={{ border: 0, background: "none" }} onClick={() => navigate("home")}>
              Back to home
            </button>
          </div>

          {generating && (
            <p style={{ marginTop: 20, fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
              Researching your market and building your strategy — this takes about 30 seconds…
            </p>
          )}
        </div>
      </div>

      {briefHTML && (
        <BriefReviewModal
          briefHTML={briefHTML}
          reportId={reportId}
          onClose={handleClose}
          onReject={handleReject}
        />
      )}
    </>
  );
}

Object.assign(window, { BriefGenerator });
