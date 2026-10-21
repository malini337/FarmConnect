import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./ForgotPassword.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
function ForgotPassword() {
  const navigate = useNavigate();

  const {
    language,
    changeLanguage,
    t
  } = useLanguage();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isTamil = language === "ta";

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError(
        isTamil
          ? "மின்னஞ்சல் முகவரியை உள்ளிடவும்"
          : "Please enter your email address"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/auth/forgot-password`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email: email.trim(),
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
                ? "கோரிக்கையை செயல்படுத்த முடியவில்லை"
                : "Unable to process your request"
            )
        );
      }

      setMessage(data.message);
      setEmail("");

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
    <div className="forgot-page">

      {/* =====================================================
          LANGUAGE SWITCH
         ===================================================== */}

      <div className="forgot-language-switch">

        <button
          type="button"
          className={
            language === "en"
              ? "active"
              : ""
          }
          onClick={() =>
            changeLanguage("en")
          }
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
          onClick={() =>
            changeLanguage("ta")
          }
        >
          தமிழ்
        </button>

      </div>


      {/* =====================================================
          FORGOT PASSWORD CARD
         ===================================================== */}

      <div className="forgot-card">

        {/* Logo */}

        <div className="forgot-logo">
          🌱
        </div>


        {/* Heading */}

        <h1>
          {isTamil
            ? "கடவுச்சொல்லை மறந்துவிட்டீர்களா?"
            : "Forgot Password?"}
        </h1>


        {/* Subtitle */}

        <p className="forgot-subtitle">

          {isTamil
            ? `உங்கள் ${t("brandName")} கணக்கிற்கான கடவுச்சொல்லை மாற்ற உங்கள் மின்னஞ்சல் முகவரியை உள்ளிடவும்.`
            : `Enter your email address to reset your ${t("brandName")} password.`}

        </p>


        {/* =================================================
            FORM
           ================================================= */}

        <form onSubmit={handleSubmit}>

          {/* Email Label */}

          <label htmlFor="forgot-email">

            {isTamil
              ? "மின்னஞ்சல் முகவரி"
              : "Email Address"}

          </label>


          {/* Email Input */}

          <input
            id="forgot-email"
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


          {/* Error */}

          {error && (
            <div className="forgot-error">
              {error}
            </div>
          )}


          {/* Success */}

          {message && (
            <div className="forgot-success">
              {message}
            </div>
          )}


          {/* Submit */}

          <button
            type="submit"
            className="forgot-submit-button"
            disabled={loading}
          >

            {loading
              ? (
                isTamil
                  ? "அனுப்புகிறது..."
                  : "Sending..."
              )
              : (
                isTamil
                  ? "மாற்று இணைப்பை அனுப்பவும்"
                  : "Send Reset Link"
              )}

          </button>

        </form>


        {/* =================================================
            BACK TO LOGIN
           ================================================= */}

        <button
          type="button"
          className="forgot-login-button"
          onClick={() =>
            navigate("/login")
          }
        >

          ←{" "}

          {isTamil
            ? "உள்நுழைவுக்குத் திரும்பு"
            : "Back to Login"}

        </button>


        {/* =================================================
            BACK TO HOME
           ================================================= */}

        <button
          type="button"
          className="forgot-home-button"
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

export default ForgotPassword;
