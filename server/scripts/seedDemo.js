require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Product = require("../models/Product");
const Requirement = require("../models/Requirement");
const LogisticsGroup = require("../models/LogisticsGroup");
const InterestRequest = require("../models/InterestRequest");
const Notification = require("../models/Notification");

const password = process.env.DEMO_ACCOUNT_PASSWORD || "FarmConnectDemo!26";
const users = [
  {key:"farmer",name:"Demo Farmer Meena",email:"demo.farmer@farmconnect.local",role:"farmer",location:"Chennai"},
  {key:"consumer",name:"Demo Consumer Arjun",email:"demo.consumer@farmconnect.local",role:"consumer",location:"Chennai"},
  {key:"retailer",name:"Demo Retailer Kavya",email:"demo.retailer@farmconnect.local",role:"retailer",location:"Chennai"},
  {key:"wholesaler",name:"Demo Wholesaler Ravi",email:"demo.wholesaler@farmconnect.local",role:"wholesaler",location:"Kanchipuram"}
];
const products = require("../utils/demoCatalog");
async function upsertByKey(Model,key,create){let doc=await Model.findOne({demoKey:key});if(doc)return doc;doc=await Model.create({...create,demoKey:key});return doc;}
async function main(){
 if(process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production.");
 if(process.env.DEMO_MODE !== "true") throw new Error("Set DEMO_MODE=true explicitly before seeding demo records.");
 if(!process.env.MONGO_URI)throw new Error("MONGO_URI is required. No database was modified.");
 await mongoose.connect(process.env.MONGO_URI);
 // Abort before creating anything if a demo email belongs to a non-demo account.
 for (const u of users) {
   const existing = await User.findOne({ email: u.email }).select("demoKey");
   if (existing && existing.demoKey !== `farmconnect-${u.key}`) {
     throw new Error(`Demo email ${u.email} already belongs to an account without the expected demo key. No demo records were seeded; use a different demo email or inspect the existing account manually.`);
   }
 }
 const hash=await bcrypt.hash(password,10); const seededUsers={};
 for(const u of users){let doc=await User.findOne({demoKey:`farmconnect-${u.key}`});if(!doc)doc=await User.create({name:u.name,email:u.email,password:hash,role:u.role,location:u.location,farmOrBusinessName:`FarmConnect Demo ${u.role}`,demoKey:`farmconnect-${u.key}`});seededUsers[u.key]=doc;}
 const farmer=seededUsers.farmer, consumer=seededUsers.consumer, retailer=seededUsers.retailer, wholesaler=seededUsers.wholesaler; const createdProducts=[];
 // Remove only legacy feature demo records created by earlier versions of this seeder.
 // User-created requirements, requests, notifications, and logistics groups are untouched.
 await Promise.all([
   Requirement.deleteMany({ demoKey: { $in: ["farmconnect-requirement-tomato-retailer", "farmconnect-requirement-banana-consumer"] } }),
   LogisticsGroup.deleteMany({ demoKey: "farmconnect-logistics-demo" }),
   InterestRequest.deleteMany({ demoKey: "farmconnect-interest-demo" }),
   Notification.deleteMany({ demoKey: "farmconnect-notification-demo" })
 ]);
 for(let i=0;i<products.length;i++){const [slug,name,category,qty,unit,price,remoteImageUrl]=products[i];const imageUrl=remoteImageUrl || `/demo-products/${slug}.svg`;let product=await Product.findOne({demoKey:`farmconnect-product-${slug}`});if(product){if(product.imageUrl!==imageUrl){product.imageUrl=imageUrl;await product.save();}}else{product=await Product.create({demoKey:`farmconnect-product-${slug}`,farmer:farmer._id,name,category,description:`Illustrative FarmConnect demo listing for ${name}. Price is demo-only, not a live market quote.`,declaredQuantity:qty,unit,expectedPrice:price,imageUrl,location:"Chennai, Tamil Nadu",isAvailable:true,verificationStatus:"pending",verificationMethod:"none",certifications:[],traceabilityToken:`demo-${slug}-${require('crypto').createHash('sha256').update(slug).digest('hex').slice(0,24)}`,priceRecommendation:{status:"insufficient_data",explanation:"Illustrative demo listing; no live market reference data configured."}});}createdProducts.push(product);}
 const tomato=createdProducts[0], banana=createdProducts[10];
 console.log(JSON.stringify({demoUsers:users.map(({email,role})=>({email,role})),demoProducts:createdProducts.length,seedMode:"idempotent; seeds demo accounts and product listings only; removes only legacy feature-demo records",demoPassword:password},null,2));
 await mongoose.disconnect();
}
main().catch(async e=>{console.error("Demo seed failed:",e.message);try{await mongoose.disconnect()}catch{}process.exitCode=1;});
