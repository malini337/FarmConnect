const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const aiRoutes = require("./routes/aiRoutes");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const productRoutes = require("./routes/productRoutes");
const commerceRoutes = require("./routes/commerceRoutes");
const featureRoutes = require("./routes/featureRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const mlRoutes = require("./routes/mlRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/products", productRoutes);
app.use("/api", commerceRoutes);
app.use("/api/features", featureRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ml", mlRoutes);

// Unknown API paths must remain JSON; otherwise the Vite/SPA HTML fallback can
// trigger the frontend's confusing "Unexpected token <" JSON parser error.
app.use("/api", (req, res) => res.status(404).json({ message: `API endpoint not found: ${req.method} ${req.originalUrl}` }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({ message: status >= 500 ? "Unexpected server error." : (err.message || "Request failed.") });
});

// MongoDB Atlas connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas connected successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Farmer Marketplace API is running!"
  });
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});