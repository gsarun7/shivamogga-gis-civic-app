import { useState } from "react";

export default function CleanupModal({ onCancel, onSubmit, isSubmitting }) {
  const [cleanupPhoto, setCleanupPhoto] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return setCleanupPhoto(null);
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
        setCleanupPhoto(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => setCleanupPhoto(event.target.result);
      img.src = event.target.result;
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cleanupPhoto) {
      return alert("Please upload a photo showing the cleaned up location.");
    }
    onSubmit(cleanupPhoto);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2200,
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
          maxWidth: 480,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ color: "#16a34a", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Cleanup Verification
            </span>
            <h3 style={{ margin: "4px 0 0", fontSize: 20, color: "#0f172a" }}>
              Verify Spot Cleanup
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              border: 0,
              background: "#f1f5f9",
              borderRadius: "50%",
              width: 30,
              height: 30,
              cursor: "pointer",
              fontWeight: 700,
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#475569", margin: "12px 0 18px", lineHeight: 1.5 }}>
          Upload a photo showing that the garbage has been cleared from this spot. This will mark the report as <strong>Cleaned Up (Green Bubble)</strong> on the map.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="cleanup-photo-input"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 120,
                padding: 16,
                border: "2px dashed #a7f3d0",
                borderRadius: 12,
                background: "#f0fdf4",
                color: "#166534",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 24, marginBottom: 4 }}>📷</span>
              <strong style={{ fontSize: 14 }}>
                {cleanupPhoto ? "Change Cleanup Photo" : "Upload Final Cleanup Photo"}
              </strong>
              <span style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>
                Click to choose image file
              </span>
            </label>
            <input
              id="cleanup-photo-input"
              type="file"
              accept="image/*"
              disabled={isSubmitting}
              onChange={handleFile}
              style={{ display: "none" }}
            />

            {cleanupPhoto && (
              <img
                src={cleanupPhoto}
                alt="Cleanup verification preview"
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 200,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginTop: 12,
                  border: "2px solid #16a34a",
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
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#475569",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cleanupPhoto}
              style={{
                flex: 1,
                padding: "12px 10px",
                background: isSubmitting || !cleanupPhoto ? "#86efac" : "#16a34a",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                cursor: isSubmitting || !cleanupPhoto ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Verifying..." : "Submit Cleanup Photo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
