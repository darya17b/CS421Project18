const API_BASE = import.meta.env.VITE_API_URL || "/api";

const isObject = (value) => value && typeof value === "object";
const HEX_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export const getArtifactName = (artifact) => {
  if (!artifact) return "Resource";
  if (!isObject(artifact)) return String(artifact);
  return artifact.name || artifact.filename || artifact.fileName || artifact.id || "Resource";
};

export const getArtifactUrl = (artifact) => {
  if (!artifact || !isObject(artifact)) return "";
  if (artifact.url && /^https?:\/\//i.test(artifact.url)) return artifact.url;
  if (artifact.id) return `${API_BASE}/artifact?id=${encodeURIComponent(artifact.id)}`;
  if (artifact.url) return artifact.url;
  return "";
};

export const getArtifactBadge = (artifact) => {
  const type = isObject(artifact)
    ? String(artifact.content_type || artifact.contentType || "").toLowerCase()
    : String(artifact || "").toLowerCase();
  if (type.includes("pdf") || type.endsWith(".pdf")) return "PDF";
  if (type.includes("png") || type.includes("jpeg") || type.includes("jpg") || type.endsWith(".png") || type.endsWith(".jpg") || type.endsWith(".jpeg")) {
    return "IMG";
  }
  return "FILE";
};

export const isMedicationCardName = (name) => /med(?:ication|ical)?[\s_-]*card/i.test(String(name || ""));

export const isLabDataCardName = (name) =>
  /\blab(?:oratory)?(?:\s+(?:data|result|results))?[\s_-]*card\b/i.test(String(name || ""));

export const isDoorNoteName = (name) =>
  /\bdoor[\s_-]*note\b/i.test(String(name || ""));

const getArtifactStableKey = (artifact) => {
  if (!artifact || !isObject(artifact)) return "";
  return (
    artifact.id
    || artifact._id
    || artifact.url
    || artifact.path
    || artifact.name
    || artifact.filename
    || artifact.fileName
    || JSON.stringify(artifact)
  );
};

const getArtifactScore = (artifact, index) => {
  if (!artifact || !isObject(artifact)) return index;
  const uploadedAtRaw = artifact.uploaded_at ?? artifact.uploadedAt ?? "";
  const uploadedAt = Date.parse(String(uploadedAtRaw || "").trim());
  if (Number.isFinite(uploadedAt)) return uploadedAt;

  const id = String(artifact.id || artifact._id || "").trim();
  if (HEX_OBJECT_ID_PATTERN.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000;
  }
  return index;
};

export const dedupeArtifacts = (artifacts = []) => {
  const seen = new Set();
  const deduped = [];
  artifacts.forEach((artifact) => {
    if (!artifact || !isObject(artifact)) return;
    const key = getArtifactStableKey(artifact);
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(artifact);
  });
  return deduped;
};

export const collapseDoorNoteArtifacts = (artifacts = []) => {
  const deduped = dedupeArtifacts(artifacts);

  let latestDoorNoteIndex = -1;
  let latestDoorNoteScore = Number.NEGATIVE_INFINITY;
  deduped.forEach((artifact, index) => {
    if (!isDoorNoteName(getArtifactName(artifact))) return;
    const score = getArtifactScore(artifact, index);
    if (score >= latestDoorNoteScore) {
      latestDoorNoteScore = score;
      latestDoorNoteIndex = index;
    }
  });

  if (latestDoorNoteIndex < 0) return deduped;
  return deduped.filter((artifact, index) => (
    !isDoorNoteName(getArtifactName(artifact)) || index === latestDoorNoteIndex
  ));
};
