export default function TileCounterBadge({ count }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 16px",
        background: "rgba(15, 23, 42, 0.88)",
        backdropFilter: "blur(6px)",
        color: "#ffffff",
        borderRadius: 20,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.3,
        border: "1px solid rgba(255, 255, 255, 0.15)",
        transition: "all 0.2s ease",
      }}
    >
      <span style={{ fontSize: 14 }}>🌐</span>
      <span>Map Tiles Consumed:</span>
      <span
        style={{
          background: "#2563eb",
          color: "#ffffff",
          padding: "2px 8px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 700,
          minWidth: 20,
          textAlign: "center",
        }}
      >
        {count}
      </span>
    </div>
  );
}
