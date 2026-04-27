import { OktaAuth } from "@okta/okta-auth-js";

// handles normalize callback path
const normalizeCallbackPath = (value) => {
  const text = String(value || "").trim();
  if (!text) return "/login/callback";
  return text.startsWith("/") ? text : `/${text}`;
};

// handles get redirect uri
const getRedirectUri = () => {
  if (typeof window === "undefined") return "";
  const callbackPath = normalizeCallbackPath(import.meta.env.VITE_OKTA_CALLBACK_PATH);
  const fallback = `${window.location.origin}${callbackPath}`;
  const configured = String(import.meta.env.VITE_OKTA_REDIRECT_URI || "").trim();
  if (!configured) return fallback;

  // Absolute redirect URI configured via env (recommended).
  if (/^https?:\/\//i.test(configured)) {
    return configured;
  }

  // Allow relative path values in env as a convenience.
  if (configured.startsWith("/")) {
    return `${window.location.origin}${configured}`;
  }
  return `${window.location.origin}/${configured.replace(/^\/+/, "")}`;
};

// handles parse scopes
const parseScopes = (value) => {
  const raw = String(value || "openid profile email").trim();
  if (!raw) return ["openid", "profile", "email"];
  return raw.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
};

// handles parse admin groups
const parseAdminGroups = (value) => {
  const raw = String(
    value || "admin,admins,vcc-admin,vcc-admins,BAM.PROD.ESFCOM.ADMIN"
  ).trim();
  return new Set(
    raw
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
};

const issuer = String(import.meta.env.VITE_OKTA_ISSUER || "").trim();
const clientId = String(import.meta.env.VITE_OKTA_CLIENT_ID || "").trim();

export const isOktaConfigured = Boolean(issuer && clientId);

export const oktaConfig = {
  issuer,
  clientId,
  redirectUri: getRedirectUri(),
  scopes: parseScopes(import.meta.env.VITE_OKTA_SCOPES),
  adminGroups: parseAdminGroups(import.meta.env.VITE_OKTA_ADMIN_GROUPS),
};

export const oktaAuth = isOktaConfigured
  ? new OktaAuth({
      issuer: oktaConfig.issuer,
      clientId: oktaConfig.clientId,
      redirectUri: oktaConfig.redirectUri,
      scopes: oktaConfig.scopes,
      pkce: true,
      responseType: ["code"],
      tokenManager: {
        storage: "localStorage",
      },
    })
  : null;

// handles normalize groups from claims
export const normalizeGroupsFromClaims = (claims = {}) => {
  const groups = [];

  // handles append
  const append = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        const text = String(entry || "").trim();
        if (text) groups.push(text);
      });
      return;
    }
    const text = String(value || "").trim();
    if (text) groups.push(text);
  };

  append(claims.groups);
  append(claims.Okta_Groups);
  append(claims.okta_groups);

  return groups;
};

// handles is admin from claims
export const isAdminFromClaims = (claims = {}) => {
  const groups = normalizeGroupsFromClaims(claims)
    .map((item) => item.toLowerCase());

  if (!groups.length) return false;

  return groups.some((group) => oktaConfig.adminGroups.has(group));
};

// handles sync local session from claims
export const syncLocalSessionFromClaims = ({ accessToken = "", claims = {} } = {}) => {
  if (typeof window === "undefined") return;

  const token = String(accessToken || "").trim();
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }

  const user = String(
    claims.email
      || claims.email_primary
      || claims.preferred_username
      || claims.NID
      || claims.sub
      || ""
  ).trim();

  if (user) {
    localStorage.setItem("user", user);
  }

  if (isAdminFromClaims(claims)) {
    localStorage.setItem("role", "admin");
  } else {
    localStorage.removeItem("role");
  }
};
