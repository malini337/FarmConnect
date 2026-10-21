import RoleDashboard from "./RoleDashboard";
import { Navigate } from "react-router-dom";
export default function WholesalerDashboard() {
  const storedRole = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}")?.role; } catch { return null; } })();
  const role = "wholesaler";
  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;
  if (storedRole && storedRole !== role) {
    const destination = { farmer: "/farmer-dashboard", consumer: "/customer-dashboard", retailer: "/retailer-dashboard", wholesaler: "/wholesaler-dashboard" }[storedRole];
    return <Navigate to={destination || "/"} replace />;
  }
  return <RoleDashboard role={role} />;
}
