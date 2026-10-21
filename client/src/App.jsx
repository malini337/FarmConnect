
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import FarmerDashboard from "./pages/FarmerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import WholesalerDashboard from "./pages/WholesalerDashboard";

import AddProduct from "./pages/AddProduct";
import Products from "./pages/Products";
import CommercePage from "./pages/CommercePage";
import FeatureHub from "./pages/FeatureHub";
import TraceabilityPage from "./pages/TraceabilityPage";
import ProfileSettings from "./pages/ProfileSettings";

import { LanguageProvider } from "./context/LanguageContext";

import "./App.css";

function App() {
  return (
    <LanguageProvider>
      <Routes>
        {/* HOME */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        {/* AUTHENTICATION */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* PASSWORD RESET */}
        <Route
          path="/reset-password/:token"
          element={<ResetPassword />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* DASHBOARDS */}
        <Route
          path="/farmer-dashboard"
          element={<FarmerDashboard />}
        />
        <Route
          path="/customer-dashboard"
          element={<CustomerDashboard />}
        />
        <Route
          path="/retailer-dashboard"
          element={<RetailerDashboard />}
        />
        <Route
          path="/wholesaler-dashboard"
          element={<WholesalerDashboard />}
        />

        {/* FARMER PRODUCT MANAGEMENT */}
        <Route
          path="/add-product"
          element={<AddProduct />}
        />

        {/* MARKETPLACE */}
        <Route
          path="/products"
          element={<Products />}
        />

        {/* COMMERCE */}
        <Route
          path="/requirements"
          element={<CommercePage type="requirements" />}
        />
        <Route
          path="/cart"
          element={<CommercePage type="cart" />}
        />
        <Route
          path="/orders"
          element={<CommercePage type="orders" />}
        />
        <Route
          path="/my-products"
          element={<CommercePage type="products" />}
        />

        {/* PROFILE AND SETTINGS */}
        <Route
          path="/profile"
          element={<ProfileSettings />}
        />
        <Route
          path="/settings"
          element={<ProfileSettings settings />}
        />

        {/* FEATURES AND TRACEABILITY */}
        <Route
          path="/features"
          element={<FeatureHub />}
        />
        <Route
          path="/trace/:token"
          element={<TraceabilityPage />}
        />
        <Route
          path="/scan"
          element={<TraceabilityPage />}
        />

        {/* UNKNOWN URL */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </LanguageProvider>
  );
}

export default App;
