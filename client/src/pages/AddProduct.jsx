
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { PRODUCT_CATEGORIES as CANONICAL_CATEGORIES } from "../constants/categories";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const CATEGORY_TAMIL = {
  "Vegetables": "காய்கறிகள்", "Fruits": "பழங்கள்", "Grains": "தானியங்கள்",
  "Pulses": "பருப்பு வகைகள்", "Spices": "மசாலாப் பொருட்கள்", "Flowers": "மலர்கள்",
  "Dairy Products": "பால் பொருட்கள்", "Seeds": "விதைகள்", "Oilseeds": "எண்ணெய் வித்துக்கள்",
  "Nuts": "கொட்டை வகைகள்", "Honey": "தேன்", "Other Agricultural Products": "பிற வேளாண் பொருட்கள்", "Others": "மற்றவை"
};
const PRODUCT_CATEGORIES = CANONICAL_CATEGORIES.map(value => ({ value, en: value, ta: CATEGORY_TAMIL[value] || value }));

const PRODUCT_UNITS = [
  { value: "kg", en: "Kilograms (kg)", ta: "கிலோகிராம் (kg)" },
  { value: "g", en: "Grams (g)", ta: "கிராம் (g)" },
  { value: "quintal", en: "Quintal (q)", ta: "குவிண்டால் (q)" },
  { value: "ton", en: "Ton", ta: "டன்" },
  { value: "piece", en: "Piece", ta: "எண்ணிக்கை" },
  { value: "dozen", en: "Dozen", ta: "டஜன்" },
  { value: "litre", en: "Litre (L)", ta: "லிட்டர் (L)" },
  { value: "ml", en: "Millilitre (mL)", ta: "மில்லிலிட்டர் (mL)" },
  { value: "bundle", en: "Bundle", ta: "கட்டு" },
  { value: "bag", en: "Bag", ta: "பை" },
  { value: "box", en: "Box", ta: "பெட்டி" },
];

const INITIAL_FORM = {
  name: "",
  category: "",
  description: "",
  location: "",
  harvestDate: "",
  certifications: "",
  declaredQuantity: "",
  unit: "kg",
  expectedPrice: "",
};

function AddProduct() {
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const isTamil = language === "ta";

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const redirectTimerRef = useRef(null);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const text = useCallback(
    (english, tamil) => (isTamil ? tamil : english),
    [isTamil]
  );

  const selectedUnit = PRODUCT_UNITS.find(
    (unit) => unit.value === formData.unit
  );

  const priceUnitLabel = selectedUnit
    ? isTamil
      ? selectedUnit.ta
      : selectedUnit.en
    : formData.unit;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraStarted || !videoRef.current || !streamRef.current) {
      return undefined;
    }

    const video = videoRef.current;
    let cancelled = false;

    const markReady = () => {
      if (!cancelled && video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
        setCameraError("");
      }
    };

    video.srcObject = streamRef.current;
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);

    video.play().then(markReady).catch((err) => {
      console.error("Camera playback error:", err);

      if (!cancelled) {
        setCameraError(
          text(
            "Camera playback failed. Check your browser permissions.",
            "கேமரா இயங்கவில்லை. உலாவி அனுமதிகளைச் சரிபார்க்கவும்."
          )
        );
      }
    });

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
    };
  }, [cameraStarted, isTamil, text]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  };

  const startCamera = async () => {
    setCameraError("");
    setError("");
    setMessage("");
    setCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        text(
          "Camera access is unavailable. Use Chrome or Edge on localhost or HTTPS.",
          "கேமரா வசதி கிடைக்கவில்லை. localhost அல்லது HTTPS-இல் Chrome அல்லது Edge பயன்படுத்தவும்."
        )
      );
      return;
    }

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStarted(true);
    } catch (err) {
      console.error("Camera access error:", err);

      setCameraError(
        text(
          "Unable to open the camera. Allow camera permission and close other apps using it.",
          "கேமராவைத் திறக்க முடியவில்லை. கேமரா அனுமதியை வழங்கி, அதைப் பயன்படுத்தும் பிற செயலிகளை மூடவும்."
        )
      );
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      !cameraReady ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError(
        text(
          "The camera is not ready. Wait for the preview and try again.",
          "கேமரா தயாராகவில்லை. காட்சி தோன்றியதும் மீண்டும் முயற்சிக்கவும்."
        )
      );
      return;
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const scale = Math.min(
      1,
      700 / Math.max(sourceWidth, sourceHeight)
    );

    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError(
        text("Unable to capture the image.", "படத்தைப் பதிவு செய்ய முடியவில்லை.")
      );
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.58));
    setAiResult(null);
    setCameraError("");
    setError("");
    setMessage("");
    stopCamera();
  };

  const retakeImage = async () => {
    setCapturedImage("");
    setAiResult(null);
    setError("");
    setMessage("");
    await startCamera();
  };

  const analyzeImage = async () => {
    if (!capturedImage) {
      setError(text("Capture an image first.", "முதலில் ஒரு படத்தை எடுக்கவும்."));
      return;
    }

    if (!formData.name.trim() || !formData.category) {
      setError(
        text(
          "Enter the produce name and select its category before AI verification.",
          "AI சரிபார்ப்பிற்கு முன் விளைபொருளின் பெயரையும் வகையையும் தேர்ந்தெடுக்கவும்."
        )
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError(text("Please log in first.", "முதலில் உள்நுழையவும்."));
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-produce`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: capturedImage,
          productName: formData.name.trim(),
          category: formData.category,
          declaredQuantity: formData.declaredQuantity || "",
          unit: formData.unit,
          language: isTamil ? "ta" : "en",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            text(
              `AI verification failed (${response.status}).`,
              `AI சரிபார்ப்பு தோல்வியடைந்தது (${response.status}).`
            )
        );
      }

      if (!data.analysis || typeof data.analysis !== "object") {
        throw new Error(
          text(
            "The AI response did not contain a valid assessment.",
            "AI மதிப்பீடு சரியான முடிவை வழங்கவில்லை."
          )
        );
      }

      const enrichedAnalysis = {
        ...data.analysis,
        assessmentToken: data.assessmentToken,
      };

      try {
        const priceResponse = await fetch(
          `${API_URL}/api/features/price-recommendation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              category: formData.category,
              unit: formData.unit,
              expectedPrice: formData.expectedPrice || "",
              location: formData.location || "",
              language: isTamil ? "ta" : "en",
            }),
          }
        );

        const priceData = await priceResponse.json().catch(() => ({}));

        enrichedAnalysis.priceRecommendation = priceResponse.ok
          ? priceData
          : {
              status: "insufficient_data",
              explanation:
                "Price reference lookup failed; enter your own expected price.",
            };
      } catch {
        enrichedAnalysis.priceRecommendation = {
          status: "insufficient_data",
          explanation:
            "Price reference service is unavailable; enter your own expected price.",
        };
      }

      setAiResult(enrichedAnalysis);

      if (data.analysis.isProduce === false) {
        setMessage(
          text(
            "No produce was detected. Retake the image with the produce clearly visible.",
            "விளைபொருள் கண்டறியப்படவில்லை. விளைபொருள் தெளிவாகத் தெரியும் வகையில் மீண்டும் படம் எடுக்கவும்."
          )
        );
      } else if (data.message) {
        setMessage(data.message);
      }
    } catch (err) {
      console.error("Gemini produce analysis error:", err);
      setError(
        err.message ||
          text(
            "AI analysis failed. Check the backend server and try again.",
            "AI மதிப்பீடு தோல்வியடைந்தது. பின்தள சேவையகத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்."
          )
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formData.name.trim()) {
      setError(text("Enter the produce name.", "விளைபொருளின் பெயரை உள்ளிடவும்."));
      return;
    }

    if (!PRODUCT_CATEGORIES.some((item) => item.value === formData.category)) {
      setError(text("Select a valid category.", "சரியான வகையைத் தேர்ந்தெடுக்கவும்."));
      return;
    }

    if (
      !formData.declaredQuantity ||
      !Number.isFinite(Number(formData.declaredQuantity)) ||
      Number(formData.declaredQuantity) <= 0
    ) {
      setError(text("Enter a valid quantity.", "சரியான அளவை உள்ளிடவும்."));
      return;
    }

    if (!PRODUCT_UNITS.some((unit) => unit.value === formData.unit)) {
      setError(text("Select a valid unit.", "சரியான அலகைத் தேர்ந்தெடுக்கவும்."));
      return;
    }

    if (
      !formData.expectedPrice ||
      !Number.isFinite(Number(formData.expectedPrice)) ||
      Number(formData.expectedPrice) <= 0
    ) {
      setError(text("Enter a valid price.", "சரியான விலையை உள்ளிடவும்."));
      return;
    }

    if (!capturedImage) {
      setError(
        text(
          "Capture a live-camera image before listing your produce.",
          "விளைபொருளைப் பட்டியலிடுவதற்கு முன் நேரடி கேமராவில் படம் எடுக்கவும்."
        )
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError(text("Please log in first.", "முதலில் உள்நுழையவும்."));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          declaredQuantity: Number(formData.declaredQuantity),
          expectedPrice: Number(formData.expectedPrice),
          imageUrl: capturedImage,
          assessmentToken: aiResult?.assessmentToken || "",
          language: isTamil ? "ta" : "en",
          assessment: aiResult
            ? {
                appearanceScore: aiResult.appearanceScore,
                verificationScore: aiResult.verificationScore,
                verificationScoreMethod: aiResult.verificationScoreMethod,
                verificationScoreReasons: aiResult.verificationScoreReasons,
                observations: aiResult.observations,
                visibleIssues: aiResult.visibleIssues,
                confidence: aiResult.confidence,
                quantityStatus: aiResult.quantityStatus,
                assessedAt: new Date().toISOString(),
              }
            : {},
          priceRecommendation: aiResult?.priceRecommendation || {},
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            text(
              "Unable to create the product.",
              "விளைபொருளைச் சேர்க்க முடியவில்லை."
            )
        );
      }

      setMessage(
        text(
          "Product listed successfully!",
          "விளைபொருள் வெற்றிகரமாகப் பட்டியலிடப்பட்டது!"
        )
      );

      setFormData(INITIAL_FORM);
      setCapturedImage("");
      setAiResult(null);

      redirectTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) navigate("/farmer-dashboard");
      }, 1200);
    } catch (err) {
      console.error("Product creation error:", err);
      setError(err.message || "Unable to create the product.");
    } finally {
      setLoading(false);
    }
  };

  const detectedName =
    (isTamil
      ? aiResult?.detectedProduceTamil
      : aiResult?.detectedProduceEnglish) ||
    aiResult?.detectedProduce ||
    aiResult?.detectedProduceEnglish ||
    aiResult?.detectedProduceTamil ||
    text("Unknown", "தெரியவில்லை");

  const estimatedRange = aiResult?.estimatedWeightRangeGrams;

  const rangeText =
    estimatedRange && typeof estimatedRange === "object"
      ? `${estimatedRange.min ?? "?"}–${estimatedRange.max ?? "?"} g`
      : estimatedRange != null
        ? String(estimatedRange)
        : text("Unavailable", "கிடைக்கவில்லை");

  const observations =
    (isTamil
      ? aiResult?.observationsTamil
      : aiResult?.observationsEnglish) ||
    aiResult?.observations ||
    text("No observations returned.", "கவனிப்புகள் எதுவும் கிடைக்கவில்லை.");

  const appearanceReasons = Array.isArray(aiResult?.appearanceScoreReasons)
    ? aiResult.appearanceScoreReasons
    : [];

  const visibleIssues = Array.isArray(aiResult?.visibleIssues)
    ? aiResult.visibleIssues
    : [];

  const quantityStatusText = {
    roughly_consistent: text(
      "The visual estimate did not flag a large difference. This is not a weight measurement.",
      "காட்சி மதிப்பீட்டில் பெரிய வேறுபாடு குறிக்கப்படவில்லை. இது உண்மையான எடை அளவீடு அல்ல."
    ),
    review_recommended: text(
      "A possible difference was detected. Weigh the produce manually before confirming the quantity.",
      "சாத்தியமான வேறுபாடு கண்டறியப்பட்டது. அளவை உறுதிப்படுத்துவதற்கு முன் தராசில் எடை பார்க்கவும்."
    ),
    product_mismatch_review: text(
      "The product may not match the selected name. Quantity comparison may not be reliable.",
      "படத்தில் உள்ள விளைபொருள் தேர்ந்தெடுத்த பெயருடன் பொருந்தாமல் இருக்கலாம். அளவு ஒப்பீடு நம்பகமானதாக இருக்காது."
    ),
    not_assessed: text(
      "Quantity could not be assessed reliably.",
      "அளவை நம்பகமாக மதிப்பிட முடியவில்லை."
    ),
  };

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div>
          <div style={styles.brand}>{text("FarmConnect", "ஃபார்ம்கனெக்ட்")}</div>
          <div style={styles.topSubtitle}>
            {text(
              "List your produce with AI-assisted verification",
              "AI உதவியுடன் உங்கள் விளைபொருளைப் பட்டியலிடுங்கள்"
            )}
          </div>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.languageSwitch}>
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              style={{
                ...styles.languageButton,
                ...(language === "en" ? styles.activeLanguage : {}),
              }}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("ta")}
              style={{
                ...styles.languageButton,
                ...(language === "ta" ? styles.activeLanguage : {}),
              }}
            >
              தமிழ்
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer-dashboard")}
            style={styles.backButton}
          >
            ← {text("Dashboard", "டாஷ்போர்டு")}
          </button>
        </div>
      </header>

      <main style={styles.content}>
        <div style={styles.pageHeading}>
          <h1 style={styles.pageTitle}>
            {text("Add Your Produce", "விளைபொருளைச் சேர்க்கவும்")}
          </h1>
          <p style={styles.pageDescription}>
            {text(
              "Enter your produce details, capture a live-camera image, and review the AI's preliminary assessment.",
              "விளைபொருள் விவரங்களை உள்ளிட்டு, நேரடி கேமராவில் படம் எடுத்து, AI-யின் ஆரம்பநிலை மதிப்பீட்டைப் பாருங்கள்."
            )}
          </p>
        </div>

        {error && <div role="alert" style={styles.errorBox}>{error}</div>}
        {message && <div role="status" style={styles.successBox}>{message}</div>}

        <div className="add-product-grid" style={styles.mainGrid}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>🌱</span>
              <h2 style={styles.cardTitle}>
                {text("Produce Details", "விளைபொருள் விவரங்கள்")}
              </h2>
              <p style={styles.cardSubtitle}>
                {text(
                  "Provide the details buyers need",
                  "வாங்குபவர்களுக்குத் தேவையான விவரங்களை வழங்கவும்"
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label htmlFor="produce-name" style={styles.label}>
                  {text("Produce Name", "விளைபொருளின் பெயர்")}
                </label>
                <input
                  id="produce-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={text("e.g. Tomato", "எ.கா. தக்காளி")}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="produce-category" style={styles.label}>
                  {text("Category", "வகை")}
                </label>
                <select
                  id="produce-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="">
                    {text("Select category", "வகையைத் தேர்ந்தெடுக்கவும்")}
                  </option>
                  {PRODUCT_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {isTamil ? item.ta : item.en}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="produce-description" style={styles.label}>
                  {text("Description", "விளக்கம்")}
                </label>
                <textarea
                  id="produce-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={text("Describe your produce...", "உங்கள் விளைபொருளைப் பற்றி எழுதவும்...")}
                  style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="produce-location" style={styles.label}>
                  {text("Farm Location", "பண்ணை அமைவிடம்")}
                </label>
                <input
                  id="produce-location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder={text("Village, town or district", "கிராமம், நகரம் அல்லது மாவட்டம்")}
                  maxLength={160}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="harvest-date" style={styles.label}>
                  {text("Harvest Date", "அறுவடை தேதி")}
                </label>
                <input
                  id="harvest-date"
                  name="harvestDate"
                  type="date"
                  value={formData.harvestDate}
                  onChange={handleChange}
                  max={new Date().toISOString().slice(0, 10)}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="produce-certifications" style={styles.label}>
                  {text("Certifications (Optional)", "சான்றிதழ்கள் (விருப்பமானது)")}
                </label>
                <input
                  id="produce-certifications"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  placeholder={text(
                    "e.g. Organic certificate, if applicable",
                    "எ.கா. இயற்கை விவசாயச் சான்றிதழ், இருந்தால்"
                  )}
                  maxLength={1000}
                  style={styles.input}
                />
                <small style={styles.fieldHelp}>
                  {text(
                    "Enter only certifications you actually hold. Separate multiple entries with commas.",
                    "உங்களிடம் உண்மையில் உள்ள சான்றிதழ்களை மட்டும் உள்ளிடவும். பலவற்றை காற்புள்ளியால் பிரிக்கவும்."
                  )}
                </small>
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="produce-quantity" style={styles.label}>
                  {text("Declared Quantity", "அறிவிக்கப்பட்ட அளவு")}
                </label>

                <div className="quantity-grid" style={styles.quantityGrid}>
                  <input
                    id="produce-quantity"
                    name="declaredQuantity"
                    type="number"
                    min="0.01"
                    step="any"
                    value={formData.declaredQuantity}
                    onChange={handleChange}
                    placeholder={text("e.g. 2", "எ.கா. 2")}
                    style={styles.input}
                    required
                  />

                  <select
                    name="unit"
                    aria-label={text("Quantity unit", "அளவு அலகு")}
                    value={formData.unit}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  >
                    {PRODUCT_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {isTamil ? unit.ta : unit.en}
                      </option>
                    ))}
                  </select>
                </div>
                <small style={styles.fieldHelp}>
                  {text(
                    "Choose the unit that matches how you sell this produce.",
                    "இந்த விளைபொருளை விற்கும் முறைக்கு ஏற்ற அலகைத் தேர்ந்தெடுக்கவும்."
                  )}
                </small>
              </div>

              <div style={styles.fieldGroup}>
                <label htmlFor="expected-price" style={styles.label}>
                  {text(
                    `Expected Price (₹ per ${formData.unit})`,
                    `எதிர்பார்க்கும் விலை (₹ / ${priceUnitLabel})`
                  )}
                </label>
                <input
                  id="expected-price"
                  name="expectedPrice"
                  type="number"
                  min="0.01"
                  step="any"
                  value={formData.expectedPrice}
                  onChange={handleChange}
                  placeholder={text("e.g. 40", "எ.கா. 40")}
                  style={styles.input}
                  required
                />
                <small style={styles.fieldHelp}>
                  {text(
                    `Enter the price for one ${formData.unit}.`,
                    `ஒரு ${priceUnitLabel} அலகிற்கான விலையை உள்ளிடவும்.`
                  )}
                </small>
              </div>

              <button
                type="submit"
                disabled={loading || !capturedImage || aiLoading}
                style={{
                  ...styles.primaryButton,
                  opacity: loading || !capturedImage || aiLoading ? 0.6 : 1,
                }}
              >
                {loading
                  ? text("Listing Produce...", "பட்டியலிடப்படுகிறது...")
                  : text("🌿 List My Produce", "🌿 விளைபொருளைப் பட்டியலிடு")}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>📷</span>
              <h2 style={styles.cardTitle}>
                {text("Live Camera Verification", "நேரடி கேமரா சரிபார்ப்பு")}
              </h2>
              <p style={styles.cardSubtitle}>
                {text(
                  "Capture the actual produce for AI review",
                  "AI மதிப்பீட்டிற்காக உண்மையான விளைபொருளைப் படம் எடுக்கவும்"
                )}
              </p>
            </div>

            <div style={styles.cameraContent}>
              <div style={styles.cameraNotice}>
                <strong>🔒 {text("Live Camera Only", "நேரடி கேமரா மட்டும்")}</strong>
                <p>
                  {text(
                    "This page uses live camera capture and does not offer image-file upload.",
                    "இந்தப் பக்கம் நேரடி கேமராவைப் பயன்படுத்துகிறது; படக் கோப்பைப் பதிவேற்றும் வசதி இல்லை."
                  )}
                </p>
              </div>

              {!cameraStarted && !capturedImage && (
                <div style={styles.cameraStartBox}>
                  <div style={styles.cameraIllustration}>📸</div>
                  <h3>{text("Capture Your Produce", "விளைபொருளைப் படம் எடுக்கவும்")}</h3>
                  <p>
                    {text(
                      "Place the produce in clear light and keep it visible in the camera.",
                      "நல்ல வெளிச்சத்தில் விளைபொருளை கேமராவிற்கு முன் தெளிவாக வைக்கவும்."
                    )}
                  </p>
                  <button type="button" onClick={startCamera} style={styles.primaryButton}>
                    📷 {text("Start Camera", "கேமராவைத் தொடங்கு")}
                  </button>
                </div>
              )}

              {cameraStarted && (
                <div style={styles.liveCameraContainer}>
                  <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
                  <div style={styles.liveBadge}>
                    ● {cameraReady ? text("LIVE", "நேரலை") : text("Connecting...", "இணைக்கிறது...")}
                  </div>

                  {!cameraReady && (
                    <p style={styles.cameraHint}>
                      {text("Waiting for camera preview...", "கேமரா காட்சிக்காகக் காத்திருக்கிறது...")}
                    </p>
                  )}

                  <div style={styles.cameraControls}>
                    <button
                      type="button"
                      onClick={captureImage}
                      disabled={!cameraReady}
                      style={styles.primaryButton}
                    >
                      ● {text("Capture", "படம் எடுக்கவும்")}
                    </button>
                    <button type="button" onClick={stopCamera} style={styles.secondaryButton}>
                      {text("Stop Camera", "கேமராவை நிறுத்து")}
                    </button>
                  </div>
                </div>
              )}

              {cameraError && <div role="alert" style={styles.errorBox}>{cameraError}</div>}

              {capturedImage && (
                <div style={styles.previewSection}>
                  <div style={styles.previewHeader}>
                    <h3>{text("Captured Image", "பதிவு செய்யப்பட்ட படம்")}</h3>
                    <button type="button" onClick={retakeImage} style={styles.secondaryButton}>
                      🔄 {text("Retake", "மீண்டும் எடுக்கவும்")}
                    </button>
                  </div>

                  <img
                    src={capturedImage}
                    alt={text("Captured produce", "பதிவு செய்யப்பட்ட விளைபொருள்")}
                    style={styles.previewImage}
                  />

                  <button
                    type="button"
                    onClick={analyzeImage}
                    disabled={aiLoading}
                    style={{ ...styles.aiButton, opacity: aiLoading ? 0.65 : 1 }}
                  >
                    {aiLoading
                      ? text("Analysing with Gemini...", "Gemini மூலம் பகுப்பாய்வு செய்யப்படுகிறது...")
                      : text("✨ Verify with Gemini AI", "✨ Gemini AI மூலம் சரிபார்க்கவும்")}
                  </button>

                  {aiLoading && (
                    <p style={styles.loadingHint}>
                      {text(
                        "Checking product identity, estimated quantity and visible appearance. This may take a moment.",
                        "விளைபொருள் அடையாளம், தோராயமான அளவு மற்றும் வெளிப்புறத் தோற்றம் சரிபார்க்கப்படுகிறது."
                      )}
                    </p>
                  )}
                </div>
              )}

              {aiResult && (
                <div style={styles.aiResultCard} role="status">
                  <h3 style={styles.resultTitle}>
                    🌿 {text("AI Produce Assessment", "AI விளைபொருள் மதிப்பீடு")}
                  </h3>

                  <section style={styles.resultSection}>
                    <h4>{text("1. Product Name Verification", "1. விளைபொருள் பெயர் சரிபார்ப்பு")}</h4>
                    <p style={styles.resultText}>
                      <strong>{text("Selected product:", "தேர்ந்தெடுத்த விளைபொருள்:")}</strong>{" "}
                      {formData.name}
                    </p>
                    <p style={styles.resultText}>
                      <strong>{text("Detected product:", "கண்டறியப்பட்ட விளைபொருள்:")}</strong>{" "}
                      {detectedName}
                    </p>

                    {aiResult.isProduce === false ? (
                      <p style={styles.warningText}>
                        {text(
                          "No produce was verified. Retake the photo before listing.",
                          "விளைபொருள் உறுதிப்படுத்தப்படவில்லை. மீண்டும் படம் எடுக்கவும்."
                        )}
                      </p>
                    ) : aiResult.productMatchStatus === "possible_mismatch" ||
                      aiResult.quantityStatus === "product_mismatch_review" ? (
                      <p style={styles.warningText}>
                        {text(
                          "Possible product mismatch. Confirm the selected name before listing.",
                          "விளைபொருள் பெயர் பொருந்தாமல் இருக்கலாம். பெயரைச் சரிபார்க்கவும்."
                        )}
                      </p>
                    ) : aiResult.productMatchStatus === "match" ? (
                      <p style={styles.matchText}>
                        {text(
                          "The selected product appears to match the image. This is an AI opinion, not proof.",
                          "தேர்ந்தெடுத்த விளைபொருள் படத்துடன் பொருந்துவது போல் தெரிகிறது. இது AI கருத்து மட்டுமே."
                        )}
                      </p>
                    ) : (
                      <p style={styles.resultText}>
                        {text("Review the detected name manually before listing.", "பட்டியலிடுவதற்கு முன் பெயரைச் சரிபார்க்கவும்.")}
                      </p>
                    )}
                  </section>

                  <section style={styles.resultSection}>
                    <h4>{text("2. Quantity Comparison", "2. அளவு ஒப்பீடு")}</h4>
                    <p style={styles.resultText}>
                      <strong>{text("Your declared quantity:", "நீங்கள் அறிவித்த அளவு:")}</strong>{" "}
                      {formData.declaredQuantity} {selectedUnit ? (isTamil ? selectedUnit.ta : selectedUnit.en) : formData.unit}
                    </p>
                    <p style={styles.resultText}>
                      <strong>{text("Estimated weight:", "மதிப்பிடப்பட்ட எடை:")}</strong>{" "}
                      {aiResult.estimatedWeightGrams != null
                        ? `${aiResult.estimatedWeightGrams} g`
                        : text("Unavailable", "கிடைக்கவில்லை")}
                    </p>
                    <p style={styles.resultText}>
                      <strong>{text("Estimated weight range:", "மதிப்பிடப்பட்ட எடை வரம்பு:")}</strong>{" "}
                      {rangeText}
                    </p>
                    <p style={styles.resultText}>
                      <strong>{text("Quantity review:", "அளவு மதிப்பாய்வு:")}</strong>{" "}
                      {quantityStatusText[aiResult.quantityStatus] ||
                        text("The quantity could not be assessed reliably.", "அளவை நம்பகமாக மதிப்பிட முடியவில்லை.")}
                    </p>
                    {aiResult.quantityComparison && (
                      <p style={styles.resultText}>
                        <strong>{text("Comparison details:", "ஒப்பீட்டு விவரங்கள்:")}</strong>{" "}
                        {aiResult.quantityComparison}
                      </p>
                    )}
                  </section>

                  <section style={styles.scoreCard}>
                    <h4>⭐ {text("3. Appearance Score", "3. தோற்ற மதிப்பெண்")}</h4>
                    <div style={styles.scoreNumber}>
                      {aiResult.appearanceScore != null
                        ? `${aiResult.appearanceScore}/100`
                        : text("Unavailable", "கிடைக்கவில்லை")}
                    </div>
                    <p style={styles.scoreNote}>
                      {text("Preliminary visual assessment only", "ஆரம்பநிலை காட்சி மதிப்பீடு மட்டுமே")}
                    </p>
                    <p style={styles.resultText}>
                      <strong>{text("Visible quality:", "காணக்கூடிய தரம்:")}</strong>{" "}
                      {aiResult.visibleQuality || text("Unavailable", "கிடைக்கவில்லை")}
                    </p>
                    <strong>{text("Reasons for the score:", "மதிப்பெண்ணுக்கான காரணங்கள்:")}</strong>
                    {appearanceReasons.length ? (
                      <ul style={styles.resultList}>
                        {appearanceReasons.map((reason, index) => (
                          <li key={`${index}-${reason}`}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={styles.resultText}>{text("No score explanation was returned.", "மதிப்பெண் விளக்கம் கிடைக்கவில்லை.")}</p>
                    )}
                  </section>

                  <section style={styles.scoreCard}>
                    <h4>{text("4. FarmConnect Verification Checklist", "4. FarmConnect சரிபார்ப்பு பட்டியல்")}</h4>
                    <div style={styles.scoreNumber}>
                      {aiResult.verificationScore != null
                        ? `${aiResult.verificationScore}/100`
                        : text("Unavailable", "கிடைக்கவில்லை")}
                    </div>
                    <p style={styles.scoreNote}>
                      {text(
                        "Application-defined evidence checklist, not a probability or certification.",
                        "செயலியின் ஆதாரப் பட்டியல்; நிகழ்தகவு அல்லது சான்றிதழ் அல்ல."
                      )}
                    </p>
                    {aiResult.verificationScoreMethod && (
                      <p style={styles.resultText}>{aiResult.verificationScoreMethod}</p>
                    )}
                    {(Array.isArray(aiResult.verificationScoreReasons)
                      ? aiResult.verificationScoreReasons
                      : []
                    ).map((reason, index) => (
                      <p style={styles.resultText} key={`${index}-${reason}`}>• {reason}</p>
                    ))}
                  </section>

                  <section style={styles.resultSection}>
                    <h4>{text("5. Fair Price Recommendation", "5. நியாயமான விலை பரிந்துரை")}</h4>
                    <p style={styles.resultText}>
                      <strong>
                        {aiResult.priceRecommendation?.status === "available" &&
                        aiResult.priceRecommendation?.suggestedRange
                          ? `₹${aiResult.priceRecommendation.suggestedRange.min}–₹${aiResult.priceRecommendation.suggestedRange.max}`
                          : text("Insufficient reference data", "குறிப்பு விலைத் தரவு போதவில்லை")}
                      </strong>
                    </p>
                    <p style={styles.resultText}>
                      {aiResult.priceRecommendation?.explanation ||
                        text(
                          "No reliable dated reference prices are configured. You can still choose your own expected price.",
                          "நம்பகமான தேதியிட்ட குறிப்பு விலை இல்லை. உங்கள் எதிர்பார்க்கும் விலையைத் தேர்வு செய்யலாம்."
                        )}
                    </p>
                    {aiResult.priceRecommendation?.source && (
                      <p style={styles.resultText}>
                        {aiResult.priceRecommendation.source}
                        {aiResult.priceRecommendation.referenceDate
                          ? ` · ${aiResult.priceRecommendation.referenceDate}`
                          : ""}
                      </p>
                    )}
                  </section>

                  <section style={styles.resultSection}>
                    <h4>{text("6. Visible Issues", "6. காணக்கூடிய குறைகள்")}</h4>
                    {visibleIssues.length ? (
                      <ul style={styles.resultList}>
                        {visibleIssues.map((issue, index) => (
                          <li key={`${index}-${issue}`}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={styles.resultText}>
                        {text(
                          "No specific visible issues were reported. This does not guarantee the produce is defect-free.",
                          "குறிப்பிட்ட வெளிப்புறக் குறைகள் தெரிவிக்கப்படவில்லை. இதனால் குறைகள் இல்லை என்று உறுதியாகக் கூற முடியாது."
                        )}
                      </p>
                    )}
                  </section>

                  <section style={styles.resultSection}>
                    <h4>{text("7. AI Observations", "7. AI கவனிப்புகள்")}</h4>
                    <p style={styles.resultText}>{observations}</p>
                    {aiResult.confidence && (
                      <p style={styles.resultText}>
                        <strong>{text("AI confidence:", "AI நம்பகத்தன்மை:")}</strong>{" "}
                        {aiResult.confidence}
                      </p>
                    )}
                  </section>

                  <div style={styles.disclaimer}>
                    <strong>⚠️ {text("Important limitation", "முக்கிய வரம்பு")}</strong>
                    <p>
                      {text(
                        "Appearance scores and weight ranges are uncertain AI estimates from an image. They are not actual weighing, certified grading, or food-safety verification. Use a weighing scale to confirm quantity.",
                        "தோற்ற மதிப்பெண்ணும் எடை வரம்பும் படத்தை அடிப்படையாகக் கொண்ட உறுதியற்ற AI மதிப்பீடுகள். இவை உண்மையான எடை அளவீடு அல்லது சான்றிதழ் அல்ல. அளவை உறுதிப்படுத்த எடை தராசைப் பயன்படுத்தவும்."
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style>{`
        * { box-sizing: border-box; }
        .add-product-grid { align-items: start; }
        .add-product-grid input:focus,
        .add-product-grid select:focus,
        .add-product-grid textarea:focus {
          outline: none;
          border-color: #d4a72c;
          box-shadow: 0 0 0 3px rgba(212, 167, 44, 0.2);
        }
        .add-product-grid button {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .add-product-grid button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 50, 30, 0.18);
        }
        @media (max-width: 950px) {
          .add-product-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 560px) {
          .quantity-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    overflowX: "hidden",
    background:
      "radial-gradient(ellipse at 12% 15%, #7a8448 0%, transparent 36%), radial-gradient(ellipse at 90% 80%, #475f32 0%, transparent 34%), linear-gradient(135deg, #183f2d 0%, #24543c 48%, #173e2d 100%)",
    color: "#173f2a",
    fontFamily: '"Times New Roman", serif',
  },
  topBar: {
    padding: "18px 5.2%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 15,
    color: "#fff4c2",
    background: "rgba(20, 58, 40, 0.75)",
    borderBottom: "2px solid #e6bd36",
  },
  brand: { fontSize: 30, fontWeight: "bold", color: "#fff5ca" },
  topSubtitle: { marginTop: 5, fontSize: 15, lineHeight: 1.5, color: "#f5eecf" },
  headerActions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 },
  languageSwitch: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: 4,
    background: "#fff9e5",
    border: "1px solid #e7c443",
    borderRadius: 12,
  },
  languageButton: {
    padding: "9px 13px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "#214c35",
    cursor: "pointer",
    fontFamily: '"Times New Roman", serif',
    fontSize: 15,
  },
  activeLanguage: { background: "#f8c83f", color: "#173f2a", fontWeight: "bold" },
  backButton: {
    padding: "11px 15px",
    border: "1px solid #e4c044",
    borderRadius: 10,
    background: "#fff5c9",
    color: "#214b34",
    cursor: "pointer",
    fontFamily: '"Times New Roman", serif',
    fontSize: 15,
    fontWeight: "bold",
  },
  content: { maxWidth: 1700, width: "100%", margin: "0 auto", padding: "30px 3.2% 55px" },
  pageHeading: { marginBottom: 25 },
  pageTitle: { margin: "0 0 8px", fontSize: 34, color: "#fff4c2", textShadow: "0 2px 8px rgba(0,0,0,0.12)" },
  pageDescription: { maxWidth: 850, margin: 0, fontSize: 16, lineHeight: 1.6, color: "#f1edda" },
  mainGrid: { display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 25, alignItems: "start" },
  card: { minWidth: 0, padding: 24, borderRadius: 18, background: "#fffdf5", boxShadow: "0 12px 30px rgba(0,0,0,0.18)", border: "1px solid #e8dfc1" },
  cardHeader: { marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid #e8e1ce" },
  cardIcon: { display: "inline-block", marginBottom: 8, fontSize: 27 },
  cardTitle: { margin: "0 0 7px", color: "#214d34", fontSize: 24 },
  cardSubtitle: { margin: 0, color: "#617060", fontSize: 15, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 17 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 7 },
  label: { color: "#284a35", fontWeight: "bold", fontSize: 15 },
  fieldHelp: { display: "block", marginTop: 6, color: "#536b53", fontSize: 12, lineHeight: 1.5 },
  input: { width: "100%", minWidth: 0, padding: "12px 13px", border: "1px solid #c9d1bf", borderRadius: 9, background: "#fff", color: "#24382a", fontSize: 15, fontFamily: "inherit" },
  quantityGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 },
  primaryButton: { padding: "13px 17px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #276b42, #194c32)", color: "#fff8d7", fontWeight: "bold", fontSize: 15, fontFamily: "inherit", cursor: "pointer" },
  secondaryButton: { padding: "10px 13px", border: "1px solid #b8c9b1", borderRadius: 9, background: "#f4f6ed", color: "#234c34", fontWeight: "bold", fontSize: 14, fontFamily: "inherit", cursor: "pointer" },
  aiButton: { width: "100%", marginTop: 14, padding: "14px 17px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #d6a72c, #f1ca55)", color: "#263f29", fontWeight: "bold", fontSize: 16, fontFamily: "inherit", cursor: "pointer" },
  cameraContent: { display: "flex", flexDirection: "column", gap: 17 },
  cameraNotice: { padding: 15, border: "1px solid #c6d9b8", borderRadius: 12, background: "#f1f7e9", color: "#264f32", lineHeight: 1.55 },
  cameraStartBox: { padding: "28px 18px", border: "2px dashed #b9cba8", borderRadius: 14, textAlign: "center", background: "#fafbf4", color: "#36563a" },
  cameraIllustration: { fontSize: 48 },
  liveCameraContainer: { position: "relative", overflow: "hidden", borderRadius: 13, background: "#17281d" },
  video: { display: "block", width: "100%", maxHeight: 420, objectFit: "contain", background: "#15241a" },
  liveBadge: { position: "absolute", top: 12, left: 12, padding: "7px 10px", borderRadius: 7, background: "#e7f6df", color: "#215a31", fontWeight: "bold", fontSize: 12 },
  cameraHint: { color: "#fff6d4", textAlign: "center", padding: 8 },
  cameraControls: { display: "flex", flexWrap: "wrap", gap: 10, padding: 12, background: "#f5f4e8" },
  previewSection: { padding: 14, border: "1px solid #d9e1cf", borderRadius: 13, background: "#fafbf5" },
  previewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12, color: "#244c34" },
  previewImage: { display: "block", width: "100%", maxHeight: 350, objectFit: "contain", borderRadius: 10, background: "#e8e8df" },
  loadingHint: { color: "#4b603d", fontSize: 14, lineHeight: 1.6 },
  aiResultCard: { padding: 19, borderRadius: 14, border: "1px solid #d8c879", background: "#fffdf2", color: "#304533", overflowWrap: "anywhere" },
  resultTitle: { margin: "0 0 18px", color: "#245c35", fontSize: 22 },
  resultSection: { padding: "14px 0", borderBottom: "1px solid #e5e3d1" },
  resultText: { margin: "9px 0", lineHeight: 1.65, color: "#344b39", fontSize: 15 },
  resultList: { paddingLeft: 23, lineHeight: 1.8, overflowWrap: "anywhere" },
  warningText: { padding: 12, borderRadius: 9, background: "#fff0ed", color: "#902c24", fontWeight: "bold", lineHeight: 1.6 },
  matchText: { padding: 12, borderRadius: 9, background: "#edf7e9", color: "#245c35", fontWeight: "bold", lineHeight: 1.6 },
  scoreCard: { marginTop: 17, padding: 17, borderRadius: 12, border: "1px solid #b7d6a0", background: "#f1f8e9", color: "#245c35" },
  scoreNumber: { margin: "8px 0", fontSize: 36, fontWeight: "bold", color: "#245c35" },
  scoreNote: { color: "#4c6745", fontSize: 14 },
  disclaimer: { marginTop: 18, padding: 14, border: "1px solid #e0c46b", borderRadius: 10, background: "#fff6d9", color: "#66501c", lineHeight: 1.7, fontSize: 14 },
  errorBox: { marginBottom: 16, padding: 13, borderRadius: 10, border: "1px solid #e6a29b", background: "#fff0ed", color: "#8b211b", lineHeight: 1.6, overflowWrap: "anywhere" },
  successBox: { marginBottom: 16, padding: 13, borderRadius: 10, border: "1px solid #9ac79c", background: "#eef8eb", color: "#245c35", lineHeight: 1.6 },
};

export default AddProduct;
