import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../context/LanguageContext";
import "./RoleDashboard.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const config = {
  farmer: { title: "Farmer Dashboard", ta: "விவசாயி டாஷ்போர்டு", icon: "🌱", intro: "Manage your produce, check buyer requirements and fulfil orders.", actions: [["＋", "Add produce", "/add-product"], ["🥬", "My listings", "/my-products"], ["📋", "Buyer requirements", "/requirements"], ["📦", "Orders & sales", "/orders"]] },
  consumer: { title: "Consumer Dashboard", ta: "நுகர்வோர் டாஷ்போர்டு", icon: "🛍️", intro: "Discover fresh produce directly from farmers for your home.", actions: [["🥕", "Browse marketplace", "/products"], ["🛒", "My cart", "/cart"], ["📦", "My orders", "/orders"], ["🔎", "Request produce", "/requirements"]] },
  retailer: { title: "Retailer Dashboard", ta: "சில்லறை விற்பனையாளர் டாஷ்போர்டு", icon: "🏪", intro: "Source fresh stock from farmers and plan your shop's requirements.", actions: [["🥬", "Browse produce", "/products"], ["📋", "Post stock requirement", "/requirements"], ["📦", "Purchase orders", "/orders"], ["🛒", "Cart", "/cart"]] },
  wholesaler: { title: "Wholesaler Dashboard", ta: "மொத்த விற்பனையாளர் டாஷ்போர்டு", icon: "🏢", intro: "Find bulk produce, post volume requirements and track fulfilment.", actions: [["🌾", "Browse bulk produce", "/products"], ["📋", "Bulk requirements", "/requirements"], ["📦", "Bulk orders", "/orders"], ["🛒", "Cart", "/cart"]] }
};
export default function RoleDashboard({ role = "consumer" }) {
  const navigate = useNavigate(); const { language } = useLanguage(); const ta = language === "ta";
  const cfg = config[role] || config.consumer;
  const [stats, setStats] = useState({ products: 0, orders: 0, requirements: 0 });
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  useEffect(() => {
    const token = localStorage.getItem("token"); if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.allSettled([
      role === "farmer" ? fetch(`${API}/api/products/mine`, { headers }).then(r => r.ok ? r.json() : {}) : fetch(`${API}/api/products`).then(r => r.ok ? r.json() : {}),
      fetch(`${API}/api/orders`, { headers }).then(r => r.ok ? r.json() : {}),
      fetch(`${API}/api/requirements`, { headers }).then(r => r.ok ? r.json() : {})
    ]).then(results => setStats({ products: results[0].status === "fulfilled" ? (results[0].value.products || []).length : 0, orders: results[1].status === "fulfilled" ? (results[1].value.orders || []).length : 0, requirements: results[2].status === "fulfilled" ? (results[2].value.requirements || []).length : 0 }));
  }, [role]);
  return <div className="fc-role-page"><Sidebar /><main className="fc-role-main"><header className="fc-role-hero"><div><span className="fc-eyebrow">FARMCONNECT · {role.toUpperCase()}</span><h1>{cfg.icon} {ta ? cfg.ta : cfg.title}</h1><p>{ta ? `வரவேற்கிறோம், ${user.name || "பயனர்"}!` : `Welcome, ${user.name || role}!`} {ta ? "உங்கள் செயல்பாடுகளை இங்கே நிர்வகிக்கலாம்." : cfg.intro}</p></div><button onClick={() => navigate(role === "farmer" ? "/add-product" : "/products")} className="fc-gold-button">{role === "farmer" ? (ta ? "+ பொருள் சேர்" : "+ Add produce") : (ta ? "சந்தையைப் பார்க்க" : "Explore marketplace")}</button></header>
  <section className="fc-stat-grid"><article><span>🥬</span><div><strong>{stats.products}</strong><p>{ta ? (role === "farmer" ? "எனது பட்டியல்கள்" : "கிடைக்கும் பொருட்கள்") : (role === "farmer" ? "My listings" : "Available listings")}</p></div></article><article><span>📦</span><div><strong>{stats.orders}</strong><p>{ta ? "ஆர்டர்கள்" : "Orders"}</p></div></article><article><span>📋</span><div><strong>{stats.requirements}</strong><p>{ta ? "விளைபொருள் தேவைகள்" : "Open requirements"}</p></div></article></section>
  <div className="fc-section-heading"><div><span className="fc-eyebrow">YOUR WORKSPACE</span><h2>{ta ? "விரைவு செயல்பாடுகள்" : "Quick actions"}</h2></div></div><section className="fc-action-grid">{cfg.actions.map(([icon, label, path]) => <button className="fc-action-card" key={path} onClick={() => navigate(path)}><span className="fc-action-icon">{icon}</span><strong>{ta ? ({"Add produce":"விளைபொருள் சேர்","My listings":"எனது பட்டியல்கள்","Buyer requirements":"வாங்குபவர் தேவைகள்","Orders & sales":"ஆர்டர்கள் மற்றும் விற்பனை","Browse marketplace":"சந்தையைப் பார்க்க","Browse produce":"விளைபொருட்களைப் பார்க்க","Browse bulk produce":"மொத்த விளைபொருட்கள்","My cart":"எனது கூடை","Cart":"கூடை","My orders":"எனது ஆர்டர்கள்","Purchase orders":"கொள்முதல் ஆர்டர்கள்","Bulk orders":"மொத்த ஆர்டர்கள்","Bulk requirements":"மொத்தத் தேவைகள்","Post stock requirement":"தேவையைப் பதிவு செய்","Request produce":"விளைபொருள் கோரிக்கை"}[label] || label) : label}</strong><span>↗</span></button>)}</section>
  <section className="fc-help-panel"><div><h2>{ta ? "நேரடி சந்தை அணுகல்" : "Direct market access"}</h2><p>{ta ? "விவசாயிகளையும் வாங்குபவர்களையும் நேரடியாக இணைக்கும் தளம்." : "FarmConnect connects farmers and buyers, helping them discover produce and coordinate orders directly."}</p></div><button className="fc-outline-button" onClick={() => navigate("/products")}>{ta ? "விளைபொருட்களைப் பார்க்க" : "View marketplace"} →</button></section>
  </main></div>;
}
