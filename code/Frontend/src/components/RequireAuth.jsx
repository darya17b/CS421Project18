import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../auth/session";

// Redirects to /login without a session, and away from pages whose role the
// session lacks. This only hides UI; the backend enforces access on every call.
const RequireAuth = ({ children, requiredRole = null, redirectTo = "/dashboard" }) => {
  const session = useSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requiredRole && session.role !== requiredRole) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return children;
};

export default RequireAuth;
