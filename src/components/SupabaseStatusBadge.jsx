import { useState } from "react";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function SupabaseStatusBadge() {
  const [showModal, setShowModal] = useState(false);
  const configured = isSupabaseConfigured();

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        style={{
          position: "absolute",
          top: 14,
          left: 60,
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(4px)",
          border: `1px solid ${configured ? "#10b981" : "#f59e0b"}`,
          borderRadius: 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: "#1e293b",
          transition: "all 0.2s ease",
        }}
        title="Click to view Supabase connection details & setup SQL script"
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: configured ? "#10b981" : "#f59e0b",
            boxShadow: `0 0 0 2px ${configured ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
          }}
        />
        <span>{configured ? "Supabase Cloud Connected" : "Local Storage Mode (Setup Supabase)"}</span>
        <span style={{ fontSize: 10, color: "#64748b", marginLeft: 2 }}>ℹ</span>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                ⚡ Supabase Backend Integration Status
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  border: 0,
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: configured ? "#ecfdf5" : "#fffbeb",
                border: `1px solid ${configured ? "#a7f3d0" : "#fef3c7"}`,
                color: configured ? "#065f46" : "#92400e",
                fontSize: 13,
              }}
            >
              {configured ? (
                <div>
                  <strong>Status: Connected to Supabase Cloud</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Civic reports, photo uploads, and live status changes are synced directly to your cloud PostgreSQL database in real time.
                  </p>
                </div>
              ) : (
                <div>
                  <strong>Status: Operating in Local Storage Mode</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                    The platform is fully functional using client-side caching. To connect to your production Supabase database, follow the steps below.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#334155" }}>
                How to Connect your Supabase Project:
              </h4>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                <li>
                  Open the SQL Editor in your{" "}
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                    Supabase Dashboard
                  </a>.
                </li>
                <li>
                  Run the SQL migration script included at:{" "}
                  <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                    supabase/schema.sql
                  </code>
                </li>
                <li>
                  Create a public Storage bucket named <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>report-photos</code> in Supabase Storage.
                </li>
                <li>
                  Add your credentials to <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>.env</code> file in your project root:
                </li>
              </ol>

              <pre
                style={{
                  margin: "12px 0 0",
                  padding: 12,
                  background: "#0f172a",
                  color: "#38bdf8",
                  borderRadius: 8,
                  fontSize: 12,
                  overflowX: "auto",
                }}
              >
                {`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
              </pre>
            </div>

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
