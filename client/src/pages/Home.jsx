import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState("home");

  const isTamil = language === "ta";

  const goToTab = (tab) => {
    setActiveTab(tab);

    if (tab === "login") {
      navigate("/login");
      return;
    }

    if (tab === "register") {
      navigate("/register");
      return;
    }

    if (tab === "products") {
      navigate("/products");
      return;
    }
  };

  const products = [
    {
      name: isTamil ? "தக்காளி" : "Tomatoes",
      price: "₹40",
      unit: isTamil ? "/ கிலோ" : "/ kg",
      image:
        "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=600&q=85"
    },
    {
      name: isTamil ? "கேரட்" : "Carrots",
      price: "₹50",
      unit: isTamil ? "/ கிலோ" : "/ kg",
      image:
        "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=600&q=85"
    },
    {
      name: isTamil ? "உருளைக்கிழங்கு" : "Potatoes",
      price: "₹35",
      unit: isTamil ? "/ கிலோ" : "/ kg",
      image:
        "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=85"
    }
  ];

  return (
    <div className="home-page">

      {/* ================= HEADER ================= */}

      <header className="home-header">

        <div
          className="home-brand"
          onClick={() => goToTab("home")}
        >
          <div className="home-brand-icon">
            🌱
          </div>

          <div className="home-brand-text">
            <strong>
              {isTamil ? "ஃபார்ம்கனெக்ட்" : "FarmConnect"}
            </strong>

            <span>
              {isTamil
                ? "பண்ணையிலிருந்து நேரடியாக"
                : "Direct from farm"}
            </span>
          </div>
        </div>

        {/* NAVIGATION */}

        <nav className="home-navigation">

          <button
            type="button"
            className={activeTab === "home" ? "active" : ""}
            onClick={() => {
              setActiveTab("home");
              navigate("/home");
            }}
          >
            {isTamil ? "முகப்பு" : "Home"}
          </button>

          <button
            type="button"
            className={activeTab === "products" ? "active" : ""}
            onClick={() => goToTab("products")}
          >
            {isTamil ? "பொருட்கள்" : "Products"}
          </button>

          <button
            type="button"
            className={activeTab === "about" ? "active" : ""}
            onClick={() => setActiveTab("about")}
          >
            {isTamil ? "எங்களைப் பற்றி" : "About"}
          </button>

          <button
            type="button"
            className={activeTab === "login" ? "active" : ""}
            onClick={() => goToTab("login")}
          >
            {isTamil ? "உள்நுழை" : "Login"}
          </button>

          <button
            type="button"
            className="register-nav-button"
            onClick={() => goToTab("register")}
          >
            {isTamil ? "பதிவு செய்" : "Register"}
          </button>

        </nav>

        {/* LANGUAGE SWITCH */}

        <div className="home-language-switch">

          <button
            type="button"
            className={language === "en" ? "active" : ""}
            onClick={() => changeLanguage("en")}
          >
            English
          </button>

          <button
            type="button"
            className={language === "ta" ? "active" : ""}
            onClick={() => changeLanguage("ta")}
          >
            தமிழ்
          </button>

        </div>

      </header>

      {/* ================= MAIN ================= */}

      <main className="home-main">

        {/* ================= HOME TAB ================= */}

        {activeTab === "home" && (
          <section className="home-content">

            {/* LEFT SIDE */}

            <div className="home-left">

              <div className="home-badge">
                🌾{" "}
                {isTamil
                  ? "பண்ணையிலிருந்து நேரடியாக உங்களுக்கு"
                  : "DIRECT FROM FARM TO YOU"}
              </div>

              <h1>

                <span className="heading-green">
                  {isTamil
                    ? "புதிய விளைபொருட்கள்."
                    : "Fresh Produce."}
                </span>

                <br />

                <span className="heading-orange">
                  {isTamil
                    ? "நியாயமான விலைகள்."
                    : "Fair Prices."}
                </span>

              </h1>

              <p className="home-description">
                {isTamil
                  ? "விவசாயிகளிடமிருந்து நேரடியாக புதிய விவசாயப் பொருட்களை வாங்குங்கள். வெளிப்படையான விலை மற்றும் AI உதவியுடன் தரச் சரிபார்ப்புடன்."
                  : "Buy fresh farm produce directly from farmers, with transparent pricing and AI-assisted quality verification."}
              </p>

              <div className="home-action-buttons">

                <button
                  type="button"
                  className="explore-button"
                  onClick={() => goToTab("products")}
                >
                  {isTamil
                    ? "பொருட்களைப் பார்க்க"
                    : "Explore Products"}
                  <span>→</span>
                </button>

                <button
                  type="button"
                  className="sell-button"
                  onClick={() => goToTab("register")}
                >
                  {isTamil
                    ? "உங்கள் விளைபொருளை விற்க"
                    : "Sell Your Produce"}
                </button>

              </div>

              {/* FEATURES */}

              <div className="home-features">

                <div className="feature-card">

                  <div className="feature-icon">
                    👨‍🌾
                  </div>

                  <div>
                    <strong>
                      {isTamil
                        ? "நேரடி விவசாயிகள்"
                        : "Direct Farmers"}
                    </strong>

                    <span>
                      {isTamil
                        ? "இடைத்தரகர் இல்லை"
                        : "No middlemen"}
                    </span>
                  </div>

                </div>

                <div className="feature-card">

                  <div className="feature-icon">
                    📷
                  </div>

                  <div>
                    <strong>
                      {isTamil
                        ? "நேரடி சரிபார்ப்பு"
                        : "Live Verification"}
                    </strong>

                    <span>
                      {isTamil
                        ? "AI உதவியுடன்"
                        : "AI-assisted"}
                    </span>
                  </div>

                </div>

                <div className="feature-card">

                  <div className="feature-icon">
                    💰
                  </div>

                  <div>
                    <strong>
                      {isTamil
                        ? "நியாயமான விலை"
                        : "Fair Pricing"}
                    </strong>

                    <span>
                      {isTamil
                        ? "வெளிப்படையானது"
                        : "Transparent"}
                    </span>
                  </div>

                </div>

              </div>

            </div>

            {/* RIGHT SIDE */}

            <div className="home-right">

              {/* MAIN TOMATO CARD */}

              <div className="farm-fresh-card">

                <img
                  src="https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=1200&q=90"
                  alt="Fresh farm tomatoes"
                />

                <div className="farm-fresh-overlay">

                  <div>
                    <h2>
                      {isTamil
                        ? "பண்ணை புதியது"
                        : "Farm Fresh"}
                    </h2>

                    <p>
                      {isTamil
                        ? "விவசாயிகளிடமிருந்து நேரடியாக தரமான விளைபொருட்கள்"
                        : "Quality produce directly from farmers"}
                    </p>
                  </div>

                  <span className="fresh-arrow">
                    ↗
                  </span>

                </div>

              </div>

              {/* PRODUCT CARDS */}

              <div className="home-product-cards">

                {products.map((product) => (
                  <div
                    className="home-product-card"
                    key={product.name}
                  >

                    <div className="product-image-wrapper">

                      <img
                        src={product.image}
                        alt={product.name}
                      />

                    </div>

                    <div className="product-card-info">

                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        <b>{product.price}</b>{" "}
                        {product.unit}
                      </span>

                    </div>

                  </div>
                ))}

              </div>

            </div>

          </section>
        )}

        {/* ================= ABOUT TAB ================= */}

        {activeTab === "about" && (
          <section className="about-tab">

            <div className="about-card">

              <div className="about-icon">
                🌱
              </div>

              <h1>
                {isTamil
                  ? "ஃபார்ம்கனெக்ட் பற்றி"
                  : "About FarmConnect"}
              </h1>

              <p>
                {isTamil
                  ? "ஃபார்ம்கனெக்ட் என்பது விவசாயிகளையும் நுகர்வோர், சில்லறை விற்பனையாளர்கள் மற்றும் மொத்த விற்பனையாளர்களையும் நேரடியாக இணைக்கும் விவசாய சந்தைத் தளமாகும்."
                  : "FarmConnect is a direct agricultural marketplace that connects farmers with consumers, retailers and wholesalers."}
              </p>

              <div className="about-feature-grid">

                <div>
                  <span>👨‍🌾</span>
                  <strong>
                    {isTamil
                      ? "விவசாயிகளுக்கு நேரடி சந்தை"
                      : "Direct Farmer Access"}
                  </strong>
                </div>

                <div>
                  <span>📷</span>
                  <strong>
                    {isTamil
                      ? "AI தரச் சரிபார்ப்பு"
                      : "AI Quality Verification"}
                  </strong>
                </div>

                <div>
                  <span>💰</span>
                  <strong>
                    {isTamil
                      ? "வெளிப்படையான விலை"
                      : "Transparent Pricing"}
                  </strong>
                </div>

                <div>
                  <span>🤝</span>
                  <strong>
                    {isTamil
                      ? "நேரடி இணைப்பு"
                      : "Direct Connections"}
                  </strong>
                </div>

              </div>

              <button
                type="button"
                className="about-back-button"
                onClick={() => setActiveTab("home")}
              >
                ←{" "}
                {isTamil
                  ? "முகப்புக்குத் திரும்பு"
                  : "Back to Home"}
              </button>

            </div>

          </section>
        )}

      </main>

      {/* ================= FOOTER STRIP ================= */}

      <div className="home-footer-strip">

        <span>
          🌾{" "}
          {isTamil
            ? "விவசாயிகளிடமிருந்து நேரடியாக"
            : "Direct from farmers"}
        </span>

        <span>•</span>

        <span>
          📷{" "}
          {isTamil
            ? "AI உதவியுடன் சரிபார்ப்பு"
            : "AI-assisted verification"}
        </span>

        <span>•</span>

        <span>
          💚{" "}
          {isTamil
            ? "நியாயமான விலை"
            : "Fair prices"}
        </span>

      </div>

    </div>
  );
}

export default Home;