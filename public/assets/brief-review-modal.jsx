/* ============================================================
   SPAZIO — Brief Review Modal
   Shows generated brief HTML with approve/reject actions.
   ============================================================ */

function BriefReviewModal({ briefHTML, onApprove, onReject, approving }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(23,22,15,0.55)", backdropFilter: "blur(4px)",
    }}
    onClick={(e) => { if (e.target === e.currentTarget && !approving) onReject(); }}>
      <div className="modal-in" style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: 6, width: "min(90vw, 860px)", maxHeight: "85vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 28px", borderBottom: "1px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <span className="tag tag--accent" style={{ letterSpacing: "0.12em" }}>Brand Intelligence Report</span>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-3)" }}>Review before sending to client</p>
          </div>
          <button type="button" onClick={onReject} disabled={approving}
            style={{ border: "none", background: "none", fontSize: 22, color: "var(--ink-3)", cursor: "pointer", padding: "4px 8px" }}>
            ×
          </button>
        </div>

        {/* Brief content */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px" }}>
          <div dangerouslySetInnerHTML={{ __html: briefHTML }} />
        </div>

        {/* Actions */}
        <div style={{
          padding: "20px 28px", borderTop: "1px solid var(--line)",
          display: "flex", gap: 14, justifyContent: "flex-end", alignItems: "center",
        }}>
          <button type="button" className="btn btn--ghost" onClick={onReject}
            disabled={approving} style={{ padding: "12px 20px" }}>
            Reject &amp; try again
          </button>
          <button type="button" className="btn btn--accent" onClick={onApprove}
            disabled={approving} style={{ padding: "12px 24px", opacity: approving ? 0.6 : 1 }}>
            {approving ? "Sending…" : "Send to client"}
            {!approving && <Arrow />}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BriefReviewModal });
