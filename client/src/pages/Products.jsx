
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import Sidebar from "../components/Sidebar";
import "./Products.css";
import { PRODUCT_CATEGORIES } from "../constants/categories";

async function readApiResponse(response) {
  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json")
    ? await response.json()
    : null;

  if (!data) {
    throw new Error(
      response.ok
        ? "The server returned an unexpected non-JSON response."
        : `The API returned HTTP ${response.status}. Check the backend URL and server logs.`
    );
  }

  return data;
}

const API =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Categories that should always appear in the marketplace.
const DEFAULT_CATEGORIES = PRODUCT_CATEGORIES;

// These paths are relative to client/public/.
const PRODUCT_IMAGES = {
  apple: "/products/Apple.jpg",
  banana: "/products/Banana.jpg",
  "black pepper": "/products/Black Pepper.jpg",
  brinjal: "/products/Brinjal.jpg",
  cabbage: "/products/Cabbage.jpg",
  carrot: "/products/Carrot.jpg",
  cauliflower: "/products/Cauliflower.jpg",
  chickpea: "/products/Chickpea.jpg",
  coconut: "/products/Coconut.jpg",
  ginger: "/products/Ginger.jpg",
  grapes: "/products/Grapes.jpg",
  "green chilli": "/products/Green Chilli.jpg",
  groundnut: "/products/Groundnut.jpg",
  guava: "/products/Guava.jpg",
  "jasmine flower": "/products/Jasmine Flower.jpg",
  "jasmine flowers": "/products/Jasmine Flower.jpg",
  "ladies finger": "/products/Ladies Finger.jpg",
  okra: "/products/Ladies Finger.jpg",
  mango: "/products/Mango.jpg",
  orange: "/products/Orange.jpg",
  "paddy rice": "/products/Paddy Rice.jpg",
  rice: "/products/Paddy Rice.jpg",
  papaya: "/products/Papaya.jpg",
  "pearl millet": "/products/Pearl Millet.jpg",
  millet: "/products/Pearl Millet.jpg",
  potato: "/products/Potato.jpg",
  "raw honey": "/products/Raw Honey.jpg",
  honey: "/products/Raw Honey.jpg",
  "red onion": "/products/Red Onion.jpg",
  onion: "/products/Red Onion.jpg",
  spinach: "/products/Spinach.jpg",
  tomato: "/products/Tomato.jpg",
  tomatoes: "/products/Tomato.jpg",
  "toor dal": "/products/Toor Dal.jpg",
  turmeric: "/products/Turmeric.jpg",
  watermelon: "/products/Watermelon.jpg",
  wheat: "/products/Wheat.jpg",
};

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getProductImage(product) {
  // Prefer the local photograph when a matching filename exists.
  const name = normalizeName(product.name);

  if (PRODUCT_IMAGES[name]) {
    return PRODUCT_IMAGES[name];
  }

  // For products without a mapped local photograph, use the backend image.
  const imageUrl = product.imageUrl;

  if (!imageUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  // Backend-relative URLs, such as /uploads/example.jpg.
  if (imageUrl.startsWith("/")) {
    return `${API}${imageUrl}`;
  }

  return `${API}/${imageUrl}`;
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("farmconnect-cart") || "[]");
  } catch {
    return [];
  }
}

export default function Products() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ta = language === "ta";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return undefined;
    }

    let alive = true;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const qs = new URLSearchParams();

        if (search.trim()) {
          qs.set("search", search.trim());
        }

        if (category !== "All") {
          qs.set("category", category);
        }

        const response = await fetch(`${API}/api/products?${qs}`);
        const data = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Could not load marketplace");
        }

        if (alive) {
          setProducts(
            Array.isArray(data.products) ? data.products : []
          );
        }
      } catch (err) {
        if (alive) {
          setError(err.message || "Could not load marketplace");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(run, 200);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, category, navigate]);

  // Always display default categories, plus any additional categories
  // found in products returned by the API.
  const categories = useMemo(() => {
    const actualCategories = products
      .map((product) => product.category?.trim())
      .filter(Boolean);

    const uniqueCategories = new Map();

    [...DEFAULT_CATEGORIES, ...actualCategories].forEach((item) => {
      const key = item.toLowerCase();

      if (!uniqueCategories.has(key)) {
        uniqueCategories.set(key, item);
      }
    });

    return ["All", ...uniqueCategories.values()];
  }, [products]);

  const add = (product) => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    const cart = readCart();
    const index = cart.findIndex(
      (item) => String(item._id) === String(product._id)
    );

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        cartQuantity: Number(cart[index].cartQuantity || 1) + 1,
      };
    } else {
      cart.push({ ...product, cartQuantity: 1 });
    }

    localStorage.setItem("farmconnect-cart", JSON.stringify(cart));

    setNotice(
      ta ? "கூடையில் சேர்க்கப்பட்டது" : "Added to cart"
    );
  };

  const money = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  return (
    <div className="products-page">
      <Sidebar />

      <main className="products-main">
        <header className="products-header">
          <div>
            <p className="products-eyebrow">
              FARMCONNECT · DIRECT FROM FARM
            </p>

            <h1>
              {ta ? "விவசாய சந்தை" : "Farmer Marketplace"}
            </h1>

            <p className="products-subtitle">
              {ta
                ? "விவசாயிகள் உண்மையில் பட்டியலிட்ட பொருட்களைப் பாருங்கள்."
                : "Browse produce listings from farmers."}
            </p>
          </div>

          <div className="products-count">
            <strong>{products.length}</strong>
            <span>{ta ? "பட்டியல்கள்" : "Listings"}</span>
          </div>
        </header>

        <div className="products-controls">
          <label className="search-box">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                ta
                  ? "பொருள் அல்லது வகையைத் தேடுங்கள்"
                  : "Search produce or category"
              }
            />
          </label>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter category"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? ta
                    ? "அனைத்து வகைகள்"
                    : "All categories"
                  : item}
              </option>
            ))}
          </select>
        </div>

        {notice && (
          <p role="status" className="fc-c-notice">
            {notice}
          </p>
        )}

        {error && (
          <p role="alert" className="fc-c-error">
            {error}
          </p>
        )}

        <button type="button" onClick={() => navigate("/scan")}>
          {ta
            ? "பொருள் QR குறியீட்டை ஸ்கேன் செய்க"
            : "Scan a product QR code"}
        </button>

        {loading ? (
          <div className="products-empty">
            {ta ? "பட்டியல்கள் ஏற்றப்படுகின்றன…" : "Loading farmer listings…"}
          </div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            <span>🌱</span>

            <h2>
              {ta ? "பட்டியல்கள் இல்லை" : "No listings available"}
            </h2>

            <p>
              {ta
                ? "விவசாயி புதிய பொருட்களைப் பட்டியலிட்டதும் இங்கே தோன்றும்."
                : "Farmer-created listings will appear here when available."}
            </p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <article className="product-card" key={product._id}>
                <div className="product-image-placeholder">
                  {getProductImage(product) ? (
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => {
                        const img = event.currentTarget;

                        if (img.dataset.fallbackTried) {
                          img.style.display = "none";
                          return;
                        }

                        img.dataset.fallbackTried = "true";

                        // If the local image fails, try the backend URL once.
                        const backendImage = product.imageUrl;

                        if (
                          backendImage &&
                          backendImage !== img.src
                        ) {
                          img.src = /^https?:\/\//i.test(backendImage)
                            ? backendImage
                            : `${API}/${backendImage.replace(/^\/+/, "")}`;
                        } else {
                          img.style.display = "none";
                        }
                      }}
                    />
                  ) : (
                    <span aria-hidden="true">🌾</span>
                  )}
                </div>

                <div className="product-card-body">
                  <span className="product-category">
                    {product.category}
                  </span>

                  {product.demoKey?.startsWith("farmconnect-product-") && (
                    <small className="demo-price-label">
                      DEMO LISTING · ILLUSTRATIVE PRICE
                    </small>
                  )}

                  <h2>{product.name}</h2>

                  <p>
                    {product.farmer?.name
                      ? `${ta ? "விவசாயி" : "Farmer"}: ${product.farmer.name}`
                      : "Farmer profile unavailable"}
                  </p>

                  <p>
                    {product.declaredQuantity} {product.unit}{" "}
                    {ta ? "கிடைக்கும்" : "available"}
                  </p>

                  <strong className="product-price">
                    {money(product.expectedPrice)} / {product.unit}
                  </strong>

                  {product.assessment?.verificationScore != null && (
                    <small>
                      {ta ? "AI சரிபார்ப்பு மதிப்பெண்" : "AI evidence score"}:{" "}
                      {product.assessment.verificationScore}/100
                    </small>
                  )}

                  <button type="button" onClick={() => add(product)}>
                    {ta ? "கூடையில் சேர்" : "Add to cart"}
                  </button>

                  {product.traceabilityToken && (
                    <>
                      <button
                        type="button"
                        className="trace-link"
                        onClick={() =>
                          navigate(`/trace/${product.traceabilityToken}`)
                        }
                      >
                        {ta ? "தடமறிதல்" : "Traceability record"}
                      </button>

                      <img
                        className="product-qr"
                        alt={`QR code for ${product.name}`}
                        loading="lazy"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          `${window.location.origin}/trace/${product.traceabilityToken}`
                        )}`}
                      />
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
