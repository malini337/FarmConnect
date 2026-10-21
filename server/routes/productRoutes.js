
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  calculatePriceRecommendation,
  parseReferences
} = require("../utils/pricing");

const router = express.Router();

// Public marketplace: only available listings are shown.
router.get("/", async (req, res) => {
  try {
    const { search = "", category = "", farmer = "" } = req.query;

    const filter = { isAvailable: true };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (farmer) {
      filter.farmer = farmer;
    }

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } }
      ];
    }

    const products = await Product.find(filter)
      .select("-assessmentTokenId")
      .populate("farmer", "name location")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ products });
  } catch (error) {
    console.error("Product listing error:", error.message);
    res.status(500).json({
      message: "Could not load products."
    });
  }
});

// Get the logged-in farmer's listings.
router.get("/mine", protect, async (req, res) => {
  try {
    const products = await Product.find({
      farmer: req.user.userId
    }).sort({ createdAt: -1 });

    res.json({ products });
  } catch (error) {
    console.error("My products error:", error.message);
    res.status(500).json({
      message: "Could not load your listings."
    });
  }
});

// Create a product listing.
router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can create product listings."
      });
    }

    const {
      name,
      category,
      description,
      declaredQuantity,
      unit = "kg",
      expectedPrice,
      imageUrl = "",
      assessmentToken = "",
      language = "en",
      location: submittedLocation = "",
      harvestDate = "",
      certifications = []
    } = req.body;

    const quantity = Number(declaredQuantity);
    const price = Number(expectedPrice);

    if (
      typeof name !== "string" || !name.trim() ||
      typeof category !== "string" || !category.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0 || quantity > 1000000000 ||
      !Number.isFinite(price) ||
      price <= 0 || price > 100000000
    ) {
      return res.status(400).json({
        message:
          "Enter a product name, category, positive quantity and positive price."
      });
    }

    if (!["kg", "g", "gram", "litre", "piece", "quintal"].includes(unit)) {
      return res.status(400).json({
        message: "Choose a valid unit."
      });
    }

    if (
      typeof imageUrl !== "string" ||
      imageUrl.length > 300000 ||
      (
        imageUrl &&
        !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
          imageUrl
        )
      )
    ) {
      return res.status(400).json({
        message:
          "The produce image must be a valid supported image under approximately 200 KB."
      });
    }

    // Validate the signed Gemini assessment token, when supplied.
    let trustedAssessment = null;
    let assessmentTokenId;

    if (assessmentToken) {
      if (
        typeof assessmentToken !== "string" ||
        assessmentToken.length > 12000
      ) {
        return res.status(400).json({
          message: "Assessment token is invalid. Run AI assessment again."
        });
      }

      let decoded;

      try {
        decoded = jwt.verify(
          assessmentToken,
          process.env.JWT_SECRET
        );
      } catch {
        return res.status(400).json({
          message:
            "AI assessment token is invalid or expired. Run the assessment again before saving."
        });
      }

      const imageMatch = imageUrl.match(
        /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/
      );

      const submittedImageHash = imageMatch
        ? crypto
            .createHash("sha256")
            .update(imageMatch[2], "utf8")
            .digest("hex")
        : "";

      if (
        String(decoded.sub) !== String(req.user.userId) ||
        String(decoded.productName).trim().toLowerCase() !==
          name.trim().toLowerCase() ||
        String(decoded.category).trim().toLowerCase() !==
          String(category).trim().toLowerCase() ||
        String(decoded.declaredQuantity ?? "").trim() !==
          String(declaredQuantity ?? "").trim() ||
        String(decoded.unit || "kg") !== String(unit) ||
        !submittedImageHash ||
        submittedImageHash !== decoded.imageHash ||
        !decoded.analysis ||
        typeof decoded.jti !== "string"
      ) {
        return res.status(400).json({
          message:
            "The AI assessment does not match this image, user or product details. Run the assessment again before saving."
        });
      }

      if (
        await Product.exists({
          assessmentTokenId: decoded.jti
        })
      ) {
        return res.status(409).json({
          message:
            "This AI assessment has already been used. Run the assessment again for a new listing."
        });
      }

      trustedAssessment = decoded.analysis;
      assessmentTokenId = decoded.jti;
    }

    // Store only validated fields from the signed AI assessment.
    const assessment = trustedAssessment || {};

    const safeAssessment = trustedAssessment
      ? {
          appearanceScore:
            Number.isInteger(assessment.appearanceScore) &&
            assessment.appearanceScore >= 0 &&
            assessment.appearanceScore <= 100
              ? assessment.appearanceScore
              : null,

          verificationScore:
            Number.isInteger(assessment.verificationScore) &&
            assessment.verificationScore >= 0 &&
            assessment.verificationScore <= 100
              ? assessment.verificationScore
              : null,

          scoreMethod: String(
            assessment.verificationScoreMethod || ""
          ).slice(0, 500),

          verificationReasons: Array.isArray(
            assessment.verificationScoreReasons
          )
            ? assessment.verificationScoreReasons
                .filter((item) => typeof item === "string")
                .slice(0, 6)
                .map((item) => item.slice(0, 180))
            : [],

          appearanceScoreReasons: Array.isArray(
            assessment.appearanceScoreReasons
          )
            ? assessment.appearanceScoreReasons
                .filter((item) => typeof item === "string")
                .slice(0, 6)
                .map((item) => item.slice(0, 180))
            : [],

          detectedProduce: String(
            assessment.detectedProduceEnglish ||
              assessment.detectedProduce ||
              ""
          ).slice(0, 100),

          productMatchStatus: [
            "match",
            "possible_mismatch",
            "not_assessed",
            "uncertain"
          ].includes(assessment.productMatchStatus)
            ? assessment.productMatchStatus
            : "unknown",

          visibleQuality: String(
            assessment.visibleQuality || ""
          ).slice(0, 100),

          estimatedWeightGrams:
            Number.isFinite(
              Number(assessment.estimatedWeightGrams)
            ) &&
            Number(assessment.estimatedWeightGrams) > 0
              ? Number(assessment.estimatedWeightGrams)
              : null,

          estimatedWeightRangeGrams:
            assessment.estimatedWeightRangeGrams &&
            Number(assessment.estimatedWeightRangeGrams.min) > 0 &&
            Number(assessment.estimatedWeightRangeGrams.max) >=
              Number(assessment.estimatedWeightRangeGrams.min)
              ? {
                  min: Number(
                    assessment.estimatedWeightRangeGrams.min
                  ),
                  max: Number(
                    assessment.estimatedWeightRangeGrams.max
                  )
                }
              : {
                  min: null,
                  max: null
                },

          quantityComparison: String(
            assessment.quantityComparison || ""
          ).slice(0, 1000),

          observations: String(
            assessment.observations || ""
          ).slice(0, 1000),

          visibleIssues: Array.isArray(assessment.visibleIssues)
            ? assessment.visibleIssues
                .filter((item) => typeof item === "string")
                .slice(0, 8)
                .map((item) => item.slice(0, 160))
            : [],

          confidence: ["Low", "Medium", "High"].includes(
            assessment.confidence
          )
            ? assessment.confidence
            : "Unknown",

          quantityStatus: String(
            assessment.quantityStatus || "not_assessed"
          ).slice(0, 60),

          assessedAt: new Date()
        }
      : {};

    // Resolve the location and validate the optional traceability fields.
    const farmer = await User.findById(
      req.user.userId
    )
      .select("location")
      .lean();

    const location = String(
      submittedLocation || farmer?.location || ""
    )
      .trim()
      .slice(0, 160);

    let cleanHarvestDate = null;

    if (harvestDate) {
      cleanHarvestDate = new Date(harvestDate);

      if (Number.isNaN(cleanHarvestDate.getTime())) {
        return res.status(400).json({
          message: "Enter a valid harvest date."
        });
      }

      if (cleanHarvestDate > new Date()) {
        return res.status(400).json({
          message: "Harvest date cannot be in the future."
        });
      }
    }

    const certificationItems = Array.isArray(certifications)
      ? certifications
      : String(certifications || "").split(",");

    const safeCertifications = certificationItems
      .map((item) => String(item).trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 10);

    // Calculate a price recommendation using configured reference prices.
    const referencePrices = parseReferences(
      process.env.MARKET_PRICE_REFERENCE_JSON
    );

    const recommendation = calculatePriceRecommendation({
      name,
      category,
      location,
      unit,
      expectedPrice: price,
      references: referencePrices,
      language
    });

    const safePrice =
      recommendation.status === "available"
        ? {
            status: "available",
            suggestedMin: Number(
              recommendation.suggestedRange.min
            ),
            suggestedMax: Number(
              recommendation.suggestedRange.max
            ),
            referenceSource: String(
              recommendation.source || ""
            ).slice(0, 300),
            referenceDate: recommendation.referenceDate
              ? new Date(recommendation.referenceDate)
              : null,
            explanation: String(
              recommendation.explanation || ""
            ).slice(0, 1000)
          }
        : {
            status: "insufficient_data",
            explanation: String(
              recommendation.explanation ||
                "No matching, dated reference price is configured."
            ).slice(0, 1000)
          };

    const product = await Product.create({
      farmer: req.user.userId,
      name: name.trim(),
      category,
      description: String(description || "").slice(0, 2000),
      declaredQuantity: quantity,
      unit,
      expectedPrice: price,
      imageUrl,
      location,
      harvestDate: cleanHarvestDate,
      certifications: safeCertifications,
      assessmentTokenId,
      traceabilityToken: crypto.randomBytes(24).toString("hex"),
      assessment: safeAssessment,
      priceRecommendation: safePrice
    });

    res.status(201).json({
      message: "Product created successfully.",
      product
    });
  } catch (error) {
    if (
      error?.code === 11000 &&
      error?.keyPattern?.assessmentTokenId
    ) {
      return res.status(409).json({
        message:
          "This AI assessment has already been used. Run the assessment again for a new listing."
      });
    }

    console.error("Product creation error:", error.message);

    res.status(500).json({
      message: "Server error while creating product."
    });
  }
});

// Update an existing listing, including its traceability details.
router.patch("/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can update listings."
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid product ID."
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      farmer: req.user.userId
    });

    if (!product) {
      return res.status(404).json({
        message: "Listing not found."
      });
    }

    const allowed = [
      "name",
      "category",
      "description",
      "declaredQuantity",
      "unit",
      "expectedPrice",
      "isAvailable"
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    }

    if (req.body.location !== undefined) {
      product.location = String(
        req.body.location || ""
      )
        .trim()
        .slice(0, 160);
    }

    if (req.body.harvestDate !== undefined) {
      if (!req.body.harvestDate) {
        product.harvestDate = null;
      } else {
        const date = new Date(req.body.harvestDate);

        if (
          Number.isNaN(date.getTime()) ||
          date > new Date()
        ) {
          return res.status(400).json({
            message:
              "Enter a valid harvest date that is not in the future."
          });
        }

        product.harvestDate = date;
      }
    }

    if (req.body.certifications !== undefined) {
      const entries = Array.isArray(req.body.certifications)
        ? req.body.certifications
        : String(req.body.certifications || "").split(",");

      product.certifications = entries
        .map((item) => String(item).trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 10);
    }

    if (!String(product.name || "").trim() || !String(product.description || "").trim()) {
      return res.status(400).json({ message: "Product name and description cannot be blank." });
    }
    if (!Number.isFinite(Number(product.declaredQuantity)) || Number(product.declaredQuantity) <= 0 || Number(product.declaredQuantity) > 1000000000 || !Number.isFinite(Number(product.expectedPrice)) || Number(product.expectedPrice) <= 0 || Number(product.expectedPrice) > 100000000) {
      return res.status(400).json({ message: "Quantity and price must be positive, finite and within supported limits." });
    }
    if (!["kg", "g", "gram", "litre", "piece", "quintal"].includes(product.unit)) {
      return res.status(400).json({ message: "Choose a valid unit." });
    }
    product.name = String(product.name).trim().slice(0, 100);
    product.description = String(product.description).trim().slice(0, 2000);
    await product.save();

    res.json({
      message: "Listing updated.",
      product
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Could not update listing."
    });
  }
});

// Delete a farmer's own listing.
router.delete("/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can remove listings."
      });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user.userId
    });

    if (!product) {
      return res.status(404).json({
        message: "Listing not found."
      });
    }

    res.json({
      message: "Listing removed."
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not remove listing."
    });
  }
});

module.exports = router;
