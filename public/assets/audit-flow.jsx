/* ============================================================
   SPAZIO — Audit flow: payment gate + book-a-call
   - PaidFoundationGate: verifies the Stripe Checkout session
     (server-side, /api/verify-session) before rendering the
     Foundation intake form. No paid session → gentle gate.
   - BookACall: scheduling embed (SCHEDULER_URL) on confirmation.
   ============================================================ */

const CHECKOUT_HREF = "/api/checkout?tier=brand-gap-audit";

/* Minimal centered frame used by the gate's loading / blocked states. */
function GateFrame({ children }) {
  return (
    <div className="frame" style={{ position: "relative", background: "var(--surface)", padding: "clamp(28px,4vw,56px)" }}>
      <CropMarks color="var(--accent)" />
      <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>{children}</div>
    </div>
  );
}

function PaidFoundationGate() {
  const [status, setStatus] = useState("checking"); // checking | paid | blocked
  const [email, setEmail] = useState("");

  useEffect(function () {
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get("orderId") || params.get("order_id");
    if (!orderId) { setStatus("blocked"); return; }
    var cancelled = false;
    fetch("/api/verify-session?order_id=" + encodeURIComponent(orderId))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (cancelled) return;
        if (d && d.paid) { setEmail((d && d.email) || ""); setStatus("paid"); }
        else setStatus("blocked");
      })
      .catch(function () { if (!cancelled) setStatus("blocked"); });
    return function () { cancelled = true; };
  }, []);

  if (status === "checking") {
    return (
      <GateFrame>
        <p className="label label--accent label-dot" style={{ marginBottom: 16, justifyContent: "center" }}>Brand Gap Audit</p>
        <h2 className="display" style={{ fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 14px" }}>
          Confirming your <em className="grace">payment</em>…
        </h2>
        <p style={{ fontSize: 15.5, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
          One moment while we verify your checkout.
        </p>
      </GateFrame>
    );
  }

  if (status === "paid") {
    return <FoundationForm prefillEmail={email} onSuccess={function () { window.location.hash = "brief-ready"; }} />;
  }

  // blocked — no paid session on this visit
  return (
    <GateFrame>
      <p className="label label--accent label-dot" style={{ marginBottom: 16, justifyContent: "center" }}>Brand Gap Audit</p>
      <h2 className="display" style={{ fontSize: "clamp(28px,3.6vw,44px)", fontWeight: 600, letterSpacing: "-0.028em", lineHeight: 1.02, margin: "0 0 16px" }}>
        Start with the <em className="grace">audit</em>.
      </h2>
      <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: "42ch", margin: "0 auto 28px" }}>
        The Foundation intake opens once your Brand Gap Audit is booked — $750, credited toward your engagement.
        It's the fastest way to see exactly where your brand lags your product.
      </p>
      <a href={CHECKOUT_HREF} className="btn btn--primary" style={{ padding: "15px 28px" }}>
        Start with a Brand Gap Audit — $750 <Arrow />
      </a>
    </GateFrame>
  );
}

/* Scheduling embed for the confirmation state. Inline iframe when
   SCHEDULER_URL is configured (Cal.com / Calendly both embed via URL),
   with an open-in-new-tab fallback. Renders nothing until configured. */
function BookACall() {
  var url = (typeof window !== "undefined" && window.SPAZIO_SCHEDULER_URL) || "";
  if (!url) return null;
  return (
    <div style={{ marginTop: 36, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <p className="label label--accent label-dot" style={{ margin: 0 }}>Book a call</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="txtlink">
          Open in a new tab <Arrow />
        </a>
      </div>
      <iframe
        src={url}
        title="Book a call with Spazio"
        loading="lazy"
        style={{ width: "100%", minHeight: 640, border: "1px solid var(--line)", borderRadius: 4, background: "var(--bg)" }}
      />
    </div>
  );
}

Object.assign(window, { PaidFoundationGate, BookACall, GateFrame });
