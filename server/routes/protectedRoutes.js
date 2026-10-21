const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const router = express.Router();
router.get("/profile", protect, async (req, res) => {
  try { const user = await User.findById(req.user.userId).select("name email role profileImage profileImageType avatarId phone location farmOrBusinessName createdAt updatedAt"); if(!user)return res.status(404).json({message:"Profile not found."}); res.json({user}); }
  catch(e){res.status(500).json({message:"Could not load profile."});}
});
router.patch("/profile", protect, async (req,res)=>{
  try {
    const allowed={name:typeof req.body.name==='string'?req.body.name.trim().slice(0,100):undefined,profileImage:typeof req.body.profileImage==='string'?req.body.profileImage.slice(0,500000):undefined,profileImageType:['avatar','upload','none'].includes(req.body.profileImageType)?req.body.profileImageType:undefined,avatarId:Number.isInteger(req.body.avatarId)&&req.body.avatarId>=1&&req.body.avatarId<=15?req.body.avatarId:undefined,phone:typeof req.body.phone==='string'?req.body.phone.trim().slice(0,30):undefined,location:typeof req.body.location==='string'?req.body.location.trim().slice(0,160):undefined,farmOrBusinessName:typeof req.body.farmOrBusinessName==='string'?req.body.farmOrBusinessName.trim().slice(0,120):undefined};
    if(allowed.name!==undefined&&!allowed.name)return res.status(400).json({message:'Name cannot be empty.'});
    if(allowed.profileImage!==undefined&&allowed.profileImage.length>450000)return res.status(413).json({message:'Profile image is too large. Use an image under approximately 300 KB.'});
    if(allowed.profileImageType==='upload'&&allowed.profileImage!==undefined&&!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(allowed.profileImage))return res.status(400).json({message:'Uploaded profile images must be JPEG, PNG or WebP data.'});
    const updates=Object.fromEntries(Object.entries(allowed).filter(([,v])=>v!==undefined));
    if(!Object.keys(updates).length)return res.status(400).json({message:'No supported profile fields were supplied.'});
    const user=await User.findByIdAndUpdate(req.user.userId,{$set:updates},{new:true,runValidators:true}).select('name email role profileImage profileImageType avatarId createdAt updatedAt');
    if(!user)return res.status(404).json({message:'Profile not found.'});res.json({user,message:'Profile updated.'});
  }catch(e){res.status(400).json({message:'Could not update profile.'});}
});
module.exports = router;
