import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  requiredRole?: string;
  requiredRoles?: string[];
}

export default function ProtectedRoute({
  component: Component,
  requiredRole,
  requiredRoles,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("authToken");
  const user = localStorage.getItem("user");

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  const userData = JSON.parse(user);

  // Check if user has required role(s)
  if (requiredRoles && !requiredRoles.includes(userData.role)) {
    return <Navigate to="/" />;
  }

  if (requiredRole && userData.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return <Component />;
}
