import type { Metadata } from "next";
import LeadCaptureForm from "../components/LeadCaptureForm";

export const metadata: Metadata = {
  title: "Start a Project — Spazio",
  description:
    "Tell us about your brand. We'll reach out to explore how we can work together.",
};

export default function LeadPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F4F1E9",
        padding: "40px 20px",
      }}
    >
      <LeadCaptureForm />
    </main>
  );
}
