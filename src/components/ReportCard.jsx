import { useState } from "react";

export default function ReportCard({
  report,
  onClose,
  onStatusChange,
  onLike,
  onOpenCleanupModal,
}) {
  const [isLiking, setIsLiking] = useState(false);

  const createdAt = new Date(report.createdAt);
  const daysAgo = Number.isNaN(createdAt.getTime())
    ? 0
    : Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));

  const issueCategory = report.issueCategory || report.category || "Severe";
  const wasteType = report.wasteType || "Mixed waste";
  const currentStatus = report.status || "Unresolved";

  const villageName = report.village || "Shivamogga Area";
  const talukName = report.taluk || "Shivamogga";
  const fullLocation = `${villageName}, ${talukName} Taluk, Shivamogga District`;

  const statusColorMap = {
    Unresolved: "#dc2626",
    Verified: "#16a34a",
    Resolved: "#16a34a",
    Flagged: "#d97706",
  };

  const statusBgMap = {
    Unresolved: "#fef2f2",
    Verified: "#f0fdf4",
    Resolved: "#f0fdf4",
    Flagged: "#fffbeb",
  };

  const handleLikeClick = async () => {
    if (isLiking || !onLike) return;
    setIsLiking(true);
    try {
      await onLike(report.id);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <aside
      aria-label="Issue report details"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 1500,
        display: "flex",
        flexDirection: "column",
        width: "min(100%, 520px)",
        background: "#fff",
        borderRadius: "0 0 0 18px",
        boxShadow: "-8px 0 30px rgba(15, 23, 42, 0.2)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          padding: "18px 20px 14px",
          borderBottom: "1px solid #eef0f4",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: statusColorMap[currentStatus] || "#ef4444", fontSize: 18 }}>●</span>
            <strong
              style={{
                color: "#dc2626",
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {issueCategory}
            </strong>
            <span
              style={{
                padding: "4px 9px",
                borderRadius: 20,
                background: statusBgMap[currentStatus] || "#fef2f2",
                color: statusColorMap[currentStatus] || "#dc2626",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {currentStatus === "Resolved" || currentStatus === "Verified"
                ? "Cleaned Up ✓"
                : currentStatus}
            </span>
          </div>
          <h2
            style={{ margin: "12px 0 5px", color: "#172033", fontSize: 20 }}
          >
            {report.title}
          </h2>
          <div style={{ color: "#475569", fontSize: 13, fontWeight: 500 }}>
            📍 {fullLocation}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close issue details"
          style={{
            border: 0,
            background: "transparent",
            color: "#9ca3af",
            fontSize: 25,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          x
        </button>
      </div>

      <div style={{ overflowY: "auto", padding: "0 20px 20px", flex: 1 }}>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${report.lat},${report.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            margin: "12px 0 14px",
            color: "#4f46e5",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Get directions ↗
        </a>

        {/* Garbage Vehicle Indicator */}
        <div
          style={{
            marginBottom: 14,
            padding: "8px 12px",
            borderRadius: 8,
            background: report.hasGarbageVehicle ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${report.hasGarbageVehicle ? "#a7f3d0" : "#fecaca"}`,
            color: report.hasGarbageVehicle ? "#065f46" : "#991b1b",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🚚</span>
          <span>
            {report.hasGarbageVehicle
              ? "Garbage collection vehicle visits this area"
              : "No regular garbage collection vehicle visits this area"}
          </span>
        </div>

        {/* Photos Section: Before & After comparison if cleanup photo exists */}
        {report.cleanupPhoto ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              ✨ Verified Cleanup (Before & After)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>BEFORE</div>
                <img
                  src={report.photo || "https://via.placeholder.com/200?text=No+Photo"}
                  alt="Before cleanup"
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "2px solid #ef4444",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>AFTER (CLEANED)</div>
                <img
                  src={report.cleanupPhoto}
                  alt="After cleanup"
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "2px solid #16a34a",
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          report.photo && (
            <div style={{ position: "relative", marginBottom: 14 }}>
              <img
                src={report.photo}
                alt="Reported issue"
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "cover",
                  borderRadius: 12,
                }}
              />
              <button
                onClick={handleLikeClick}
                disabled={isLiking}
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  padding: "8px 14px",
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(4px)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "transform 0.15s ease",
                }}
              >
                <span>👍</span>
                <span>I have seen this ({report.alsoSeenCount || 0})</span>
              </button>
            </div>
          )
        )}

        {/* Metrics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.8fr",
            gap: 8,
            marginTop: 14,
          }}
        >
          <div
            style={{
              padding: "13px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 11,
              background: "#f8fafc",
            }}
          >
            <strong
              style={{ display: "block", color: "#2563eb", fontSize: 18 }}
            >
              {report.alsoSeenCount || 0}
            </strong>
            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>Also seen</span>
          </div>
          <div
            style={{
              padding: "13px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 11,
              background: "#f8fafc",
            }}
          >
            <strong
              style={{ display: "block", color: "#dc2626", fontSize: 18 }}
            >
              {daysAgo}
            </strong>
            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>Days Open</span>
          </div>
          <div
            style={{
              padding: "13px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 11,
              background: "#f8fafc",
            }}
          >
            <strong
              style={{ display: "block", color: "#6366f1", fontSize: 15 }}
            >
              {wasteType}
            </strong>
            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>Waste type</span>
          </div>
        </div>

        {/* Accountability Section with actual Village name */}
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              color: "#9ca3af",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Accountability
          </div>
          <div
            style={{
              marginTop: 9,
              padding: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                textAlign: "center",
                color: "#1e293b",
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              🏢 Ward Governance ({fullLocation})
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  padding: 10,
                  background: "#ffffff",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {villageName} Administration
              </div>
              <div
                style={{
                  padding: 10,
                  background: "#ffffff",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {villageName} Citizens
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px 18px",
          borderTop: "1px solid #eef0f4",
          background: "#fff",
        }}
      >
        <button
          type="button"
          onClick={() => onOpenCleanupModal && onOpenCleanupModal(report.id)}
          style={{
            flex: 1,
            padding: "12px 8px",
            border: 0,
            borderRadius: 9,
            background: "#16a34a",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
          }}
        >
          ✓ Verify Cleanup
        </button>
        <button
          type="button"
          onClick={() => onStatusChange && onStatusChange(report.id, "Flagged")}
          style={{
            flex: 1,
            padding: "12px 8px",
            border: 0,
            borderRadius: 9,
            background: "#dc2626",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⚑ Flag as Incorrect
        </button>
      </div>
    </aside>
  );
}
