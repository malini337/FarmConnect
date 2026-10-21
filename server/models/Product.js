const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    demoKey: { type: String, unique: true, sparse: true, index: true },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    declaredQuantity: {
      type: Number,
      required: true,
      min: 0
    },

    unit: {
      type: String,
      enum: ["kg", "g", "gram", "litre", "piece", "quintal"],
      default: "kg"
    },

    expectedPrice: {
      type: Number,
      required: true,
      min: 0
    },

    qualityGrade: {
      type: String,
      enum: ["A", "B", "C", "Pending"],
      default: "Pending"
    },

    estimatedQuantity: {
      type: Number,
      default: null
    },

    verificationStatus: {
      type: String,
      enum: [
        "pending",
        "verified",
        "requires_verification",
        "rejected"
      ],
      default: "pending"
    },

    verificationMethod: {
      type: String,
      enum: ["live_camera", "manual", "none"],
      default: "none"
    },

    // Camera images are resized/compressed by the browser and stored as a bounded data URL.
    // This keeps the listing image tied to the actual assessed image without a new storage service.
    imageUrl: { type: String, default: "", maxlength: 300000 },
    location: {
  type: String,
  trim: true,
  maxlength: 160,
  default: ""
},

harvestDate: {
  type: Date,
  default: null
},

certifications: {
  type: [String],
  default: [],
  validate: {
    validator: (items) =>
      items.length <= 10 &&
      items.every((item) => typeof item === "string" && item.length <= 100),
    message: "Maximum 10 certifications are allowed."
  }
},
    assessmentTokenId: { type: String, unique: true, sparse: true, index: true },
    traceabilityToken: { type: String, unique: true, sparse: true, index: true },
    assessment: {
      appearanceScore: { type: Number, min: 0, max: 100, default: null },
      appearanceScoreReasons: [{ type: String, maxlength: 180 }],
      verificationScore: { type: Number, min: 0, max: 100, default: null },
      verificationReasons: [{ type: String, maxlength: 180 }],
      scoreMethod: { type: String, default: "", maxlength: 500 },
      detectedProduce: { type: String, default: "", maxlength: 100 },
      productMatchStatus: { type: String, enum: ["match", "possible_mismatch", "not_assessed", "uncertain", "unknown"], default: "unknown" },
      visibleQuality: { type: String, default: "", maxlength: 100 },
      estimatedWeightGrams: { type: Number, min: 0, default: null },
      estimatedWeightRangeGrams: { min: { type: Number, min: 0, default: null }, max: { type: Number, min: 0, default: null } },
      quantityComparison: { type: String, default: "", maxlength: 1000 },
      observations: { type: String, default: "", maxlength: 1000 },
      visibleIssues: [{ type: String, maxlength: 160 }],
      confidence: { type: String, enum: ["Low", "Medium", "High", "Unknown"], default: "Unknown" },
      quantityStatus: { type: String, default: "not_assessed" },
      assessedAt: { type: Date, default: null }
    },
    priceRecommendation: {
      status: { type: String, enum: ["available", "insufficient_data"], default: "insufficient_data" },
      suggestedMin: { type: Number, default: null },
      suggestedMax: { type: Number, default: null },
      referenceSource: { type: String, default: "", maxlength: 300 },
      referenceDate: { type: Date, default: null },
      explanation: { type: String, default: "Reliable local reference-price data is unavailable.", maxlength: 1000 }
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;