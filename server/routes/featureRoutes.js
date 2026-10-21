
const express = require("express");
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Requirement = require("../models/Requirement");
const Order = require("../models/Order");
const LogisticsGroup = require("../models/LogisticsGroup");
const InterestRequest = require("../models/InterestRequest");
const Notification = require("../models/Notification");
const Review = require("../models/Review");
const User = require("../models/User");
const { calculatePriceRecommendation, parseReferences } = require("../utils/pricing");
const { canTransitionLogistics } = require("../utils/workflowRules");

const router = express.Router();

// Get traceability information for a product.
router.get("/trace/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();

    if (!token || token.length > 200) {
      return res.status(400).json({
        message: "Invalid traceability token."
      });
    }

    const product = await Product.findOne({
      traceabilityToken: token
    }).populate("farmer", "name location");

    if (!product) {
      return res.status(404).json({
        message: "Traceability record not found."
      });
    }

    const assessment = product.assessment || {};
    const recommendation = product.priceRecommendation || {};

    return res.json({
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        description: product.description || "",
        declaredQuantity: product.declaredQuantity,
        unit: product.unit,
        expectedPrice: product.expectedPrice,
        imageUrl: product.imageUrl || "",
        isAvailable: product.isAvailable,
        verificationStatus: product.verificationStatus || "pending",
        certificationStatus: "unverified",
        createdAt: product.createdAt,

        farmer: {
          name: product.farmer?.name || "Farmer",
          location:
            product.location ||
            product.farmer?.location ||
            "Not recorded"
        },

        location:
          product.location ||
          product.farmer?.location ||
          "Not recorded",

        harvestDate: product.harvestDate || null,

        certifications: Array.isArray(product.certifications)
          ? product.certifications
          : [],

        assessment: {
          appearanceScore:
            assessment.appearanceScore ?? null,

          verificationScore:
            assessment.verificationScore ?? null,

          scoreMethod:
            assessment.scoreMethod || "",

          verificationReasons:
            Array.isArray(assessment.verificationReasons)
              ? assessment.verificationReasons
              : [],

          appearanceScoreReasons:
            Array.isArray(assessment.appearanceScoreReasons)
              ? assessment.appearanceScoreReasons
              : [],

          detectedProduce:
            assessment.detectedProduce || "",

          productMatchStatus:
            assessment.productMatchStatus || "unknown",

          visibleQuality:
            assessment.visibleQuality || "",

          estimatedWeightGrams:
            assessment.estimatedWeightGrams ?? null,

          estimatedWeightRangeGrams:
            assessment.estimatedWeightRangeGrams || {
              min: null,
              max: null
            },

          quantityComparison:
            assessment.quantityComparison || "",

          observations:
            assessment.observations || "",

          visibleIssues:
            Array.isArray(assessment.visibleIssues)
              ? assessment.visibleIssues
              : [],

          confidence:
            assessment.confidence || "Unknown",

          quantityStatus:
            assessment.quantityStatus || "not_assessed",

          assessedAt:
            assessment.assessedAt || null
        },

        priceRecommendation: {
          status:
            recommendation.status || "insufficient_data",

          suggestedMin:
            recommendation.suggestedMin ?? null,

          suggestedMax:
            recommendation.suggestedMax ?? null,

          referenceSource:
            recommendation.referenceSource || "",

          referenceDate:
            recommendation.referenceDate || null,

          explanation:
            recommendation.explanation || ""
        }
      }
    });
  } catch (error) {
    console.error("Traceability lookup error:", error.message);

    return res.status(500).json({
      message: "Could not load the traceability record."
    });
  }
});

// Get the logged-in farmer's product listings.
router.get("/my-products", protect, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can access their listings."
      });
    }

    const products = await Product.find({
      farmer: req.user.userId
    }).sort({ createdAt: -1 });

    return res.json({ products });
  } catch (error) {
    console.error("My products lookup error:", error.message);

    return res.status(500).json({
      message: "Could not load your listings."
    });
  }
});


const buyerRoles = ["consumer", "retailer", "wholesaler"];
const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const { normalizeProductName: normalize, unitsCompatible } = require("../utils/textMatching");

// Fair price recommendations use only dated, explicitly sourced server configuration.
router.post("/price-recommendation", protect, async (req, res) => {
  try {
    const { name, category, unit = "kg", location = "", expectedPrice, language = "en" } = req.body || {};
    if (!clean(name, 100) || !clean(category, 100) || !["kg", "g", "gram", "litre", "piece", "quintal"].includes(unit)) {
      return res.status(400).json({ message: "Enter a product name, category and valid unit." });
    }
    const result = calculatePriceRecommendation({ name: clean(name,100), category: clean(category,100), unit, location: clean(location,160), expectedPrice, references: parseReferences(process.env.MARKET_PRICE_REFERENCE_JSON), language });
    return res.json({ recommendation: result, demo: false });
  } catch (error) { return res.status(500).json({ message: "Could not calculate a price recommendation." }); }
});

// Explainable matching: exact/normalized product name or matching category, open requirements only.
router.get("/matches", protect, async (req, res) => {
  try {
    if (req.user.role !== "farmer") return res.status(403).json({ message: "Buyer matching is available to farmer accounts." });
    const [products, requirements] = await Promise.all([
      Product.find({ farmer: req.user.userId, isAvailable: true }).populate("farmer", "name location"),
      Requirement.find({ status: "open", demoKey: { $exists: false }, buyer: { $ne: req.user.userId } }).populate("buyer", "name role location")
    ]);
    const matches = [];
    for (const requirement of requirements) for (const product of products) {
      const sameName = normalize(product.name) === normalize(requirement.productName);
      const categoryMatches = !requirement.category || requirement.category === "Any" || normalize(product.category) === normalize(requirement.category);
      if (!sameName && !(categoryMatches && normalize(requirement.productName) === "any")) continue;
      const reasons = [];
      let score = 40;
      if (sameName) { score += 35; reasons.push("Product name matches"); } else reasons.push("Product name differs");
      if (categoryMatches) { score += 15; reasons.push("Category matches"); } else reasons.push("Category differs");
      if (requirement.targetPrice == null) reasons.push("Buyer budget not supplied");
      else if (product.expectedPrice <= requirement.targetPrice) { score += 10; reasons.push("Within buyer target price"); }
      else reasons.push("Above buyer target price");
      if (!unitsCompatible(product.unit, requirement.unit)) reasons.push("Units differ; quantity not compared");
      else if (product.declaredQuantity >= requirement.quantity) { score += 10; reasons.push("Quantity appears sufficient"); }
      else reasons.push("Quantity may be insufficient");
      matches.push({ requirement, product, score: Math.min(100, score), reasons });
    }
    matches.sort((a,b) => b.score-a.score || String(a.requirement._id).localeCompare(String(b.requirement._id)));
    return res.json({ method: "Exact product-name and category matching with target-price and compatible-unit quantity reasons; only open requirements are included.", matches: matches.slice(0,100) });
  } catch (error) { return res.status(500).json({ message: "Could not load buyer matches." }); }
});

router.get("/logistics", protect, async (req,res) => {
  try {
    const groups = await LogisticsGroup.find({ demoKey: { $exists: false }, status: { $in: ["open", "forming", "ready", "in_transit"] } })
      .populate("createdBy", "name location").populate("participants.farmer", "name location")
      .populate("participants.product", "name unit").populate("orders", "status total deliveryAddress").sort({ createdAt: -1 }).limit(100);
    return res.json({ groups });
  } catch (e) { return res.status(500).json({ message: "Could not load logistics groups." }); }
});
router.post("/logistics", protect, async (req,res) => {
  try {
    if (req.user.role !== "farmer") return res.status(403).json({message:"Only farmers can create shipment groups."});
    const title=clean(req.body.title,120), destination=clean(req.body.destination,200);
    if (!title || !destination) return res.status(400).json({message:"Group title and destination are required."});
    const group = new LogisticsGroup({ createdBy:req.user.userId, title, destination, originArea:clean(req.body.originArea,200), deliveryWindow:req.body.deliveryWindow || null, notes:clean(req.body.notes,1000) });
    if (req.body.productId) {
      if (!mongoose.isValidObjectId(req.body.productId)) return res.status(400).json({message:"Invalid product."});
      const product = await Product.findOne({_id:req.body.productId, farmer:req.user.userId, isAvailable:true});
      const quantity = Number(req.body.quantity);
      if (!product || !Number.isFinite(quantity) || quantity <= 0 || quantity > product.declaredQuantity) return res.status(400).json({message:"Choose your available product and a valid quantity within the listed stock."});
      group.participants.push({farmer:req.user.userId, product:product._id, quantity});
      group.status = "forming";
    }
    if (req.body.orderId) {
      if (!mongoose.isValidObjectId(req.body.orderId)) return res.status(400).json({message:"Invalid order."});
      const order=await Order.findOne({_id:req.body.orderId, paymentStatus:"paid", status:{ $in:["accepted","packed","dispatched"] }, "items.farmer":req.user.userId});
      if (!order) return res.status(400).json({message:"Only your eligible paid orders can be associated with a group."});
      group.orders.push(order._id); group.status="forming";
      if (!group.participants.some(p=>String(p.farmer)===String(req.user.userId))) group.participants.push({farmer:req.user.userId});
    }
    await group.save();
    await Notification.create({recipient:req.user.userId, actor:req.user.userId, type:"logistics_created", message:`Demo/application event: shipment group “${title}” was created.`, entityType:"logistics", entityId:group._id});
    return res.status(201).json({message:"Shipment group created.", group});
  } catch(e) { return res.status(500).json({message:"Could not create shipment group."}); }
});
router.post("/logistics/:id/join", protect, async (req,res) => {
  try {
    if (req.user.role !== "farmer") return res.status(403).json({message:"Only farmers can join shipment groups."});
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid group."});
    const group=await LogisticsGroup.findById(req.params.id);
    if (!group || !["open","forming"].includes(group.status)) return res.status(404).json({message:"Open shipment group not found."});
    if (group.participants.some(p=>String(p.farmer)===String(req.user.userId))) return res.status(409).json({message:"You are already a participant."});
    let participant={farmer:req.user.userId};
    if (req.body.productId) {
      const product=await Product.findOne({_id:req.body.productId,farmer:req.user.userId,isAvailable:true}); const quantity=Number(req.body.quantity);
      if (!product || !Number.isFinite(quantity) || quantity<=0 || quantity>product.declaredQuantity) return res.status(400).json({message:"Select your available product and a valid quantity within stock."});
      participant={...participant,product:product._id,quantity};
    }
    if (req.body.orderId) {
      const order=await Order.findOne({_id:req.body.orderId,paymentStatus:"paid",status:{ $in:["accepted","packed","dispatched"] },"items.farmer":req.user.userId});
      if (!order) return res.status(400).json({message:"Only your eligible paid orders can join this group."});
      group.orders.push(order._id);
    }
    if (!req.body.productId && !req.body.orderId) return res.status(400).json({message:"Choose a product or eligible paid order to join."});
    group.participants.push(participant); group.status="forming"; await group.save();
    await Notification.create({recipient:group.createdBy,actor:req.user.userId,type:"logistics_joined",message:`A farmer joined ${group.title}.`,entityType:"logistics",entityId:group._id});
    return res.json({message:"Joined shipment group.",group});
  } catch(e) { return res.status(500).json({message:"Could not join shipment group."}); }
});

router.get("/forecast", protect, async (req,res) => {
  try {
    if (req.user.role !== "farmer") return res.status(403).json({message:"Demand forecasting is available to farmers."});
    const since=new Date(Date.now()-90*24*60*60*1000);
    const orders=await Order.find({status:"delivered",createdAt:{$gte:since},"items.farmer":req.user.userId}).select("items createdAt");
    const totals=new Map();
    for (const order of orders) for (const item of order.items) if (String(item.farmer)===String(req.user.userId)) {
      const key=`${item.name}|${item.unit}`; const v=totals.get(key)||{product:item.name,unit:item.unit,historicalQuantity:0}; v.historicalQuantity+=Number(item.quantity)||0; totals.set(key,v);
    }
    const available=orders.length>=3 && totals.size>0;
    return res.json({periodDays:90,generatedAt:new Date(),completedOrderCount:orders.length,forecastAvailable:available,method:"Simple 90-day delivered-order run rate scaled to 30 days; not a seasonal or validated predictive model.",message:available?"Estimate based on recorded delivered orders.":"Insufficient historical data for a reliable forecast. This is not actual demand data; add completed orders before using this estimate.",items:available?[...totals.values()].map(x=>({...x,estimatedDemandNext30Days:Math.round(x.historicalQuantity/3*100)/100})):[]});
  } catch(e) { return res.status(500).json({message:"Could not calculate demand forecast."}); }
});

router.get("/trust/:userId", protect, async (req,res) => {
  try {
    const userId=req.params.userId || req.user.userId;
    if (String(userId)!==String(req.user.userId) && !["consumer","retailer","wholesaler"].includes(req.user.role)) return res.status(403).json({message:"You cannot view this trust profile."});
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({message:"Invalid user profile."});
    const target=await User.findById(userId).select("name role location createdAt"); if(!target)return res.status(404).json({message:"Trust profile not found."});
    const [products,delivered,reviewCount,avg]=await Promise.all([
      Product.countDocuments({farmer:userId}),Order.countDocuments({status:"delivered","items.farmer":userId}),Review.countDocuments({reviewedUser:userId}),Review.aggregate([{$match:{reviewedUser:new mongoose.Types.ObjectId(userId)}},{$group:{_id:null,avg:{$avg:"$rating"}}}])
    ]);
    return res.json({trust:{profile:{name:target.name,role:target.role,location:target.location||"Not recorded",memberSince:target.createdAt},indicators:{listedProducts:products,deliveredOrders:delivered,reviewCount,averageReview:avg[0]?.avg?Math.round(avg[0].avg*10)/10:null,identityStatus:"unverified",certificationStatus:"unverified"},definitions:{identityStatus:"Account profile only; identity has not been independently verified by this feature.",certificationStatus:"No independent certification evidence is recorded. User-entered claims are not verified.",averageReview:"Calculated from saved reviews, if any."}}});
  } catch(e) { return res.status(500).json({message:"Could not load trust data."}); }
});

router.get("/requests", protect, async (req,res) => {
  try { const requests=await InterestRequest.find({demoKey:{$exists:false},$or:[{sender:req.user.userId},{recipient:req.user.userId}]}).populate("sender","name role").populate("recipient","name role").populate("product","name").sort({createdAt:-1}).limit(100); return res.json({requests}); }
  catch(e){return res.status(500).json({message:"Could not load requests."});}
});
router.post("/requests", protect, async (req,res) => {
  try {
    const recipientId=req.body.recipientId; if(!mongoose.isValidObjectId(recipientId)||String(recipientId)===String(req.user.userId))return res.status(400).json({message:"Choose a valid other user."});
    const recipient=await User.findById(recipientId).select("role"); if(!recipient)return res.status(404).json({message:"Recipient not found."});
    let product=null; if(req.body.productId){product=await Product.findById(req.body.productId);if(!product)return res.status(404).json({message:"Product not found."}); if(req.user.role==="farmer"&&String(product.farmer)!==String(req.user.userId))return res.status(403).json({message:"You can only send interest for your own listing."});}
    const productName=clean(req.body.productName || product?.name,100); const quantity=req.body.quantity==null?null:Number(req.body.quantity);
    if(!productName || (quantity!=null&&(!Number.isFinite(quantity)||quantity<=0)))return res.status(400).json({message:"Enter a product and a valid optional quantity."});
    const request=await InterestRequest.create({sender:req.user.userId,recipient:recipientId,product:product?._id||null,productName,quantity,unit:req.body.unit||product?.unit||"kg",message:clean(req.body.message,1000)});
    await Notification.create({recipient:recipientId,actor:req.user.userId,type:"interest_request",message:`New interest request for ${productName}.`,entityType:"request",entityId:request._id});
    return res.status(201).json({message:"Interest request sent.",request});
  }catch(e){return res.status(500).json({message:"Could not create request."});}
});
router.patch("/requests/:id", protect, async(req,res)=>{
 try { if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid request."}); const status=req.body.status; if(!["accepted","rejected","cancelled"].includes(status))return res.status(400).json({message:"Invalid request status."}); const request=await InterestRequest.findById(req.params.id);if(!request)return res.status(404).json({message:"Request not found."});if(status==="cancelled"?String(request.sender)!==String(req.user.userId):String(request.recipient)!==String(req.user.userId))return res.status(403).json({message:"You cannot change this request."});if(request.status!=="pending")return res.status(409).json({message:"Only pending requests can change status."});request.status=status;await request.save();if(status!=="cancelled")await Notification.create({recipient:request.sender,actor:req.user.userId,type:"request_status",message:`Request for ${request.productName} was ${status}.`,entityType:"request",entityId:request._id});return res.json({message:`Request ${status}.`,request}); }
 catch(e){return res.status(500).json({message:"Could not update request."});}
});
router.get("/notifications", protect, async(req,res)=>{try{const notifications=await Notification.find({demoKey:{$exists:false},recipient:req.user.userId}).sort({createdAt:-1}).limit(100);const unread=await Notification.countDocuments({demoKey:{$exists:false},recipient:req.user.userId,readAt:null});return res.json({notifications,unread});}catch(e){return res.status(500).json({message:"Could not load notifications."});}});
router.patch("/notifications/:id/read", protect, async(req,res)=>{try{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid notification."});const n=await Notification.findOneAndUpdate({_id:req.params.id,recipient:req.user.userId,readAt:null},{$set:{readAt:new Date()}},{new:true});if(!n){const existing=await Notification.findOne({_id:req.params.id,recipient:req.user.userId});if(!existing)return res.status(404).json({message:"Notification not found."});return res.json({message:"Notification already read.",notification:existing});}return res.json({message:"Notification marked as read.",notification:n});}catch(e){return res.status(500).json({message:"Could not update notification."});}});
router.post("/reviews", protect, async(req,res)=>{try{const {orderId,reviewedUserId,rating,comment=""}=req.body;if(!mongoose.isValidObjectId(orderId)||!mongoose.isValidObjectId(reviewedUserId)||!Number.isInteger(Number(rating))||Number(rating)<1||Number(rating)>5)return res.status(400).json({message:"Provide a delivered order, review target and rating from 1 to 5."});const order=await Order.findOne({_id:orderId,status:"delivered",buyer:req.user.userId});if(!order||!order.items.some(i=>String(i.farmer)===String(reviewedUserId)))return res.status(403).json({message:"Reviews are allowed only for a farmer in your delivered order."});const review=await Review.create({order:order._id,reviewer:req.user.userId,reviewedUser:reviewedUserId,rating:Number(rating),comment:clean(comment,1000)});return res.status(201).json({message:"Review saved.",review});}catch(e){if(e.code===11000)return res.status(409).json({message:"You have already reviewed this order and farmer."});return res.status(500).json({message:"Could not save review."});}});

module.exports = router;
