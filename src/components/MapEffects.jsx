import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { point as turfPoint, booleanPointInPolygon } from "@turf/turf";

export default function MapEffects({
  talukThreshold,
  villageThreshold,
  districtsData,
  loadDistrictVillages,
  viewMode,
  talukLayers,
  villageLayers,
  style,
  villageStyle,
}) {
  const map = useMap();

  useEffect(() => {
    const loadFocusedDistrict = () => {
      if (map.getZoom() < talukThreshold) return;
      const center = map.getCenter();
      const focusedDistrict = districtsData.features.find((feature) =>
        booleanPointInPolygon(turfPoint([center.lng, center.lat]), feature)
      );
      if (focusedDistrict) {
        loadDistrictVillages(focusedDistrict.properties?.name || "");
      }
    };

    const updateVisibility = () => {
      const z = map.getZoom();
      const showVillagesByZoom = z >= villageThreshold;

      const showVillages =
        viewMode === "all"
          ? true
          : viewMode === "village"
          ? true
          : showVillagesByZoom;
      const showTaluks =
        viewMode === "all" ? true : viewMode === "taluk" ? true : false;

      talukLayers.current.forEach((l) => {
        const base = l._baseStyle || style(l.feature);
        l.setStyle({
          ...base,
          fillOpacity: showTaluks ? base.fillOpacity ?? 0.18 : 0,
          opacity: showTaluks ? 1 : 0,
          interactive: !!showTaluks,
        });
      });

      villageLayers.current.forEach((l) => {
        const base = l._baseStyle || villageStyle(l.feature);
        l.setStyle({
          ...base,
          fillOpacity: showVillages ? base.fillOpacity ?? 0.08 : 0,
          opacity: showVillages ? 1 : 0,
          interactive: !!showVillages,
        });
      });
    };

    map.on("zoomend", updateVisibility);
    map.on("zoomend", loadFocusedDistrict);
    map.on("moveend", loadFocusedDistrict);
    updateVisibility();

    return () => {
      map.off("zoomend", updateVisibility);
      map.off("zoomend", loadFocusedDistrict);
      map.off("moveend", loadFocusedDistrict);
    };
  }, [
    map,
    viewMode,
    talukThreshold,
    villageThreshold,
    districtsData,
    loadDistrictVillages,
    talukLayers,
    villageLayers,
    style,
    villageStyle,
  ]);

  return null;
}
