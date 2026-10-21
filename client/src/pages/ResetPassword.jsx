
import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./ResetPassword.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
function ResetPassword() {
  const navigate = useNavigate();
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();

  const {
    language,
    changeLanguage,
    t,
  } = useLanguage();

  // Supports both /reset-password/:token and ?token=...
  const token = pathToken || searchParams.get("token");
  const emailLanguage = searchParams.get("language");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const isTamil = language === "ta";

  // Apply the language specified in the reset email.
  useEffect(() => {
    if (
      (emailLanguage === "ta" || emailLanguage === "en") &&
      emailLanguage !== language
    ) {
      changeLanguage(emailLanguage);
    }
  }, [emailLanguage, language, changeLanguage]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError(
        isTamil
          ? "கடவுச்சொல் மாற்றும் இணைப்பு தவறானது. புதிய இணைப்பைக் கோரவும்."
          : "This password reset link is invalid. Please request a new link."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError(
        isTamil
          ? "இரண்டு கடவுச்சொல் புலங்களையும் நிரப்பவும்."
          : "Please fill in both password fields."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        isTamil
          ? "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்."
          : "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        isTamil
          ? "இரண்டு கடவுச்சொற்களும் ஒன்றாக இல்லை."
          : "The passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            language,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isTamil
              ? "கடவுச்சொல்லை மாற்ற முடியவில்லை."
              : "Unable to reset password. The link may have expired.")
        );
      }

      setMessage(
        data.message ||
          (isTamil
            ? "கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது."
            : "Your password has been reset successfully.")
      );

      setPassword("");
      setConfirmPassword("");
      setResetComplete(true);
    } catch (err) {
      setError(
        err.message ||
          (isTamil
            ? "சேவையகத்துடன் இணைக்க முடியவில்லை."
            : "Unable to connect to the server. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      {/* Language switcher */}
      <div className="reset-language-switch">
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

      {/* Reset password card */}
      <div className="reset-card">
        <div className="reset-logo">🔐</div>

        <h1>
          {isTamil ? "கடவுச்சொல்லை மாற்றவும்" : "Reset Password"}
        </h1>

        <p className="reset-subtitle">
          {isTamil
            ? `உங்கள் ${t("brandName")} கணக்கிற்கான புதிய கடவுச்சொல்லை உருவாக்கவும்.`
            : `Create a new password for your ${t("brandName")} account.`}
        </p>

        {!resetComplete ? (
          <form onSubmit={handleSubmit}>
            {/* New password */}
            <div className="reset-field">
              <label htmlFor="reset-password">
                {isTamil ? "புதிய கடவுச்சொல்" : "New Password"}
              </label>

              <div className="reset-password-wrapper">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder={
                    isTamil
                      ? "புதிய கடவுச்சொல்லை உள்ளிடவும்"
                      : "Enter your new password"
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  className="reset-show-password"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword
                    ? isTamil
                      ? "மறை"
                      : "Hide"
                    : isTamil
                      ? "காண்பி"
                      : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="reset-field">
              <label htmlFor="reset-confirm-password">
                {isTamil
                  ? "கடவுச்சொல்லை உறுதிப்படுத்தவும்"
                  : "Confirm Password"}
              </label>

              <div className="reset-password-wrapper">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder={
                    isTamil
                      ? "கடவுச்சொல்லை மீண்டும் உள்ளிடவும்"
                      : "Re-enter your password"
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  className="reset-show-password"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword
                    ? isTamil
                      ? "மறை"
                      : "Hide"
                    : isTamil
                      ? "காண்பி"
                      : "Show"}
                </button>
              </div>
            </div>

            <div className="reset-password-hint">
              🔑{" "}
              {isTamil
                ? "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்."
                : "Password must contain at least 6 characters."}
            </div>

            {error && (
              <div className="reset-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="reset-submit-button"
              disabled={loading || !token}
            >
              {loading
                ? isTamil
                  ? "மாற்றுகிறது..."
                  : "Resetting..."
                : isTamil
                  ? "கடவுச்சொல்லை மாற்றவும்"
                  : "Reset Password"}
            </button>

            {!token && (
              <div className="reset-error" role="alert">
                {isTamil
                  ? "இந்த இணைப்பில் டோக்கன் இல்லை. புதிய இணைப்பைக் கோரவும்."
                  : "The reset token is missing. Please request a new reset email."}
              </div>
            )}
          </form>
        ) : (
          <div className="reset-success-section">
            <div className="reset-success-icon">✓</div>

            <div className="reset-success-message" role="status">
              {message}
            </div>

            <button
              type="button"
              className="reset-login-button"
              onClick={() => navigate("/login")}
            >
              {isTamil ? "உள்நுழைவுக்குச் செல்லவும்" : "Go to Login"}
            </button>
          </div>
        )}

        {!resetComplete && (
          <button
            type="button"
            className="reset-back-button"
            onClick={() => navigate("/login")}
          >
            ←{" "}
            {isTamil
              ? "உள்நுழைவுக்குத் திரும்பு"
              : "Back to Login"}
          </button>
        )}

        <button
          type="button"
          className="reset-home-button"
          onClick={() => navigate("/")}
        >
          🏠{" "}
          {isTamil ? "முகப்புக்குத் திரும்பு" : "Back to Home"}
        </button>
      </div>
    </div>
  );
}

export default ResetPassword;
