import { Navigate, useLocation } from "react-router-dom";

const getStoredRole = () => {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("role") || "").trim().toLowerCase();
};

const RequireAuth = ({ children, requiredRole = null, redirectTo = "/dashboard" }) => {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  if (!token && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole) {
    const role = getStoredRole();
    if (role !== String(requiredRole).trim().toLowerCase()) {
      return <Navigate to={redirectTo} replace state={{ from: location }} />;
    }
  }

  return children;
};

export default RequireAuth;
