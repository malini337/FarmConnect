
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./Sidebar.css";

function taLabel(language) {
  return language === "ta" ? "புத்திசாலி அம்சங்கள்" : "Smart Features";
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, changeLanguage, t } = useLanguage();

  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const refreshUser = () => {
      setUser(readStoredUser());
    };

    window.addEventListener("farmconnect-profile-updated", refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      window.removeEventListener("farmconnect-profile-updated", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  const role = user?.role || "consumer";
  const normalizedRole = role === "customer" ? "consumer" : role;
  const profileImage = user?.profileImage || "";

  const isImageSource =
    typeof profileImage === "string" &&
    (/^https?:\/\//i.test(profileImage) ||
      /^data:image\//i.test(profileImage) ||
      profileImage.startsWith("/"));

  const getDashboardPath = () => {
    switch (normalizedRole) {
      case "farmer":
        return "/farmer-dashboard";
      case "consumer":
        return "/customer-dashboard";
      case "retailer":
        return "/retailer-dashboard";
      case "wholesaler":
        return "/wholesaler-dashboard";
      default:
        return "/home";
    }
  };

  const goTo = (path) => navigate(path);
  const handleHome = () => goTo(getDashboardPath());

  const handleMyProducts = () => {
    if (normalizedRole === "farmer") {
      goTo("/my-products");
    } else {
      goTo("/products");
    }
  };

  const handleLookingForProduce = () => goTo("/requirements");
  const handleCart = () => goTo("/cart");
  const handleOrders = () => goTo("/orders");
  const handleProfile = () => goTo("/profile");
  const handleSettings = () => goTo("/settings");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;
  const isDashboardActive = () => location.pathname === getDashboardPath();

  const myProductsPath =
    normalizedRole === "farmer" ? "/my-products" : "/products";

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🌱</div>

        {!collapsed && (
          <div className="sidebar-brand-name">{t("brandName")}</div>
        )}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-profile-image">
          {isImageSource ? (
            <img src={profileImage} alt={t("profileImage")} />
          ) : profileImage ? (
            <span>{profileImage}</span>
          ) : (
            <span>👤</span>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-user-info">
            <strong>{user?.name || "User"}</strong>
            <span>
              {normalizedRole === "farmer"
                ? t("farmerDashboard")
                : normalizedRole === "consumer"
                ? t("consumerDashboard")
                : normalizedRole === "retailer"
                ? t("retailerDashboard")
                : normalizedRole === "wholesaler"
                ? t("wholesalerDashboard")
                : ""}
            </span>
          </div>
        )}
      </div>

      <nav className="sidebar-navigation">
        <button
          type="button"
          className={isDashboardActive() ? "sidebar-item active" : "sidebar-item"}
          onClick={handleHome}
          title={t("home")}
        >
          <span className="sidebar-item-icon">🏠</span>
          {!collapsed && (
            <span className="sidebar-item-text">{t("home")}</span>
          )}
        </button>

        <button
          type="button"
          className={isActive(myProductsPath) ? "sidebar-item active" : "sidebar-item"}
          onClick={handleMyProducts}
          title={
            normalizedRole === "farmer"
              ? t("myProducts")
              : t("browseProducts")
          }
        >
          <span className="sidebar-item-icon">🥬</span>
          {!collapsed && (
            <span className="sidebar-item-text">
              {normalizedRole === "farmer"
                ? t("myProducts")
                : t("browseProducts")}
            </span>
          )}
        </button>

        <button
          type="button"
          className={isActive("/requirements") ? "sidebar-item active" : "sidebar-item"}
          onClick={handleLookingForProduce}
          title={t("lookingForProduce")}
        >
          <span className="sidebar-item-icon">🔎</span>
          {!collapsed && (
            <span className="sidebar-item-text">
              {t("lookingForProduce")}
            </span>
          )}
        </button>

        <button
          type="button"
          className={isActive("/features") ? "sidebar-item active" : "sidebar-item"}
          onClick={() => goTo("/features")}
          title="FarmConnect Features"
        >
          <span className="sidebar-item-icon">✨</span>
          {!collapsed && (
            <span className="sidebar-item-text">{taLabel(language)}</span>
          )}
        </button>

        {["consumer", "retailer", "wholesaler"].includes(normalizedRole) && (
          <button
            type="button"
            className={isActive("/cart") ? "sidebar-item active" : "sidebar-item"}
            onClick={handleCart}
            title={t("myCart")}
          >
            <span className="sidebar-item-icon">🛒</span>
            {!collapsed && (
              <span className="sidebar-item-text">{t("myCart")}</span>
            )}
          </button>
        )}

        <button
          type="button"
          className={isActive("/orders") ? "sidebar-item active" : "sidebar-item"}
          onClick={handleOrders}
          title={t("myOrders")}
        >
          <span className="sidebar-item-icon">📦</span>
          {!collapsed && (
            <span className="sidebar-item-text">{t("myOrders")}</span>
          )}
        </button>

        <button
          type="button"
          className={isActive("/profile") ? "sidebar-item active" : "sidebar-item"}
          onClick={handleProfile}
          title={t("myProfile")}
        >
          <span className="sidebar-item-icon">👤</span>
          {!collapsed && (
            <span className="sidebar-item-text">{t("myProfile")}</span>
          )}
        </button>

        <button
          type="button"
          className={isActive("/settings") ? "sidebar-item active" : "sidebar-item"}
          onClick={handleSettings}
          title={t("settings")}
        >
          <span className="sidebar-item-icon">⚙️</span>
          {!collapsed && (
            <span className="sidebar-item-text">{t("settings")}</span>
          )}
        </button>
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && (
          <div className="sidebar-language">
            <span className="sidebar-language-label">{t("language")}</span>

            <div className="sidebar-language-buttons">
              <button
                type="button"
                className={language === "en" ? "language-button active" : "language-button"}
                onClick={() => changeLanguage("en")}
              >
                English
              </button>

              <button
                type="button"
                className={language === "ta" ? "language-button active" : "language-button"}
                onClick={() => changeLanguage("ta")}
              >
                தமிழ்
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="sidebar-item sidebar-collapse-button"
          onClick={() => setCollapsed((previous) => !previous)}
          title={t("collapse")}
        >
          <span className="sidebar-item-icon">
            {collapsed ? "➡️" : "⬅️"}
          </span>
          {!collapsed && (
            <span className="sidebar-item-text">{t("collapse")}</span>
          )}
        </button>

        <button
          type="button"
          className="sidebar-item sidebar-logout"
          onClick={handleLogout}
          title={t("logout")}
        >
          <span className="sidebar-item-icon">🚪</span>
          {!collapsed && (
            <span className="sidebar-item-text">{t("logout")}</span>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
