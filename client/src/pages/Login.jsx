import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./Login.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
function Login() {
  const navigate = useNavigate();

  const { language, changeLanguage, t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);

  const isTamil = language === "ta";

  useEffect(() => {
    let active = true;
    fetch(`${API}/api/auth/demo-accounts`)
      .then(async (response) => {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return null;
        const data = await response.json();
        return response.ok && data.enabled ? data.accounts : null;
      })
      .then((accounts) => { if (active && Array.isArray(accounts)) setDemoAccounts(accounts); })
      .catch(() => { if (active) setDemoAccounts([]); });
    return () => { active = false; };
  }, []);

  const selectDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError(
        isTamil
          ? "மின்னஞ்சல் மற்றும் கடவுச்சொல்லை உள்ளிடவும்"
          : "Please enter your email and password"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email: email.trim(),
            password,
            language
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (
              isTamil
                ? "உள்நுழைய முடியவில்லை"
                : "Unable to login"
            )
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      const role = data.user?.role;

      if (role === "farmer") {
        navigate("/farmer-dashboard");
      } else if (role === "consumer") {
        navigate("/customer-dashboard");
      } else if (role === "retailer") {
        navigate("/retailer-dashboard");
      } else if (role === "wholesaler") {
        navigate("/wholesaler-dashboard");
      } else {
        setError(
          isTamil
            ? "பயனர் வகை சரியாக இல்லை"
            : "Invalid user role"
        );
      }

    } catch (error) {
      setError(
        error.message ||
          (
            isTamil
              ? "சேவையகத்துடன் இணைக்க முடியவில்லை"
              : "Unable to connect to the server"
          )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Language Switcher */}
      <div className="login-language-switch">

        <button
          type="button"
          className={
            language === "en"
              ? "active"
              : ""
          }
          onClick={() => changeLanguage("en")}
        >
          English
        </button>

        <button
          type="button"
          className={
            language === "ta"
              ? "active"
              : ""
          }
          onClick={() => changeLanguage("ta")}
        >
          தமிழ்
        </button>

      </div>

      {/* Login Card */}
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          🌱
        </div>

        <h1>
          {language === "ta"
            ? "ஃபார்ம்கனெக்ட்"
            : "FarmConnect"}
        </h1>

        <p className="login-subtitle">
          {isTamil
            ? "விவசாயிகளையும் வாங்குபவர்களையும் நேரடியாக இணைக்கிறது"
            : "Connecting farmers and buyers directly"}
        </p>

        <h2>
          {t("welcomeBack")}
        </h2>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div className="login-field">

            <label htmlFor="login-email">
              {t("emailAddress")}
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder={
                isTamil
                  ? "உங்கள் மின்னஞ்சலை உள்ளிடவும்"
                  : "Enter your email address"
              }
              autoComplete="email"
            />

          </div>

          {/* Password */}
          <div className="login-field">

            <label htmlFor="login-password">
              {t("password")}
            </label>

            <div className="login-password-wrapper">

              <input
                id="login-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder={
                  isTamil
                    ? "உங்கள் கடவுச்சொல்லை உள்ளிடவும்"
                    : "Enter your password"
                }
                autoComplete="current-password"
              />

              <button
                type="button"
                className="login-show-password"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword
                  ? t("hide")
                  : t("show")}
              </button>

            </div>

          </div>

          {/* Forgot Password */}
          <button
            type="button"
            className="forgot-password-link"
            onClick={() =>
              navigate("/forgot-password")
            }
          >
            {t("forgotPassword")}
          </button>

          {/* Error */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            className="login-submit-button"
            disabled={loading}
          >
            {loading
              ? (
                isTamil
                  ? "உள்நுழைகிறது..."
                  : "Logging in..."
              )
              : t("login")}
          </button>

        </form>

        {demoAccounts.length > 0 && (
          <section className="demo-account-picker" aria-label="Demo account switcher">
            <h3>Demo account switcher</h3>
            <p>Demo-only accounts. Sign-in still uses normal backend authentication.</p>
            <div className="demo-account-buttons">
              {demoAccounts.map((account) => (
                <button key={account.role} type="button" onClick={() => selectDemoAccount(account)}>
                  {account.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Register */}
        <div className="login-register-section">

          <span>
            {isTamil
              ? "கணக்கு இல்லையா?"
              : "Don't have an account?"}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/register")
            }
          >
            {t("register")}
          </button>

        </div>

        {/* Back to Home */}
        <button
          type="button"
          className="login-home-button"
          onClick={() =>
            navigate("/home")
          }
        >
          🏠{" "}
          {isTamil
            ? "முகப்புக்குத் திரும்பு"
            : "Back to Home"}
        </button>

      </div>

    </div>
  );
}

export default Login;
