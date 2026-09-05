export default function TileOptimizationInfo({ currentDistrict }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 14,
        left: 14,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "rgba(15, 23, 42, 0.78)",
        backdropFilter: "blur(4px)",
        color: "#38bdf8",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        pointerEvents: "none",
      }}
    >
      <span style={{ fontSize: 13 }}>📍</span>
      <span>
        Active District: {currentDistrict || "Karnataka GIS"}
      </span>
    </div>
  );
}
