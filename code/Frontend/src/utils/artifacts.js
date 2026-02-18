const API_BASE = import.meta.env.VITE_API_URL || "/api";

const isObject = (value) => value && typeof value === "object";

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
