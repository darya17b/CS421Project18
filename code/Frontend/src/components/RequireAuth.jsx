import { Navigate, useLocation } from "react-router-dom";
import { useOktaAuth } from '@okta/okta-react';

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const { authState } = useOktaAuth();

  // Legacy auth check (for backward compatibility during migration)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const hasLegacyAuth = token || user;

  // Wait for Okta to finish loading
  if (!authState) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check Okta auth OR legacy auth
  const isAuthenticated = authState.isAuthenticated || hasLegacyAuth;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default RequireAuth;
