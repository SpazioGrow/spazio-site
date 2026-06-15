/* ============================================================
   SPAZIO — Brief Review Modal
   Shows the generated brand brief HTML.
   "Send to Client" → POST /api/approve-brief
   "Reject & Try Again" → closes modal
   ============================================================ */

function BriefReviewModal({ briefHTML, reportId, onClose, onReject }) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveError, setApproveError] = useState(null);

  const sendToClient = async () => {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch("/api/approve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not approve brief.");
      setApproved(true);
    } catch (err) {
      setApproveError(err.message || "Something went wrong.");
    }
    setApproving(false);
  };

  const openInTab = () => {
    const blob = new Blob([briefHTML], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  };

  /* Lock body scroll while modal open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(23,22,15,0.72)", backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
      padding: "0 0 0 0",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 1100, background: "var(--surface)", borderRadius: "12px 12px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column",
        maxHeight: "92vh", overflow: "hidden",
      }}>
        {/* header bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: "1px solid var(--line)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="tag tag-dot tag--accent">Brief preview</span>
            {approved && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent-deep)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                ✓ Sent to client
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn--ghost" style={{ padding: "9px 16px", fontSize: 13 }} onClick={openInTab}>
              Open full page
            </button>
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 22, lineHeight: 1, padding: "0 4px" }} aria-label="Close">×</button>
          </div>
        </div>

        {/* brief iframe */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
          <iframe
            srcDoc={briefHTML}
            title="Brand Intelligence Report"
            style={{ width: "100%", height: "100%", minHeight: 520, border: "none", display: "block" }}
            sandbox="allow-same-origin"
          />
        </div>

        {/* action bar */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid var(--line)", flexShrink: 0,
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          background: "var(--bg)",
        }}>
          {approveError && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#B0432B", flexBasis: "100%", marginBottom: 4 }}>
              {approveError}
            </span>
          )}
          {approved ? (
            <>
              <span style={{ fontSize: 15, color: "var(--accent-deep)", fontWeight: 600 }}>
                Brief approved and marked complete.
              </span>
              <button className="btn btn--ghost" style={{ padding: "11px 20px", marginLeft: "auto" }} onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--accent" style={{ padding: "13px 24px", opacity: approving ? 0.7 : 1 }}
                onClick={sendToClient} disabled={approving}>
                {approving ? "Sending…" : "Send to Client"}
              </button>
              <button className="btn btn--ghost" style={{ padding: "13px 20px" }} onClick={onReject}>
                Reject &amp; Try Again
              </button>
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.04em" }}>
                Approve to mark status Complete in Airtable
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BriefReviewModal });
