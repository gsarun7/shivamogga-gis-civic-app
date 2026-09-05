import { Marker, Circle } from "react-leaflet";
import L from "leaflet";

const blueBubbleIcon = L.divIcon({
  className: "gps-blue-marker",
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="
        position:absolute;
        inset:-6px;
        border-radius:50%;
        background:rgba(37, 99, 235, 0.3);
        animation: pulseRing 2s infinite;
      "></div>
      <div style="
        width:24px;
        height:24px;
        border-radius:50%;
        background:#2563eb;
        border:3px solid #ffffff;
        box-shadow:0 3px 10px rgba(0,0,0,0.4);
      "></div>
    </div>
    <style>
      @keyframes pulseRing {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(1.8); opacity: 0; }
      }
    </style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function LocationMarker({ position, accuracy }) {
  if (!position) return null;

  return (
    <>
      <Marker position={[position.lat, position.lng]} icon={blueBubbleIcon} />
      {accuracy && (
        <Circle
          center={[position.lat, position.lng]}
          radius={accuracy}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 1,
            dashArray: "4, 4",
          }}
        />
      )}
    </>
  );
}
