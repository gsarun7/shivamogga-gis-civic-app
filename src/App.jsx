import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMapEvents,
  useMap,
  LayersControl,
  FeatureGroup,
} from "react-leaflet";
import { useRef, useEffect, useState, useCallback } from "react";
import { point as turfPoint, booleanPointInPolygon } from "@turf/turf";
import L from "leaflet";
import districtsRaw from "./data/Karnataka/karnataka-districts.geojson?raw";
import taluksRaw from "./data/Karnataka/karnataka-taluks.geojson?raw";

import SupabaseStatusBadge from "./components/SupabaseStatusBadge";
import ReportForm from "./components/ReportForm";
import ReportCard from "./components/ReportCard";
import CleanupModal from "./components/CleanupModal";
import MapEffects from "./components/MapEffects";
import LocationMarker from "./components/LocationMarker";
import TileOptimizationInfo from "./components/TileOptimizationInfo";
import TileCounterBadge from "./components/TileCounterBadge";
import {
  fetchReports,
  createReport,
  updateReportStatus,
  incrementAlsoSeen,
  verifyCleanup,
  subscribeToReports,
} from "./services/reportService";

const villageModules = import.meta.glob("./data/villages/*.geojson", {
  query: "?raw",
  import: "default",
});
const districtsData = JSON.parse(districtsRaw);
const taluksData = JSON.parse(taluksRaw);

function App() {
  const shivamoggaCenter = [13.98, 75.35];
  const shimogaTown = [13.9299, 75.5681];

  const villageLayers = useRef([]);
  const talukLayers = useRef([]);
  const villageCache = useRef({});
  const villageRequests = useRef({});
  const [loadedVillages, setLoadedVillages] = useState({});
  const [loadingDistrict, setLoadingDistrict] = useState(null);
  const [villageLoadError, setVillageLoadError] = useState(null);
  const [viewMode] = useState("all");
  const [activeDistrictName, setActiveDistrictName] = useState("Shivamogga");

  const talukThreshold = 13;
  const villageThreshold = 15;

  // Reports state and placing mode
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true); // Checked on launch
  const [tempLatLng, setTempLatLng] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Map Tile Counter State
  const [tileCount, setTileCount] = useState(0);

  // GPS User Location state
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Cleanup Modal state
  const [cleanupReportId, setCleanupReportId] = useState(null);
  const [isVerifyingCleanup, setIsVerifyingCleanup] = useState(false);

  function districtSlug(name) {
    return name
      .replace(/\s+district$/i, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }

  async function loadDistrictVillages(name) {
    const slug = districtSlug(name);
    if (villageCache.current[slug]) return;
    if (villageRequests.current[slug]) return villageRequests.current[slug];

    const load = villageModules[`./data/villages/${slug}.geojson`];
    if (!load) {
      setVillageLoadError(`Village data is unavailable for ${name}.`);
      return;
    }

    setLoadingDistrict(name);
    setVillageLoadError(null);
    const request = load()
      .then((raw) => {
        const data = JSON.parse(raw);
        villageCache.current[slug] = data;
        setLoadedVillages((current) => ({ ...current, [slug]: data }));
      })
      .catch((error) => {
        console.error(`Failed to load villages for ${name}`, error);
        setVillageLoadError(`Could not load village data for ${name}.`);
      })
      .finally(() => {
        delete villageRequests.current[slug];
        setLoadingDistrict((current) => (current === name ? null : current));
      });
    villageRequests.current[slug] = request;
    return request;
  }

  useEffect(() => {
    let isMounted = true;
    fetchReports().then((data) => {
      if (isMounted) setReports(data);
    });

    const unsubscribe = subscribeToReports((event) => {
      if (event.type === "INSERT" && event.report) {
        setReports((prev) => [
          event.report,
          ...prev.filter((r) => r.id !== event.report.id),
        ]);
      } else if (event.type === "UPDATE" && event.report) {
        setReports((prev) =>
          prev.map((r) => (r.id === event.report.id ? event.report : r))
        );
        setActiveReport((current) =>
          current && current.id === event.report.id ? event.report : current
        );
      } else if (event.type === "DELETE" && event.id) {
        setReports((prev) => prev.filter((r) => r.id !== event.id));
        setActiveReport((current) =>
          current && current.id === event.id ? null : current
        );
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Request user GPS position and dynamically detect user district
  const handleGetGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(coords);
        setIsLocating(false);

        try {
          const pt = turfPoint([coords.lng, coords.lat]);
          const matchedDistrict = districtsData.features.find((feat) =>
            booleanPointInPolygon(pt, feat)
          );
          if (matchedDistrict && matchedDistrict.properties?.name) {
            const districtName = matchedDistrict.properties.name;
            setActiveDistrictName(districtName);
            loadDistrictVillages(districtName);
          }
        } catch (e) {
          console.error("Failed to resolve user GPS district:", e);
        }
      },
      (err) => {
        console.error("GPS error:", err);
        alert(`Location Access Denied or Error: ${err.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const formatPopup = (feature) => {
    const props = feature.properties || {};
    const name = props.name || props.taluk || props.DISTRICT || "Feature";
    const type = props.type || "";
    const taluk = props.taluk ? `<div>Taluk: ${props.taluk}</div>` : "";
    const vcode = props.village_code
      ? `<div>Village code: ${props.village_code}</div>`
      : "";
    const url =
      props.website || props.url || props.link || "http://example.com/";
    return `<div><strong>${name}</strong><div>Type: ${type}</div>${taluk}${vcode}<div><a href="${url}" target="_blank" rel="noopener noreferrer">Open site</a></div></div>`;
  };

  const style = useCallback((feature) => {
    const props = feature.properties || {};
    if (props.type === "district") {
      return { color: "#d62828", weight: 3, fill: false };
    }

    if (props.type === "taluk" || props.type === "tehsil") {
      const nameKey = (props.name || props.taluk || "")
        .toString()
        .toLowerCase();
      const overrideMatchers = [
        { match: ["bhadrav", "bhadravati"], color: "#e41a1c" },
        { match: ["shivamogga", "shimoga", "shivamogg"], color: "#377eb8" },
        { match: ["sagar", "sagara"], color: "#4daf4a" },
      ];
      for (const o of overrideMatchers) {
        if (o.match.some((m) => nameKey.includes(m))) {
          return {
            color: o.color,
            weight: 2,
            fillColor: o.color,
            fillOpacity: 0.22,
          };
        }
      }

      const palette = [
        "#1f78b4",
        "#33a02c",
        "#ff7f00",
        "#6a3d9a",
        "#b15928",
        "#a6cee3",
        "#fb9a99",
        "#fdbf6f",
      ];
      let h = 0;
      for (let i = 0; i < nameKey.length; i++)
        h = (h << 5) - h + nameKey.charCodeAt(i);
      const color = palette[Math.abs(h) % palette.length];
      return {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.18,
        interactive: true,
      };
    }

    return { color: "#3388ff", weight: 1, fill: false };
  }, []);

  const villageStyle = useCallback(() => {
    return {
      color: "#666666",
      weight: 1,
      fillColor: "#999999",
      fillOpacity: 0.08,
      interactive: true,
    };
  }, []);

  const featureOnEach = (feature, layer) => {
    const props = feature.properties || {};
    layer.bindPopup(formatPopup(feature));
    layer._baseStyle =
      props.type === "taluk" ||
      props.type === "tehsil" ||
      props.type === "district"
        ? style(feature)
        : villageStyle(feature);
    const nameKey = (props.name || props.taluk || props.NAME || "")
      .toString()
      .toLowerCase();
    const isDistrict =
      props.type === "district" || nameKey.includes("district");
    const isVillage =
      ["village", "village_poly", "village_polygon"].includes(
        (props.type || "").toString()
      ) || nameKey.includes("village");

    const talukRoots = [
      "sagar",
      "sagara",
      "sorab",
      "soraba",
      "shikarpur",
      "shikaripura",
      "hosanagara",
      "tirthahalli",
      "tirtha",
      "shimoga",
      "shivamogga",
      "bhadrav",
      "bhadravati",
      "bhdravathi",
    ];
    const isTaluk =
      props.type === "taluk" ||
      props.type === "tehsil" ||
      /\btaluk\b/i.test(nameKey) ||
      talukRoots.some((k) => nameKey.includes(k));

    if (isTaluk) {
      const label = (props.name || props.taluk || "").toString();
      if (label) layer.bindTooltip(label, { sticky: true });
    }
    if (isVillage) {
      const vlabel = (
        props.name ||
        props.village ||
        props.taluk ||
        ""
      ).toString();
      if (vlabel) layer.bindTooltip(vlabel, { sticky: true });
    }

    if (layer._hasEvents) return;
    layer._hasEvents = true;

    if (isVillage) {
      if (!layer._addedToVillage) {
        villageLayers.current.push(layer);
        layer._addedToVillage = true;
      }
    } else if (isDistrict || isTaluk) {
      if (!layer._addedToTaluk) {
        talukLayers.current.push(layer);
        layer._addedToTaluk = true;
      }
    }

    layer.on({
      mouseover: (e) => {
        const map = e.target._map;
        const z = map ? map.getZoom() : 0;
        if (isDistrict) {
          const base = layer._baseStyle || {};
          const color = base.color || "#d62828";
          e.target.setStyle({
            color,
            weight: Math.max((base.weight || 1) + 3, 4),
            fill: false,
          });
          try {
            e.target.bringToFront();
          } catch (err) {}
          return;
        }

        if (isTaluk) {
          const base = layer._baseStyle || {};
          const color = base.color || base.fillColor || "#1f78b4";
          e.target.setStyle({
            color,
            fillColor: base.fillColor || color,
            weight: Math.max((base.weight || 1) + 2, 3),
            fillOpacity: Math.max(base.fillOpacity ?? 0.18, 0.35),
          });
          try {
            e.target.bringToFront();
          } catch (err) {}
          return;
        }

        if (
          (props.type === "village" ||
            props.type === "village_poly" ||
            props.type === "village_polygon") &&
          z >= villageThreshold
        ) {
          const base = layer._baseStyle || {};
          e.target.setStyle({
            ...base,
            weight: Math.max((base.weight || 1) + 1, 2),
            fillOpacity: Math.max(base.fillOpacity ?? 0.4, 0.45),
            color: "#222222",
          });
          try {
            e.target.bringToFront();
          } catch (err) {}
          return;
        }
      },
      mouseout: (e) => {
        const map = e.target._map;
        const z = map ? map.getZoom() : 0;
        const base = layer._baseStyle || {};
        if (
          props.type === "village" ||
          props.type === "village_poly" ||
          props.type === "village_polygon"
        ) {
          const show = z >= villageThreshold;
          e.target.setStyle({
            ...base,
            fillOpacity: show ? base.fillOpacity ?? 0.08 : 0,
          });
        } else {
          e.target.setStyle(base);
        }
      },
    });

    if (isDistrict) {
      layer.on("click", () => loadDistrictVillages(props.name || nameKey));
    }
    if (isTaluk && props.district) {
      layer.on("click", () => loadDistrictVillages(props.district));
    }
  };

  function ReportPlacer() {
    const map = useMapEvents({
      click(e) {
        if (!placingMode) return;
        const { lat, lng } = e.latlng;
        setTempLatLng({ lat, lng });
        setShowForm(true);
        setPlacingMode(false);
      },
    });

    useEffect(() => {
      if (!map) return;
      const container = map.getContainer();
      container.style.cursor = placingMode ? "crosshair" : "";
      return () => {
        container.style.cursor = "";
      };
    }, [map]);

    return null;
  }

  // Zoom into street level (zoom 17) when entering Report Placing mode for easy pin marking
  function ReportZoomHandler({ isPlacing }) {
    const map = useMap();
    useEffect(() => {
      if (isPlacing) {
        if (map.getZoom() < 17) {
          map.setZoom(17, { animate: true });
        }
      }
    }, [isPlacing, map]);
    return null;
  }

  // Tile load event listener to increment live tile consumption counter
  function TileEventListener() {
    const map = useMap();
    useEffect(() => {
      const handleTileLoad = () => {
        setTileCount((prev) => prev + 1);
      };
      map.on("tileload", handleTileLoad);
      return () => {
        map.off("tileload", handleTileLoad);
      };
    }, [map]);
    return null;
  }

  function LocationFlyTo({ location }) {
    const map = useMap();
    useEffect(() => {
      if (location) {
        map.panTo([location.lat, location.lng], { animate: true });
      }
    }, [location, map]);
    return null;
  }

  function detectVillageTaluk(lat, lng) {
    try {
      const pt = turfPoint([lng, lat]);
      for (const districtData of Object.values(loadedVillages)) {
        for (const feat of districtData.features) {
          if (booleanPointInPolygon(pt, feat)) {
            const p = feat.properties || {};
            return {
              village: p.name || p.village || null,
              taluk: p.taluk || null,
            };
          }
        }
      }
    } catch (e) {
      console.error("detectVillageTaluk error", e);
    }
    return { village: null, taluk: null };
  }

  const getReportMarkerIcon = (status, alsoSeenCount = 0) => {
    const isCleanedUp = status === "Resolved" || status === "Verified";
    const bg = isCleanedUp ? "#16a34a" : "#d9534f";
    const displayText = isCleanedUp ? "✓" : String(alsoSeenCount || 0);

    return L.divIcon({
      className: "report-marker",
      html: `<div style="background:${bg};min-width:22px;height:22px;padding:0 4px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;box-sizing:border-box;">${displayText}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  };

  const handleSubmitReport = async (form) => {
    setIsSubmitting(true);
    try {
      const { lat, lng } = tempLatLng || {};
      const detected = detectVillageTaluk(lat, lng);

      const created = await createReport({
        lat,
        lng,
        issueType: "Garbage",
        issueCategory: form.issueCategory,
        wasteType: form.wasteType,
        hasGarbageVehicle: form.hasGarbageVehicle,
        photo: form.photo,
        village: detected.village,
        taluk: detected.taluk,
      });

      setReports((prev) => [
        created,
        ...prev.filter((r) => r.id !== created.id),
      ]);
      setShowForm(false);
      setTempLatLng(null);
      setShowOverlays(true); // Re-check overlays after submission
    } catch (err) {
      console.error("Failed to submit report:", err);
      alert("An error occurred while saving the report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    await updateReportStatus(reportId, newStatus);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
    if (activeReport && activeReport.id === reportId) {
      setActiveReport((current) =>
        current ? { ...current, status: newStatus } : null
      );
    }
  };

  const handleLikeReport = async (reportId) => {
    const updatedCount = await incrementAlsoSeen(reportId);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, alsoSeenCount: updatedCount } : r))
    );
    if (activeReport && activeReport.id === reportId) {
      setActiveReport((current) =>
        current ? { ...current, alsoSeenCount: updatedCount } : null
      );
    }
  };

  const handleVerifyCleanupSubmit = async (cleanupPhotoDataUrl) => {
    if (!cleanupReportId) return;
    setIsVerifyingCleanup(true);
    try {
      await verifyCleanup(cleanupReportId, cleanupPhotoDataUrl);
      setReports((prev) =>
        prev.map((r) =>
          r.id === cleanupReportId
            ? { ...r, status: "Resolved", cleanupPhoto: cleanupPhotoDataUrl }
            : r
        )
      );
      if (activeReport && activeReport.id === cleanupReportId) {
        setActiveReport((current) =>
          current
            ? { ...current, status: "Resolved", cleanupPhoto: cleanupPhotoDataUrl }
            : null
        );
      }
      setCleanupReportId(null);
    } catch (err) {
      console.error("Failed to verify cleanup:", err);
      alert("Error saving cleanup photo. Please try again.");
    } finally {
      setIsVerifyingCleanup(false);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <SupabaseStatusBadge />
      <TileCounterBadge count={tileCount} />
      <TileOptimizationInfo currentDistrict={activeDistrictName} />

      <MapContainer
        center={shivamoggaCenter}
        zoom={10}
        minZoom={6}
        maxZoom={18}
        style={{ height: "100%", width: "100%" }}
      >
        <TileEventListener />
        <ReportZoomHandler isPlacing={placingMode} />

        <MapEffects
          talukThreshold={talukThreshold}
          villageThreshold={villageThreshold}
          districtsData={districtsData}
          loadDistrictVillages={loadDistrictVillages}
          viewMode={viewMode}
          talukLayers={talukLayers}
          villageLayers={villageLayers}
          style={style}
          villageStyle={villageStyle}
        />

        <LocationFlyTo location={userLocation} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Streets">
            <TileLayer
              attribution="Tiles &copy; Esri — Source: Esri, HERE, Garmin"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked={showOverlays} name="Taluks">
            <GeoJSON
              data={taluksData}
              style={style}
              onEachFeature={featureOnEach}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked={showOverlays} name="Villages">
            <FeatureGroup>
              {Object.entries(loadedVillages).map(([slug, districtData]) => (
                <GeoJSON
                  key={slug}
                  data={districtData}
                  style={villageStyle}
                  onEachFeature={featureOnEach}
                />
              ))}
            </FeatureGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked={showOverlays} name="District">
            <GeoJSON
              data={districtsData}
              style={(f) => {
                const p = f.properties || {};
                return p.type === "district"
                  ? { ...style(f), fill: true, fillOpacity: 0 }
                  : { stroke: false, fill: false };
              }}
              onEachFeature={featureOnEach}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <ReportPlacer />

        <LocationMarker position={userLocation} accuracy={userLocation?.accuracy} />

        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={getReportMarkerIcon(r.status, r.alsoSeenCount)}
            eventHandlers={{
              click: () => setActiveReport(r),
            }}
          />
        ))}

        <Marker position={shimogaTown}>
          <Popup>Shimoga (district HQ)</Popup>
        </Marker>
      </MapContainer>

      {activeReport && (
        <ReportCard
          report={activeReport}
          onClose={() => setActiveReport(null)}
          onStatusChange={handleStatusChange}
          onLike={handleLikeReport}
          onOpenCleanupModal={(id) => setCleanupReportId(id)}
        />
      )}

      {cleanupReportId && (
        <CleanupModal
          onCancel={() => setCleanupReportId(null)}
          onSubmit={handleVerifyCleanupSubmit}
          isSubmitting={isVerifyingCleanup}
        />
      )}

      {(loadingDistrict || villageLoadError) && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1100,
            padding: "6px 12px",
            background: "rgba(255, 255, 255, 0.94)",
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {loadingDistrict
            ? `Loading villages for ${loadingDistrict}...`
            : villageLoadError}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          right: 14,
          bottom: 14,
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={handleGetGPSLocation}
          disabled={isLocating}
          title="Get live GPS location"
          style={{
            padding: "10px 14px",
            background: "#ffffff",
            color: "#2563eb",
            border: "1px solid #bfdbfe",
            borderRadius: 30,
            fontWeight: 600,
            fontSize: 13,
            cursor: isLocating ? "wait" : "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🎯</span>
          <span>{isLocating ? "Locating..." : "My GPS Location"}</span>
        </button>

        <button
          onClick={() => {
            setPlacingMode(true);
            setShowOverlays(false); // Automatically uncheck boundaries during pin placement
          }}
          style={{
            padding: "12px 18px",
            background: placingMode ? "#ef4444" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            transition: "all 0.2s ease",
          }}
        >
          {placingMode ? "Click Map to Place Marker" : "📍 Report an Issue"}
        </button>
      </div>

      {showForm && (
        <ReportForm
          onCancel={() => {
            setShowForm(false);
            setTempLatLng(null);
            setShowOverlays(true); // Re-check boundaries on cancel
          }}
          onSave={handleSubmitReport}
          isSubmitting={isSubmitting}
          userLocation={userLocation}
          tempLatLng={tempLatLng}
          onRequestLocation={handleGetGPSLocation}
        />
      )}
    </div>
  );
}

export default App;
