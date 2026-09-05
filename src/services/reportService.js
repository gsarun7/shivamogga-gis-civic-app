import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const LOCAL_STORAGE_KEY = "shivamogga-reports";

export const getLocalReports = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read local reports", e);
    return [];
  }
};

export const saveLocalReports = (reports) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.warn("localStorage quota exceeded, optimizing reports payload:", e);
    try {
      // If base64 photo is huge, trim heavy base64 to ensure pin metadata (lat, lng, status, village) is ALWAYS saved
      const optimized = reports.map((r) => ({
        ...r,
        photo: r.photo && r.photo.length > 300000 ? null : r.photo,
        cleanupPhoto: r.cleanupPhoto && r.cleanupPhoto.length > 300000 ? null : r.cleanupPhoto,
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(optimized));
    } catch (err2) {
      console.error("Critical: Failed to save reports to localStorage", err2);
    }
  }
};

const mapRowToReport = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  issueType: row.issue_type || "Garbage",
  issueCategory: row.issue_category,
  wasteType: row.waste_type,
  hasGarbageVehicle: Boolean(row.has_garbage_vehicle),
  alsoSeenCount: Number(row.also_seen_count || 0),
  photo: row.photo_url,
  cleanupPhoto: row.cleanup_photo_url,
  village: row.village,
  taluk: row.taluk,
  lat: Number(row.lat),
  lng: Number(row.lng),
  status: row.status || "Unresolved",
  createdAt: row.created_at,
});

const dataURLtoBlob = (dataurl) => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export const uploadReportPhoto = async (photoDataUrl, reportId, prefix = "report") => {
  if (!isSupabaseConfigured() || !photoDataUrl || !photoDataUrl.startsWith("data:")) {
    return photoDataUrl;
  }

  try {
    const blob = dataURLtoBlob(photoDataUrl);
    const fileExt = blob.type.split("/")[1] || "jpeg";
    const filePath = `${prefix}_${reportId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("report-photos")
      .upload(filePath, blob, { contentType: blob.type, upsert: true });

    if (uploadError) {
      console.warn("Supabase Storage upload warning:", uploadError.message);
      return photoDataUrl;
    }

    const { data: urlData } = supabase.storage
      .from("report-photos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Photo upload error:", err);
    return photoDataUrl;
  }
};

export const fetchReports = async () => {
  const local = getLocalReports();

  if (!isSupabaseConfigured()) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error, returning local cache:", error.message);
      return local;
    }

    const remoteReports = data.map(mapRowToReport);

    // Merge remote and local reports by ID so no pending/local items are lost
    const mergedMap = new Map();
    remoteReports.forEach((r) => mergedMap.set(r.id, r));
    local.forEach((r) => {
      if (!mergedMap.has(r.id)) {
        mergedMap.set(r.id, r);
      }
    });

    const combined = Array.from(mergedMap.values());
    saveLocalReports(combined);
    return combined;
  } catch (err) {
    console.error("Unexpected fetch error:", err);
    return local;
  }
};

export const createReport = async (inputReport) => {
  const tempId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now());

  let photoUrl = inputReport.photo;
  if (photoUrl && photoUrl.startsWith("data:")) {
    photoUrl = await uploadReportPhoto(photoUrl, tempId, "reported");
  }

  const generatedTitle = `Garbage Issue: ${inputReport.issueCategory} - ${inputReport.wasteType}`;

  const newReport = {
    id: tempId,
    title: inputReport.title || generatedTitle,
    description: inputReport.description || null,
    issueType: inputReport.issueType || "Garbage",
    issueCategory: inputReport.issueCategory,
    wasteType: inputReport.wasteType,
    hasGarbageVehicle: Boolean(inputReport.hasGarbageVehicle),
    alsoSeenCount: 0,
    photo: photoUrl || null,
    cleanupPhoto: null,
    village: inputReport.village || null,
    taluk: inputReport.taluk || null,
    lat: Number(inputReport.lat),
    lng: Number(inputReport.lng),
    status: inputReport.status || "Unresolved",
    createdAt: inputReport.createdAt || new Date().toISOString(),
  };

  // Always persist to local cache first
  const local = getLocalReports();
  const updatedLocal = [newReport, ...local.filter((r) => r.id !== newReport.id)];
  saveLocalReports(updatedLocal);

  if (!isSupabaseConfigured()) {
    return newReport;
  }

  try {
    const dbPayload = {
      id: newReport.id,
      title: newReport.title,
      description: newReport.description,
      issue_type: newReport.issueType,
      issue_category: newReport.issueCategory,
      waste_type: newReport.wasteType,
      has_garbage_vehicle: newReport.hasGarbageVehicle,
      also_seen_count: 0,
      photo_url: newReport.photo,
      village: newReport.village,
      taluk: newReport.taluk,
      lat: newReport.lat,
      lng: newReport.lng,
      status: newReport.status,
      created_at: newReport.createdAt,
    };

    const { data, error } = await supabase
      .from("reports")
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error (using local copy):", error.message);
      return newReport;
    }

    const savedReport = mapRowToReport(data);
    const freshLocal = getLocalReports();
    saveLocalReports([savedReport, ...freshLocal.filter((r) => r.id !== savedReport.id)]);
    return savedReport;
  } catch (err) {
    console.error("Unexpected create error:", err);
    return newReport;
  }
};

export const updateReportStatus = async (reportId, status) => {
  const local = getLocalReports();
  const updated = local.map((r) => (r.id === reportId ? { ...r, status } : r));
  saveLocalReports(updated);

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", reportId);

    if (error) {
      console.error("Supabase status update error:", error.message);
    }
    return true;
  } catch (err) {
    console.error("Unexpected status update error:", err);
    return false;
  }
};

export const incrementAlsoSeen = async (reportId) => {
  const local = getLocalReports();
  const target = local.find((r) => r.id === reportId);
  const newCount = (target ? target.alsoSeenCount || 0 : 0) + 1;

  const updatedLocal = local.map((r) =>
    r.id === reportId ? { ...r, alsoSeenCount: newCount } : r
  );
  saveLocalReports(updatedLocal);

  if (!isSupabaseConfigured()) return newCount;

  try {
    const { data, error } = await supabase
      .from("reports")
      .update({ also_seen_count: newCount })
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      console.error("Supabase also_seen update error:", error.message);
      return newCount;
    }

    return Number(data.also_seen_count);
  } catch (err) {
    console.error("Unexpected increment error:", err);
    return newCount;
  }
};

export const verifyCleanup = async (reportId, cleanupPhotoDataUrl) => {
  let uploadedCleanupUrl = cleanupPhotoDataUrl;
  if (cleanupPhotoDataUrl && cleanupPhotoDataUrl.startsWith("data:")) {
    uploadedCleanupUrl = await uploadReportPhoto(cleanupPhotoDataUrl, reportId, "cleanup");
  }

  const newStatus = "Resolved";

  const local = getLocalReports();
  const updatedLocal = local.map((r) =>
    r.id === reportId
      ? { ...r, status: newStatus, cleanupPhoto: uploadedCleanupUrl }
      : r
  );
  saveLocalReports(updatedLocal);

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from("reports")
      .update({
        status: newStatus,
        cleanup_photo_url: uploadedCleanupUrl,
      })
      .eq("id", reportId);

    if (error) {
      console.error("Supabase verify cleanup error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected verify cleanup error:", err);
    return false;
  }
};

export const subscribeToReports = (onRealtimeEvent) => {
  if (!isSupabaseConfigured()) return () => {};

  const channel = supabase
    .channel("public:reports")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reports" },
      (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          onRealtimeEvent({ type: "INSERT", report: mapRowToReport(payload.new) });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          onRealtimeEvent({ type: "UPDATE", report: mapRowToReport(payload.new) });
        } else if (payload.eventType === "DELETE" && payload.old) {
          onRealtimeEvent({ type: "DELETE", id: payload.old.id });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
