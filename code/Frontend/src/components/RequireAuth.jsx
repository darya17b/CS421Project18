import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOktaAuth } from "@okta/okta-react";
import { syncLocalSessionFromClaims } from "../oktaConfig";

const getStoredRole = () => {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("role") || "").trim().toLowerCase();
};

const hasLegacySession = () => {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  return Boolean(token || user);
};

const RoleGuard = ({ children, requiredRole, redirectTo = "/dashboard", location }) => {
  if (!requiredRole) return children;

  const role = getStoredRole();
  if (role !== String(requiredRole).trim().toLowerCase()) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children;
};

const RequireAuthLegacy = ({ children, requiredRole = null, redirectTo = "/dashboard" }) => {
  const location = useLocation();

  if (!hasLegacySession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <RoleGuard requiredRole={requiredRole} redirectTo={redirectTo} location={location}>
      {children}
    </RoleGuard>
  );
};

const RequireAuthOkta = ({ children, requiredRole = null, redirectTo = "/dashboard" }) => {
  const location = useLocation();
  const { authState } = useOktaAuth();

  useEffect(() => {
    if (!authState?.isAuthenticated) return;

    const accessToken = authState.accessToken?.accessToken || "";
    const claims = authState.idToken?.claims || {};
    syncLocalSessionFromClaims({ accessToken, claims });
  }, [authState]);

  if (!authState) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const isAuthenticated = Boolean(authState.isAuthenticated) || hasLegacySession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <RoleGuard requiredRole={requiredRole} redirectTo={redirectTo} location={location}>
      {children}
    </RoleGuard>
  );
};

const RequireAuth = ({ children, requiredRole = null, redirectTo = "/dashboard", oktaEnabled = false }) => {
  if (oktaEnabled) {
    return (
      <RequireAuthOkta requiredRole={requiredRole} redirectTo={redirectTo}>
        {children}
      </RequireAuthOkta>
    );
  }

  return (
    <RequireAuthLegacy requiredRole={requiredRole} redirectTo={redirectTo}>
      {children}
    </RequireAuthLegacy>
  );
};

export default RequireAuth;
