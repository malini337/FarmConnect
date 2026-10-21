import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./Register.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
function Register() {
  const navigate = useNavigate();

  const {
    language,
    changeLanguage,
    t
  } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "farmer",
    profileImage: "",
    profileImageType: "none",
    avatarId: null
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [selectedAvatar, setSelectedAvatar] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // BUILT-IN AVATARS
  // =====================================================

  const avatars = [
    {
      id: 1,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer1"
    },
    {
      id: 2,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer2"
    },
    {
      id: 3,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer3"
    },
    {
      id: 4,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer4"
    },
    {
      id: 5,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer5"
    },
    {
      id: 6,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer6"
    },
    {
      id: 7,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer7"
    },
    {
      id: 8,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer8"
    },
    {
      id: 9,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer9"
    },
    {
      id: 10,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer10"
    },
    {
      id: 11,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer11"
    },
    {
      id: 12,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer12"
    },
    {
      id: 13,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer13"
    },
    {
      id: 14,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer14"
    },
    {
      id: 15,
      url: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer15"
    }
  ];


  // =====================================================
  // INPUT HANDLER
  // =====================================================

  const handleChange = (event) => {
    const {
      name,
      value
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };


  // =====================================================
  // AVATAR SELECTION
  // =====================================================

  const handleAvatarSelect = (
    avatar
  ) => {
    setSelectedAvatar(avatar.id);

    setFormData((previous) => ({
      ...previous,
      profileImage: avatar.url,
      profileImageType: "avatar",
      avatarId: avatar.id
    }));

    setError("");
  };


  // =====================================================
  // IMAGE UPLOAD
  // =====================================================

  const handleImageUpload = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        language === "ta"
          ? "படக் கோப்பை மட்டும் தேர்வு செய்யவும்."
          : "Please select an image file."
      );

      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(
        language === "ta"
          ? "படத்தின் அளவு 2 MB-க்கு குறைவாக இருக்க வேண்டும்."
          : "Image size must be less than 2 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setFormData((previous) => ({
        ...previous,
        profileImage:
          reader.result,
        profileImageType:
          "upload",
        avatarId: null
      }));

      setSelectedAvatar(null);

      setError("");
    };

    reader.readAsDataURL(file);
  };


  // =====================================================
  // REGISTER
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      setError(
        language === "ta"
          ? "அனைத்து தேவையான தகவல்களையும் உள்ளிடவும்."
          : "Please fill in all required fields."
      );

      return;
    }

    if (formData.password.length < 6) {
      setError(
        language === "ta"
          ? "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்."
          : "Password must be at least 6 characters."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `${API}/api/auth/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              ...formData,
              language
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (
              language === "ta"
                ? "பதிவு செய்ய முடியவில்லை."
                : "Registration failed"
            )
        );
      }

      setMessage(
        language === "ta"
          ? "பதிவு வெற்றிகரமாக முடிந்தது! உள்நுழைகிறது..."
          : "Registration successful! Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setError(
        error.message ||
          (
            language === "ta"
              ? "பதிவு செய்ய முடியவில்லை."
              : "Registration failed."
          )
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // ROLE DATA
  // =====================================================

  const roles = [
    {
      value: "farmer",
      icon: "👨‍🌾",
      label: t("farmer")
    },
    {
      value: "consumer",
      icon: "🧑",
      label: t("consumer")
    },
    {
      value: "retailer",
      icon: "🏪",
      label: t("retailer")
    },
    {
      value: "wholesaler",
      icon: "🏢",
      label: t("wholesaler")
    }
  ];


  return (
    <div className="register-page">

      {/* =========================================
          LANGUAGE SWITCHER
      ========================================= */}

      <div className="register-language-switch">

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
          EN
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


      {/* =========================================
          REGISTER CARD
      ========================================= */}

      <div className="register-card">

        {/* LOGO */}

        <div className="register-logo">
          🌱
        </div>


        {/* FARMCONNECT BRAND */}

        <div className="register-brand">
          {language === "ta"
            ? "ஃபார்ம்கனெக்ட்"
            : "FarmConnect"}
        </div>


        {/* TITLE */}

        <h1>
          {t("createAccount")}
        </h1>

        <p className="register-subtitle">
          {t("joinMarketplace")}
        </p>


        {/* =========================================
            FORM
        ========================================= */}

        <form
          onSubmit={handleSubmit}
        >

          {/* FULL NAME */}

          <label>
            {t("fullName")}
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={
              t("enterFullName")
            }
            required
          />


          {/* EMAIL */}

          <label>
            {t("emailAddress")}
          </label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={
              t("emailAddress")
            }
            required
          />


          {/* PASSWORD */}

          <label>
            {t("password")}
          </label>

          <div className="register-password-wrapper">

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={
                t("password")
              }
              required
            />

            <button
              type="button"
              className="register-password-toggle"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >
              👁{" "}
              {showPassword
                ? t("hide")
                : t("show")}
            </button>

          </div>


          {/* ACCOUNT TYPE */}

          <label>
            {t("accountType")}
          </label>

          <div className="register-role-grid">

            {roles.map((role) => (
              <label
                key={role.value}
                className={
                  formData.role ===
                  role.value
                    ? "register-role selected"
                    : "register-role"
                }
              >

                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={
                    formData.role ===
                    role.value
                  }
                  onChange={
                    handleChange
                  }
                />

                <span>
                  {role.icon}{" "}
                  {role.label}
                </span>

              </label>
            ))}

          </div>


          {/* PROFILE PICTURE */}

          <label>
            {t("profilePicture")}
          </label>

          <p className="register-image-help">
            {t(
              "chooseAvatarOrUpload"
            )}
          </p>


          {/* AVATAR GRID */}

          <div className="register-avatar-grid">

            {avatars.map(
              (avatar) => (
                <button
                  type="button"
                  key={avatar.id}
                  className={
                    selectedAvatar ===
                    avatar.id
                      ? "register-avatar selected"
                      : "register-avatar"
                  }
                  onClick={() =>
                    handleAvatarSelect(
                      avatar
                    )
                  }
                >

                  <img
                    src={avatar.url}
                    alt={`Avatar ${avatar.id}`}
                  />

                </button>
              )
            )}

          </div>


          {/* UPLOAD */}

          <label
            htmlFor="profile-upload"
            className="register-upload-button"
          >
            📷{" "}
            {t("uploadYourImage")}
          </label>

          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            onChange={
              handleImageUpload
            }
            className="register-file-input"
          />


          {/* PREVIEW */}

          {formData.profileImage && (
            <div className="register-preview">

              <img
                src={
                  formData.profileImage
                }
                alt="Profile preview"
              />

              <span>
                {language === "ta"
                  ? "தேர்ந்தெடுக்கப்பட்ட படம்"
                  : "Selected profile image"}
              </span>

            </div>
          )}


          {/* ERROR */}

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}


          {/* SUCCESS */}

          {message && (
            <div className="register-success">
              {message}
            </div>
          )}


          {/* REGISTER BUTTON */}

          <button
            type="submit"
            className="register-submit-button"
            disabled={loading}
          >
            {loading
              ? language === "ta"
                ? "பதிவு செய்கிறது..."
                : "Creating Account..."
              : t("register")}
          </button>

        </form>


        {/* LOGIN */}

        <div className="register-login-link">

          <span>
            {t(
              "alreadyHaveAccount"
            )}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
          >
            {t("login")}
          </button>

        </div>


        {/* BACK TO HOME */}

        <button
          type="button"
          className="register-home-link"
          onClick={() =>
            navigate("/")
          }
        >
          ←{" "}

          {language === "ta"
            ? "முகப்புக்குத் திரும்பு"
            : "Back to Home"}
        </button>

      </div>
    </div>
  );
}

export default Register;
