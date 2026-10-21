
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../context/LanguageContext";
import "./FeatureHub.css";

const API =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// These are the same 15 avatar URLs used by Register.jsx.
const avatars = Array.from({ length: 15 }, (_, index) => ({
  id: index + 1,
  url: `https://api.dicebear.com/9.x/fun-emoji/svg?seed=Farmer${index + 1}`,
}));

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// Keep the saved user details synchronized with the sidebar.
function syncStoredUser(updatedUser) {
  const currentUser = readStoredUser();

  localStorage.setItem(
    "user",
    JSON.stringify({ ...currentUser, ...updatedUser })
  );

  // Notify components in this browser tab immediately.
  window.dispatchEvent(new Event("farmconnect-profile-updated"));
}

export default function ProfileSettings({ settings = false }) {
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const ta = language === "ta";

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
    profileImage: "",
    profileImageType: "none",
    avatarId: null,
    phone: "",
    location: "",
    farmOrBusinessName: "",
  });

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`${API}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load profile.");
        }

        if (cancelled) return;

        const loadedProfile = {
          name: "",
          email: "",
          role: "",
          profileImage: "",
          profileImageType: "none",
          avatarId: null,
          phone: "",
          location: "",
          farmOrBusinessName: "",
          ...data.user,
        };

        setProfile(loadedProfile);
        syncStoredUser(data.user);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load profile.");
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const updateField = (field, value) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/api/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save profile.");
      }

      setProfile((previous) => ({
        ...previous,
        ...data.user,
      }));

      syncStoredUser(data.user);

      setNotice(
        data.message ||
          (ta ? "சுயவிவரம் சேமிக்கப்பட்டது." : "Profile saved successfully.")
      );
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };

  const upload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(
        ta
          ? "JPG, PNG அல்லது WebP படத்தைத் தேர்ந்தெடுக்கவும்."
          : "Use a JPG, PNG or WebP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 300000) {
      setError(
        ta
          ? "படத்தின் அளவு 300 KB-க்குள் இருக்க வேண்டும்."
          : "Image must be under 300 KB."
      );
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previous) => ({
        ...previous,
        profileImage: String(reader.result),
        profileImageType: "upload",
        avatarId: null,
      }));

      setError("");
    };

    reader.onerror = () => {
      setError(ta ? "படத்தைப் படிக்க முடியவில்லை." : "Could not read image.");
    };

    reader.readAsDataURL(file);
  };

  const selectAvatar = (avatar) => {
    setProfile((previous) => ({
      ...previous,
      profileImage: avatar.url,
      profileImageType: "avatar",
      avatarId: avatar.id,
    }));

    setError("");
  };

  const selectedAvatar = avatars.find(
    (avatar) => Number(profile.avatarId) === avatar.id
  );

  const previewImage =
    profile.profileImageType === "avatar"
      ? selectedAvatar?.url || profile.profileImage
      : profile.profileImage;

  const previewIsImage =
    typeof previewImage === "string" &&
    (/^https?:\/\//i.test(previewImage) ||
      /^data:image\//i.test(previewImage));

  return (
    <div className="fc-feature-page">
      <Sidebar />

      <main className="fc-feature-main">
        <header className="fc-feature-header">
          <span>FARMCONNECT · ACCOUNT</span>

          <h1>
            {settings
              ? ta
                ? "அமைப்புகள்"
                : "Settings"
              : ta
              ? "எனது சுயவிவரம்"
              : "My Profile"}
          </h1>

          <p>
            {ta
              ? "உங்கள் சுயவிவர விவரங்களையும் மொழி விருப்பத்தையும் நிர்வகிக்கவும்."
              : "Manage your saved profile details and language preference."}
          </p>
        </header>

        {error && <div className="fc-feature-error">{error}</div>}
        {notice && <div className="fc-feature-notice">{notice}</div>}

        {settings ? (
          <section className="fc-feature-panel">
            <h2>{ta ? "மொழி" : "Language"}</h2>

            <p>
              {ta
                ? "தள மொழியைத் தேர்ந்தெடுக்கவும்."
                : "Choose the website language."}
            </p>

            <button type="button" onClick={() => changeLanguage("en")}>
              English
            </button>{" "}
            <button type="button" onClick={() => changeLanguage("ta")}>
              தமிழ்
            </button>

            <h2 style={{ marginTop: 24 }}>
              {ta ? "கணக்கு பாதுகாப்பு" : "Account security"}
            </h2>

            <p>
              {ta
                ? "கடவுச்சொல் மாற்றத்திற்கு கடவுச்சொல் மீட்டமைப்பு முறையைப் பயன்படுத்தவும்."
                : "Use the password-reset flow to reset your password."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
            >
              {ta ? "கடவுச்சொல்லை மீட்டமை" : "Reset password"}
            </button>

            <p className="fc-feature-method">
              Notification preferences are not yet stored in the current user
              schema, so no fake toggle is shown.
            </p>
          </section>
        ) : (
          <section className="fc-feature-panel">
            <form className="fc-feature-form" onSubmit={save}>
              <label>
                {ta ? "பெயர்" : "Name"}
                <input
                  required
                  maxLength={100}
                  value={profile.name || ""}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                />
              </label>

              <label>
                {ta ? "மின்னஞ்சல்" : "Email"}
                <input value={profile.email || ""} readOnly />
              </label>

              <label>
                {ta ? "பங்கு" : "Role"}
                <input value={profile.role || ""} readOnly />
              </label>

              <label>
                {ta ? "தொலைபேசி" : "Phone"}
                <input
                  maxLength={30}
                  value={profile.phone || ""}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                />
              </label>

              <label>
                {ta ? "இடம்" : "Location"}
                <input
                  maxLength={160}
                  value={profile.location || ""}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                />
              </label>

              <label>
                {ta ? "பண்ணை / வணிகப் பெயர்" : "Farm / business name"}
                <input
                  maxLength={120}
                  value={profile.farmOrBusinessName || ""}
                  onChange={(event) =>
                    updateField("farmOrBusinessName", event.target.value)
                  }
                />
              </label>

              <label>
                {ta ? "படத்தைப் பதிவேற்று" : "Upload profile image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                />
              </label>

              <div className="wide">
                <p>
                  {ta
                    ? "FarmConnect அவதாரைத் தேர்ந்தெடுக்கவும்"
                    : "Choose a built-in FarmConnect avatar"}
                </p>

                <div className="fc-avatar-grid">
                  {avatars.map((avatar) => (
                    <button
                      type="button"
                      key={avatar.id}
                      aria-label={`Select avatar ${avatar.id}`}
                      aria-pressed={
                        Number(profile.avatarId) === avatar.id
                      }
                      className={
                        Number(profile.avatarId) === avatar.id ||
                        profile.profileImage === avatar.url
                          ? "selected"
                          : ""
                      }
                      onClick={() => selectAvatar(avatar)}
                    >
                      <img
                        src={avatar.url}
                        alt={`FarmConnect avatar ${avatar.id}`}
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {previewImage && (
                <div
                  className="wide"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {previewIsImage ? (
                    <img
                      src={previewImage}
                      alt="Profile preview"
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #43834a",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 48 }}>{previewImage}</span>
                  )}

                  <span>{ta ? "தேர்ந்தெடுத்த படம்" : "Selected profile image"}</span>
                </div>
              )}

              <button type="submit" disabled={busy}>
                {busy
                  ? ta
                    ? "சேமிக்கிறது…"
                    : "Saving…"
                  : ta
                  ? "சுயவிவரத்தைச் சேமி"
                  : "Save profile"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
