import { Navigate } from "react-router-dom";

const RequireAuth = ({ allowedRole, children }) => {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role"); // "admin" | "manager"

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRole && role !== allowedRole) {
    // Logged in, but wrong portal — bounce to their own dashboard
    return (
      <Navigate
        to={role === "admin" ? "/admin/dashboard" : "/manager/dashboard"}
        replace
      />
    );
  }

  return children;
};

export default RequireAuth;