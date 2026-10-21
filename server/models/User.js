const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    demoKey: { type: String, unique: true, sparse: true, index: true },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: [
        "farmer",
        "consumer",
        "retailer",
        "wholesaler"
      ],
      required: true
    },

    profileImage: {
      type: String,
      default: ""
    },

    profileImageType: {
      type: String,
      enum: ["avatar", "upload", "none"],
      default: "none"
    },

    avatarId: {
      type: Number,
      default: null
    },

    phone: { type: String, trim: true, maxlength: 30, default: "" },
    location: { type: String, trim: true, maxlength: 160, default: "" },
    farmOrBusinessName: { type: String, trim: true, maxlength: 120, default: "" },

    /* ==========================================
       FORGOT PASSWORD
       ========================================== */

    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;