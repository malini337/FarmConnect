import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../context/LanguageContext";
import { REQUIREMENT_CATEGORIES } from "../constants/categories";
import "./CommercePage.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem("farmconnect-cart") || "[]");
  } catch {
    return [];
  }
};

// Images stored inside client/public/products/
const PRODUCT_IMAGES = {
  apple: "/products/Apple.jpg",
  banana: "/products/Banana.jpg",
  "black pepper": "/products/Black%20Pepper.jpg",
  brinjal: "/products/Brinjal.jpg",
  cabbage: "/products/Cabbage.jpg",
  carrot: "/products/Carrot.jpg",
  cauliflower: "/products/Cauliflower.jpg",
  chickpea: "/products/Chickpea.jpg",
  coconut: "/products/Coconut.jpg",
  ginger: "/products/Ginger.jpg",
  grapes: "/products/Grapes.jpg",
  "green chilli": "/products/Green%20Chilli.jpg",
  groundnut: "/products/Groundnut.jpg",
  guava: "/products/Guava.jpg",
  "jasmine flower": "/products/Jasmine%20Flower.jpg",
  "jasmine flowers": "/products/Jasmine%20Flower.jpg",
  "ladies finger": "/products/Ladies%20Finger.jpg",
  mango: "/products/Mango.jpg",
  orange: "/products/Orange.jpg",
  "paddy rice": "/products/Paddy%20Rice.jpg",
  papaya: "/products/Papaya.jpg",
  "pearl millet": "/products/Pearl%20Millet.jpg",
  potato: "/products/Potato.jpg",
  "raw honey": "/products/Raw%20Honey.jpg",
  "red onion": "/products/Red%20Onion.jpg",
  spinach: "/products/Spinach.jpg",
  tomato: "/products/Tomato.jpg",
  "toor dal": "/products/Toor%20Dal.jpg",
  turmeric: "/products/Turmeric.jpg",
  watermelon: "/products/Watermelon.jpg",
  wheat: "/products/Wheat.jpg",
};

function getLocalProductImage(product) {
  const name = String(product?.name || "").trim().toLowerCase();
  return PRODUCT_IMAGES[name] || product?.imageUrl || product?.image || product?.productImage || "";
}

export default function CommercePage({ type }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const ta = language === "ta";
  const user = getUser();
  const token = localStorage.getItem("token");

  const [items, setItems] = useState([]);
  const [cart, setCart] = useState(getCart);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    productName: "",
    category: "Vegetables",
    quantity: "",
    unit: "kg",
    targetPrice: "",
    notes: "",
    deliveryAddress: "",
  });

  const title = {
    cart: ta ? "எனது கூடை" : "My Cart",
    orders: ta ? "ஆர்டர்கள்" : "Orders",
    requirements: ta ? "விளைபொருள் தேவைகள்" : "Produce requirements",
    products: ta ? "எனது பட்டியல்கள்" : "My Listings",
  };

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const refresh = useCallback(async () => {
    const url =
      type === "orders"
        ? `${API}/api/orders`
        : type === "requirements"
          ? `${API}/api/requirements`
          : type === "products"
            ? `${API}/api/products/mine`
            : "";

    if (!url) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load data");
      }

      setItems(data.orders || data.requirements || data.products || []);
    } catch (err) {
      setError(err.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, [type, headers]);

  useEffect(() => {
    if (["orders", "requirements", "products"].includes(type)) {
      refresh();
    }
  }, [type, location.key, refresh]);

  const saveCart = (next) => {
    setCart(next);
    localStorage.setItem("farmconnect-cart", JSON.stringify(next));
  };

  const money = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const postRequirement = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/api/requirements`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not post requirement");
      }

      setNotice(data.message || "Requirement posted");

      setForm((previous) => ({
        ...previous,
        productName: "",
        quantity: "",
        targetPrice: "",
        notes: "",
      }));

      await refresh();
    } catch (err) {
      setError(err.message || "Could not post requirement");
    }
  };

  const checkout = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!cart.length) {
      setError(ta ? "உங்கள் கூடை காலியாக உள்ளது." : "Your cart is empty.");
      return;
    }

    if (!form.deliveryAddress.trim()) {
      setError(
        ta ? "டெலிவரி முகவரியை உள்ளிடவும்." : "Enter your delivery address."
      );
      return;
    }

    try {
      const configResponse = await fetch(`${API}/api/payments/config`);
      const config = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(
          config.message || "Could not check payment configuration."
        );
      }

      const useDemoPayment = !config.configured && config.mockEnabled;

      if (!config.configured && !config.mockEnabled) {
        throw new Error(
          ta
            ? "பணம் செலுத்தும் வசதி அமைக்கப்படவில்லை. சர்வர் அமைப்பைச் சரிபார்க்கவும்."
            : "No payment method is enabled. Configure Razorpay test credentials or enable local demo payments."
        );
      }

      const response = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          deliveryAddress: form.deliveryAddress.trim(),
          items: cart.map((item) => ({
            product: item._id || item.id,
            quantity: Number(item.cartQuantity || 1),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Order failed");
      }

      if (useDemoPayment) {
        const demoResponse = await fetch(
          `${API}/api/payments/mock/complete`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ orderId: data.order._id }),
          }
        );

        const demoData = await demoResponse.json();

        if (!demoResponse.ok) {
          throw new Error(
            demoData.message || "Could not complete the demo payment."
          );
        }

        saveCart([]);
        setNotice(
          ta
            ? "டெமோ பணம் செலுத்துதல் பதிவு செய்யப்பட்டது. உண்மையான பணப் பரிமாற்றம் நடைபெறவில்லை."
            : "DEMO PAYMENT — NO MONEY TRANSFERRED. Your demo order has been recorded."
        );

        navigate("/orders", { state: { demoPayment: true } });
        return;
      }

      const paymentResponse = await fetch(
        `${API}/api/payments/create-order`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ orderId: data.order._id }),
        }
      );

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          paymentData.message || "Could not start Razorpay checkout"
        );
      }

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = () =>
            reject(
              new Error(
                "Could not load Razorpay Checkout. Check your internet connection."
              )
            );
          document.body.appendChild(script);
        });
      }

      const checkoutOptions = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: "FarmConnect",
        description: paymentData.description,
        order_id: paymentData.razorpayOrderId,

        handler: async (payment) => {
          try {
            const verifyResponse = await fetch(
              `${API}/api/payments/verify`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  ...payment,
                  farmconnectOrderId: paymentData.farmconnectOrderId,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message || "Payment verification failed"
              );
            }

            saveCart([]);
            setNotice(
              ta
                ? "ரேசர்பே பணம் செலுத்துதல் சரிபார்க்கப்பட்டது."
                : "Razorpay payment verified. Order fulfilment status is separate."
            );

            navigate("/orders");
          } catch (err) {
            setError(
              err.message ||
                "Payment verification failed. Contact support with your order ID."
            );
          }
        },

        modal: {
          ondismiss: () =>
            setError(
              ta
                ? "செக்அவுட் மூடப்பட்டது. சரிபார்க்கப்பட்ட பணம் செலுத்தும் வரை ஆர்டர் செலுத்தப்படாததாக இருக்கும்."
                : "Checkout was closed. The order remains unpaid until payment is verified."
            ),
        },

        prefill: {
          name: user.name || "",
          email: user.email || "",
        },

        theme: { color: "#173f2a" },
      };

      const checkoutWidget = new window.Razorpay(checkoutOptions);

      checkoutWidget.on("payment.failed", (paymentError) => {
        setError(
          paymentError.error?.description ||
            "Payment failed. The order remains unpaid."
        );
      });

      checkoutWidget.open();
    } catch (err) {
      setError(err.message || "Could not start checkout");
    }
  };

  const updateStatus = async (id, status) => {
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API}/api/${type === "orders" ? "orders" : "requirements"}/${id}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update status");
      }

      setNotice(
        data.message || (ta ? "நிலை புதுப்பிக்கப்பட்டது" : "Status updated")
      );
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update status");
    }
  };

  const reviewFarmer = async (order, farmerId, productName) => {
    const rating = Number(
      window.prompt(`Rate the farmer for ${productName} (1 to 5):`)
    );

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Review cancelled. Enter a whole-number rating from 1 to 5.");
      return;
    }

    const comment =
      window.prompt(
        "Optional review comment (do not include private information):"
      ) || "";

    try {
      const response = await fetch(`${API}/api/features/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orderId: order._id,
          reviewedUserId: farmerId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save review");
      }

      setNotice("Review saved for a delivered order.");
      await refresh();
    } catch (err) {
      setError(err.message || "Could not save review");
    }
  };

  const changeListingAvailability = async (product) => {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/api/products/${product._id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          isAvailable: !product.isAvailable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update listing");
      }

      setNotice(data.message || "Listing updated");
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update listing");
    }
  };

  const deleteListing = async (product) => {
    if (!window.confirm(`Remove ${product.name}?`)) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/api/products/${product._id}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not remove listing");
      }

      setNotice(data.message || "Listing removed");
      await refresh();
    } catch (err) {
      setError(err.message || "Could not remove listing");
    }
  };

  // Local downloaded images take priority over backend image URLs.
  const renderProductImage = (product) => {
    const image = getLocalProductImage(product);

    if (!image) {
      return <span aria-label="No saved produce image">🌾</span>;
    }

    return (
      <img
        src={image}
        alt={`${product.name || "Produce"} product`}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          event.currentTarget.parentElement.classList.add(
            "fc-c-image-missing"
          );
        }}
      />
    );
  };

  const isDemoRefund = (order) =>
    order.status === "rejected" &&
    order.paymentProvider === "mock" &&
    order.paymentStatus === "refunded";

  return (
    <div className="fc-commerce-page">
      <Sidebar />

      <main className="fc-commerce-main">
        <header className="fc-commerce-head">
          <div>
            <span>FARMCONNECT · WORKSPACE</span>
            <h1>
              {type === "requirements"
                ? "📋"
                : type === "orders"
                  ? "📦"
                  : type === "products"
                    ? "🌱"
                    : "🛒"}{" "}
              {title[type] || title.cart}
            </h1>
            <p>
              {ta
                ? "உங்கள் செயல்பாடுகளையும் பரிவர்த்தனைகளையும் நிர்வகிக்கவும்."
                : "Manage your marketplace activity in one place."}
            </p>
          </div>

          <button onClick={() => navigate(-1)} className="fc-c-secondary">
            ← {ta ? "பின்" : "Back"}
          </button>
        </header>

        {notice && (
          <div className="fc-c-notice" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="fc-c-error" role="alert">
            {error}
          </div>
        )}

        {type === "requirements" && (
          <>
            <form className="fc-c-panel fc-c-form" onSubmit={postRequirement}>
              <h2>{ta ? "புதிய தேவை பதிவு" : "Post a purchase requirement"}</h2>

              <div className="fc-c-fields">
                <label>
                  {ta ? "விளைபொருள் பெயர்" : "Produce name"}
                  <input
                    required
                    value={form.productName}
                    onChange={(event) =>
                      setForm({ ...form, productName: event.target.value })
                    }
                    placeholder="e.g. Tomato"
                  />
                </label>

                <label>
                  {ta ? "வகை" : "Category"}
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                  >
                    {REQUIREMENT_CATEGORIES.map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  {ta ? "அளவு" : "Quantity"}
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm({ ...form, quantity: event.target.value })
                    }
                  />
                </label>

                <label>
                  {ta ? "அலகு" : "Unit"}
                  <select
                    value={form.unit}
                    onChange={(event) =>
                      setForm({ ...form, unit: event.target.value })
                    }
                  >
                    {["kg", "gram", "litre", "piece"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {ta ? "இலக்கு விலை (₹, விருப்பம்)" : "Target price (₹, optional)"}
                  <input
                    type="number"
                    min="0"
                    value={form.targetPrice}
                    onChange={(event) =>
                      setForm({ ...form, targetPrice: event.target.value })
                    }
                  />
                </label>

                <label className="fc-c-wide">
                  {ta ? "குறிப்புகள்" : "Notes"}
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    placeholder="Quality, delivery date or other details"
                  />
                </label>
              </div>

              <button className="fc-c-primary">
                {ta ? "தேவையைப் பதிவு செய்" : "Post requirement"}
              </button>
            </form>

            <section className="fc-c-panel">
              <h2>
                {user.role === "farmer"
                  ? ta
                    ? "வாங்குபவர்களின் திறந்த தேவைகள்"
                    : "Open buyer requirements"
                  : ta
                    ? "எனது தேவைகள்"
                    : "My requirements"}
              </h2>

              {loading ? (
                <p>{ta ? "ஏற்றுகிறது…" : "Loading…"}</p>
              ) : items.length === 0 ? (
                <p>{ta ? "இன்னும் தேவைகள் இல்லை." : "No requirements yet."}</p>
              ) : (
                items.map((item) => (
                  <article className="fc-c-row" key={item._id}>
                    <div>
                      <strong>{item.productName}</strong>
                      <p>
                        {item.quantity} {item.unit} · {item.category} ·{" "}
                        {item.buyerRole || item.buyer?.role || "buyer"}
                      </p>
                      <small>{item.notes}</small>
                    </div>

                    <div>
                      <span className={`fc-c-status ${item.status}`}>
                        {item.status}
                      </span>

                      {user.role === "farmer" && item.status === "open" && (
                        <small>
                          Use Smart Buyer Matching to send an interest request.
                        </small>
                      )}

                      {user.role !== "farmer" && item.status !== "closed" && (
                        <button
                          className="fc-c-secondary"
                          onClick={() => updateStatus(item._id, "closed")}
                        >
                          {ta ? "மூடு" : "Close"}
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}

        {type === "cart" && (
          <section className="fc-c-panel">
            <h2>{ta ? "கூடையில் உள்ள பொருட்கள்" : "Items in your cart"}</h2>

            {cart.length === 0 ? (
              <div className="fc-c-empty">
                <span>🛒</span>
                <h3>{ta ? "உங்கள் கூடை காலியாக உள்ளது" : "Your cart is empty"}</h3>
                <p>
                  {ta
                    ? "விளைபொருட்களைப் பார்த்து கூடையில் சேர்க்கவும்."
                    : "Browse produce and add items to your cart."}
                </p>
                <button
                  className="fc-c-primary"
                  onClick={() => navigate("/products")}
                >
                  {ta ? "சந்தையைப் பார்க்கவும்" : "Browse marketplace"}
                </button>
              </div>
            ) : (
              <>
                <div>
                  {cart.map((item, index) => (
                    <article
                      className="fc-c-row"
                      key={item._id || item.id || index}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {money(item.expectedPrice || item.price)} /{" "}
                          {item.unit || "kg"}
                        </p>
                        <label>
                          {ta ? "அளவு" : "Quantity"}
                          <input
                            className="fc-c-qty"
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.cartQuantity || 1}
                            onChange={(event) =>
                              saveCart(
                                cart.map((cartItem, cartIndex) =>
                                  cartIndex === index
                                    ? {
                                        ...cartItem,
                                        cartQuantity: Number(event.target.value),
                                      }
                                    : cartItem
                                )
                              )
                            }
                          />
                        </label>
                      </div>

                      <div>
                        <strong>
                          {money(
                            (item.expectedPrice || item.price) *
                              (item.cartQuantity || 1)
                          )}
                        </strong>
                        <button
                          className="fc-c-link"
                          onClick={() =>
                            saveCart(
                              cart.filter((_, cartIndex) => cartIndex !== index)
                            )
                          }
                        >
                          {ta ? "நீக்கு" : "Remove"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <form className="fc-c-checkout" onSubmit={checkout}>
                  <label>
                    {ta ? "டெலிவரி முகவரி" : "Delivery address"}
                    <textarea
                      required
                      value={form.deliveryAddress}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          deliveryAddress: event.target.value,
                        })
                      }
                      placeholder={
                        ta ? "முழு முகவரியை உள்ளிடவும்" : "Enter full delivery address"
                      }
                    />
                  </label>

                  <h3>
                    {ta ? "மொத்தம்: " : "Total: "}
                    {money(
                      cart.reduce(
                        (sum, item) =>
                          sum +
                          (item.expectedPrice || item.price) *
                            (item.cartQuantity || 1),
                        0
                      )
                    )}
                  </h3>

                  <button className="fc-c-primary">
                    {ta ? "ஆர்டரைச் சமர்ப்பிக்கவும்" : "Place order"}
                  </button>
                </form>
              </>
            )}
          </section>
        )}

        {type === "orders" && (
          <section className="fc-c-panel">
            <h2>
              {user.role === "farmer"
                ? ta
                  ? "வரும் விற்பனை ஆர்டர்கள்"
                  : "Incoming sales orders"
                : ta
                  ? "உங்கள் வாங்கும் ஆர்டர்கள்"
                  : "Your purchase orders"}
            </h2>

            {loading ? (
              <p>{ta ? "ஆர்டர்கள் ஏற்றப்படுகின்றன…" : "Loading orders…"}</p>
            ) : items.length === 0 ? (
              <div className="fc-c-empty">
                <span>📦</span>
                <h3>{ta ? "இன்னும் ஆர்டர்கள் இல்லை" : "No orders yet"}</h3>
                <p>
                  {ta
                    ? "வாங்குபவர் ஆர்டர் செய்ததும் இங்கே காணப்படும்."
                    : "Orders will appear here after a buyer checks out."}
                </p>

                {user.role !== "farmer" && (
                  <button
                    className="fc-c-primary"
                    onClick={() => navigate("/products")}
                  >
                    {ta ? "சந்தையைப் பார்க்கவும்" : "Browse marketplace"}
                  </button>
                )}
              </div>
            ) : (
              items.map((order) => (
                <article className="fc-c-order" key={order._id}>
                  <div className="fc-c-order-top">
                    <strong>Order #{String(order._id).slice(-7).toUpperCase()}</strong>
                    <span className={`fc-c-status ${order.status}`}>
                      {order.status}
                    </span>
                  </div>

                  <p>
                    {new Date(order.createdAt).toLocaleString()} ·{" "}
                    {money(order.total)}
                  </p>

                  {order.items?.map((item, index) => (
                    <div key={index}>
                      <p>
                        {item.name} — {item.quantity} {item.unit} ·{" "}
                        {money(item.subtotal)}
                      </p>

                      {user.role !== "farmer" && order.status === "delivered" && (
                        <button
                          className="fc-c-secondary"
                          onClick={() =>
                            reviewFarmer(order, String(item.farmer), item.name)
                          }
                        >
                          {ta ? "விவசாயியை மதிப்பிடவும்" : "Review farmer for this item"}
                        </button>
                      )}
                    </div>
                  ))}

                  <p>
                    <strong>{ta ? "டெலிவரி:" : "Delivery:"}</strong>{" "}
                    {order.deliveryAddress}
                  </p>

                  {order.paymentProvider === "mock" ? (
                    <div className="fc-c-notice" role="status">
                      <strong>
                        {isDemoRefund(order)
                          ? ta
                            ? "டெமோ பணம் திரும்பப் பதிவு செய்யப்பட்டது — உண்மையான பணப் பரிமாற்றம் இல்லை"
                            : "DEMO REFUND COMPLETED — NO MONEY TRANSFERRED"
                          : ta
                            ? "டெமோ பணம் செலுத்துதல் — உண்மையான பணம் பரிமாற்றம் இல்லை"
                            : "DEMO PAYMENT — NO MONEY TRANSFERRED"}
                      </strong>

                      <p>
                        {isDemoRefund(order)
                          ? ta
                            ? "இந்த ஆர்டர் நிராகரிக்கப்பட்டதால், சோதனைக்கான டெமோ கட்டணம் திருப்பிச் செலுத்தப்பட்டதாகக் குறிக்கப்பட்டுள்ளது. உண்மையான பணம் பரிமாற்றம் நடைபெறவில்லை."
                            : "This rejected order's simulated payment is marked as refunded for testing. No real money was transferred or refunded."
                          : ta
                            ? "இது உள்ளூர் சோதனைக்கான மாதிரி பரிவர்த்தனை மட்டுமே."
                            : "This is a simulated transaction for local testing only."}
                      </p>

                      <p>
                        <strong>{ta ? "பணம் செலுத்தும் நிலை:" : "Payment status:"}</strong>{" "}
                        {order.paymentStatus || "pending"}
                      </p>
                    </div>
                  ) : (
                    <p>
                      <strong>{ta ? "பணம் செலுத்துதல்:" : "Payment:"}</strong>{" "}
                      {order.paymentStatus || "pending"} ·{" "}
                      {ta
                        ? "ஆர்டர் நிலையும் பணம் செலுத்தும் நிலையும் தனித்தனியானவை."
                        : "Order status and payment status are separate."}
                    </p>
                  )}

                  {user.role === "farmer" &&
                    order.status === "placed" &&
                    order.paymentStatus === "paid" && (
                      <div className="fc-c-order-actions">
                        <button
                          className="fc-c-primary"
                          onClick={() => updateStatus(order._id, "accepted")}
                        >
                          {order.paymentProvider === "mock"
                            ? ta
                              ? "டெமோ ஆர்டரை ஏற்கவும்"
                              : "Accept demo order"
                            : ta
                              ? "செலுத்திய ஆர்டரை ஏற்கவும்"
                              : "Accept paid order"}
                        </button>

                        <button
                          className="fc-c-secondary"
                          onClick={() => {
                            if (
                              window.confirm(
                                ta
                                  ? "இந்த ஆர்டரை நிராகரிக்க விரும்புகிறீர்களா?"
                                  : "Are you sure you want to reject this order?"
                              )
                            ) {
                              updateStatus(order._id, "rejected");
                            }
                          }}
                        >
                          {ta ? "ஆர்டரை நிராகரி" : "Reject order"}
                        </button>
                      </div>
                    )}

                  {user.role === "farmer" &&
                    order.status === "placed" &&
                    order.paymentStatus !== "paid" && (
                      <small>
                        {ta
                          ? "பணம் செலுத்துதல் இன்னும் நிறைவடையவில்லை; ஆர்டர் நிறைவேற்றம் முடக்கப்பட்டுள்ளது."
                          : "Awaiting payment; fulfilment is disabled."}
                      </small>
                    )}

                  {user.role === "farmer" && order.status === "accepted" && (
                    <button
                      className="fc-c-primary"
                      onClick={() => updateStatus(order._id, "packed")}
                    >
                      {ta ? "பேக் செய்யப்பட்டதாகக் குறிக்கவும்" : "Mark packed"}
                    </button>
                  )}

                  {user.role === "farmer" && order.status === "packed" && (
                    <button
                      className="fc-c-primary"
                      onClick={() => updateStatus(order._id, "dispatched")}
                    >
                      {ta ? "அனுப்பப்பட்டதாகக் குறிக்கவும்" : "Mark dispatched"}
                    </button>
                  )}

                  {user.role === "farmer" && order.status === "dispatched" && (
                    <button
                      className="fc-c-primary"
                      onClick={() => {
                        if (
                          window.confirm(
                            ta
                              ? "இந்த ஆர்டர் டெலிவரி செய்யப்பட்டதா?"
                              : "Confirm that this order has been delivered?"
                          )
                        ) {
                          updateStatus(order._id, "delivered");
                        }
                      }}
                    >
                      {ta ? "டெலிவரி செய்யப்பட்டதாகக் குறிக்கவும்" : "Mark Delivered"}
                    </button>
                  )}

                  {order.status === "rejected" && (
                    <p className="fc-c-error">
                      {ta ? "இந்த ஆர்டர் நிராகரிக்கப்பட்டது." : "This order was rejected."}
                    </p>
                  )}

                  {user.role !== "farmer" &&
                    order.status === "placed" &&
                    order.paymentStatus !== "paid" && (
                      <button
                        className="fc-c-secondary"
                        onClick={() => updateStatus(order._id, "cancelled")}
                      >
                        {ta ? "செலுத்தப்படாத ஆர்டரை ரத்து செய்" : "Cancel unpaid order"}
                      </button>
                    )}
                </article>
              ))
            )}
          </section>
        )}

        {type === "products" && (
          <section className="fc-c-panel">
            <h2>{ta ? "உங்கள் பட்டியல்கள்" : "Your listings"}</h2>

            {loading ? (
              <p>{ta ? "ஏற்றுகிறது..." : "Loading listings..."}</p>
            ) : items.length === 0 ? (
              <div className="fc-c-empty">
                <span>🌱</span>
                <h3>{ta ? "பட்டியல்கள் எதுவும் இல்லை" : "No listings yet"}</h3>
                <button
                  className="fc-c-primary"
                  onClick={() => navigate("/add-product")}
                >
                  {ta ? "முதல் பொருளைச் சேர்க்கவும்" : "Add your first product"}
                </button>
              </div>
            ) : (
              items.map((product) => (
                <article className="fc-c-row fc-c-product-row" key={product._id}>
                  <div className="fc-c-product-details">
                    <div className="fc-c-product-image">
                      {renderProductImage(product)}
                    </div>

                    <div className="fc-c-product-copy">
                      <strong>{product.name}</strong>
                      <p>
                        {product.category} · {product.declaredQuantity}{" "}
                        {product.unit} · {money(product.expectedPrice)}/{product.unit}
                      </p>

                      <small>
                        {product.description ||
                          (ta ? "விளக்கம் வழங்கப்படவில்லை" : "No description provided")}
                      </small>

                      {product.assessment?.verificationScore != null && (
                        <small>
                          {ta ? "சரிபார்ப்பு மதிப்பெண்: " : "Verification checklist: "}
                          {product.assessment.verificationScore}/100
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="fc-c-product-actions">
                    <span
                      className={`fc-c-status ${
                        product.isAvailable ? "open" : "closed"
                      }`}
                    >
                      {product.isAvailable
                        ? ta
                          ? "கிடைக்கிறது"
                          : "Available"
                        : ta
                          ? "கிடைக்கவில்லை"
                          : "Unavailable"}
                    </span>

                    <button
                      className="fc-c-secondary"
                      onClick={() => changeListingAvailability(product)}
                    >
                      {product.isAvailable
                        ? ta
                          ? "பட்டியலை இடைநிறுத்து"
                          : "Pause listing"
                        : ta
                          ? "கிடைக்குமாறு செய்"
                          : "Make available"}
                    </button>

                    <button
                      className="fc-c-link"
                      onClick={() => deleteListing(product)}
                    >
                      {ta ? "நீக்கு" : "Delete"}
                    </button>
                  </div>

                  {product.traceabilityToken && (
                    <div className="fc-c-trace">
                      <a
                        href={`/trace/${product.traceabilityToken}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ta ? "பொது தடமறிதல் பதிவு" : "Public traceability record"}
                      </a>

                      <img
                        alt={`QR code for ${product.name}`}
                        loading="lazy"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          `${window.location.origin}/trace/${product.traceabilityToken}`
                        )}`}
                      />
                    </div>
                  )}
                </article>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}