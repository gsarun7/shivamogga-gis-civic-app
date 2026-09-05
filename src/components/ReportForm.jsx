import { useState } from "react";
import { distance as turfDistance, point as turfPoint } from "@turf/turf";

export default function ReportForm({
  onCancel,
  onSave,
  isSubmitting,
  userLocation,
  tempLatLng,
  onRequestLocation,
}) {
  const [issueCategory, setIssueCategory] = useState("");
  const [wasteType, setWasteType] = useState("");
  const [hasGarbageVehicle, setHasGarbageVehicle] = useState(false);
  const [photoData, setPhotoData] = useState(null);

  const issueCategories = ["Critical", "Severe", "Moderate", "Minor"];
  const wasteTypes = [
    "Mixed waste",
    "Biodegradable waste",
    "Recyclable waste",
    "Hazardous waste",
  ];

  // Calculate distance between user GPS and pinned location
  let distanceKm = null;
  let isNearby = true; // default true if GPS not yet obtained

  if (userLocation && tempLatLng) {
    try {
      const from = turfPoint([userLocation.lng, userLocation.lat]);
      const to = turfPoint([tempLatLng.lng, tempLatLng.lat]);
      distanceKm = turfDistance(from, to, { units: "kilometers" });
      isNearby = distanceKm <= 1.0; // 1.0 km geofence limit
    } catch (e) {
      console.error("Distance calculation error:", e);
    }
  }

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return setPhotoData(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setPhotoData(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => setPhotoData(event.target.result);
      img.src = event.target.result;
    };
    reader.readAsDataURL(f);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!issueCategory) return alert("Select an issue category");
    if (!wasteType) return alert("Select a waste type");

    if (userLocation && !isNearby) {
      return alert(
        `📍 Distance Restriction: You are ${distanceKm.toFixed(
          2
        )} km away from this spot. You must be physically near the location (within 1.0 km) to submit a report.`
      );
    }

    onSave({
      issueCategory,
      wasteType,
      hasGarbageVehicle,
      photo: photoData || null,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(17, 24, 39, 0.42)",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "18px 20px 22px",
          borderRadius: "18px 18px 0 0",
          width: "min(100%, 520px)",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(15, 23, 42, 0.18)",
        }}
      >
        <div
          style={{
            width: 42,
            height: 4,
            margin: "0 auto 16px",
            borderRadius: 4,
            background: "#d1d5db",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                color: "#ef4444",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              New report
            </div>
            <h3 style={{ margin: 0, color: "#172033", fontSize: 22 }}>
              Report a Garbage Issue
            </h3>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 5 }}>
              Help improve your neighbourhood cleanliness
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close report form"
            style={{
              border: 0,
              background: "#f3f4f6",
              color: "#6b7280",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            x
          </button>
        </div>

        {/* GPS Geofence Proximity Status */}
        <div style={{ marginBottom: 16 }}>
          {userLocation ? (
            isNearby ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 9,
                  background: "#f0fdf4",
                  border: "1px solid #a7f3d0",
                  color: "#166534",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📍</span>
                <span>
                  Verified Nearby Location ({distanceKm ? distanceKm.toFixed(2) : "0"} km from your GPS)
                </span>
              </div>
            ) : (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 9,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>
                  Distance Limit Exceeded: You are {distanceKm ? distanceKm.toFixed(2) : "0"} km away. You must be within 1.0 km to submit.
                </span>
              </div>
            )
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: 9,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>Verify location proximity with GPS</span>
              <button
                type="button"
                onClick={onRequestLocation}
                style={{
                  padding: "4px 10px",
                  background: "#2563eb",
                  color: "#fff",
                  border: 0,
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🎯 Get GPS Location
              </button>
            </div>
          )}
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 18 }}>
            <div
              style={{ fontWeight: 700, color: "#374151", marginBottom: 9 }}
            >
              Issue type
            </div>
            <div
              style={{
                padding: "11px 12px",
                border: "1px solid #bfdbfe",
                borderRadius: 9,
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Garbage
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{ fontWeight: 700, color: "#374151", marginBottom: 9 }}
            >
              Issue category <span style={{ color: "#ef4444" }}>*</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {issueCategories.map((item) => (
                <label
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 11px",
                    border: `1px solid ${issueCategory === item ? "#2563eb" : "#e2e8f0"}`,
                    borderRadius: 9,
                    background: issueCategory === item ? "#eff6ff" : "#fff",
                    color: issueCategory === item ? "#1d4ed8" : "#4b5563",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="issue-severity"
                    value={item}
                    disabled={isSubmitting}
                    checked={issueCategory === item}
                    onChange={(e) => setIssueCategory(e.target.value)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="waste-type"
              style={{
                display: "block",
                fontWeight: 700,
                color: "#374151",
                marginBottom: 7,
              }}
            >
              Waste type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              id="waste-type"
              value={wasteType}
              disabled={isSubmitting}
              onChange={(e) => setWasteType(e.target.value)}
              style={{
                boxSizing: "border-box",
                width: "100%",
                padding: "12px 13px",
                border: "1px solid #dbe1ea",
                borderRadius: 10,
                background: "#fff",
                color: wasteType ? "#374151" : "#9ca3af",
                fontSize: 14,
              }}
            >
              <option value="">Select waste type</option>
              {wasteTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#f8fafc",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={hasGarbageVehicle}
                disabled={isSubmitting}
                onChange={(e) => setHasGarbageVehicle(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#2563eb" }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                Does a garbage collection vehicle visit your area?
              </span>
            </label>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="report-photo"
              style={{
                display: "block",
                fontWeight: 700,
                color: "#374151",
                marginBottom: 7,
              }}
            >
              Add a photo{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <label
              htmlFor="report-photo"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 76,
                padding: 10,
                border: "1px dashed #cbd5e1",
                borderRadius: 10,
                color: "#64748b",
                fontSize: 13,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {photoData ? "Change photo" : "Tap to upload a photo"}
            </label>
            <input
              id="report-photo"
              type="file"
              accept="image/*"
              disabled={isSubmitting}
              onChange={handleFile}
              style={{ display: "none" }}
            />
            {photoData && (
              <img
                src={photoData}
                alt="Report preview"
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 180,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginTop: 8,
                }}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "12px 10px",
                border: "1px solid #dbe1ea",
                background: "#fff",
                color: "#4b5563",
                borderRadius: 9,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (userLocation && !isNearby)}
              style={{
                flex: 1,
                padding: "12px 10px",
                background: isSubmitting || (userLocation && !isNearby) ? "#93c5fd" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontWeight: 700,
                cursor: isSubmitting || (userLocation && !isNearby) ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
