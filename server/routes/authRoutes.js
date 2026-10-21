const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// Public demo account picker is deliberately disabled unless DEMO_MODE=true.
router.get("/demo-accounts", (req, res) => {
  if (process.env.NODE_ENV === "production" || process.env.DEMO_MODE !== "true") return res.status(404).json({ message: "Demo accounts are disabled." });
  const password = process.env.DEMO_ACCOUNT_PASSWORD || "FarmConnectDemo!26";
  return res.json({ enabled: true, accounts: [
    { role: "farmer", label: "Demo Farmer", email: "demo.farmer@farmconnect.local", password },
    { role: "consumer", label: "Demo Consumer", email: "demo.consumer@farmconnect.local", password },
    { role: "retailer", label: "Demo Retailer", email: "demo.retailer@farmconnect.local", password },
    { role: "wholesaler", label: "Demo Wholesaler", email: "demo.wholesaler@farmconnect.local", password }
  ] });
});

// Language support
const getLanguage = (language) => (language === "ta" ? "ta" : "en");

const messages = {
  en: {
    registerRequired: "Name, email, password and role are required",
    invalidRole: "Invalid account type",
    emailExists: "Email already registered",
    registrationSuccess: "Registration successful",
    registrationError: "Server error during registration",
    loginRequired: "Email and password are required",
    invalidLogin: "Invalid email or password",
    loginSuccess: "Login successful",
    loginError: "Server error during login",
    forgotRequired: "Email address is required",
    forgotSuccess:
      "If an account exists with this email, a password reset link has been sent.",
    forgotError: "Unable to process password reset request",
    resetInvalid: "This password reset link is invalid or has expired.",
    resetRequired: "New password is required",
    passwordTooShort: "Password must contain at least 6 characters",
    resetSuccess: "Password reset successful. You can now login with your new password.",
    resetError: "Unable to reset password",
  },
  ta: {
    registerRequired: "பெயர், மின்னஞ்சல், கடவுச்சொல் மற்றும் கணக்கு வகை தேவை",
    invalidRole: "தவறான கணக்கு வகை",
    emailExists: "இந்த மின்னஞ்சல் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது",
    registrationSuccess: "பதிவு வெற்றிகரமாக முடிந்தது",
    registrationError: "பதிவு செய்யும்போது சேவையகப் பிழை ஏற்பட்டது",
    loginRequired: "மின்னஞ்சல் மற்றும் கடவுச்சொல் தேவை",
    invalidLogin: "மின்னஞ்சல் அல்லது கடவுச்சொல் தவறாக உள்ளது",
    loginSuccess: "உள்நுழைவு வெற்றிகரமாக முடிந்தது",
    loginError: "உள்நுழையும்போது சேவையகப் பிழை ஏற்பட்டது",
    forgotRequired: "மின்னஞ்சல் முகவரி தேவை",
    forgotSuccess:
      "இந்த மின்னஞ்சலுடன் கணக்கு இருந்தால், கடவுச்சொல் மாற்றும் இணைப்பு அனுப்பப்பட்டுள்ளது.",
    forgotError: "கடவுச்சொல் மாற்ற கோரிக்கையை செயல்படுத்த முடியவில்லை",
    resetInvalid: "இந்த கடவுச்சொல் மாற்றும் இணைப்பு தவறானது அல்லது காலாவதியாகிவிட்டது.",
    resetRequired: "புதிய கடவுச்சொல் தேவை",
    passwordTooShort: "கடவுச்சொல்லில் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்",
    resetSuccess: "கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது. புதிய கடவுச்சொல்லைப் பயன்படுத்தி உள்நுழையலாம்.",
    resetError: "கடவுச்சொல்லை மாற்ற முடியவில்லை",
  },
};

// Gmail SMTP transporter
// dotenv must be loaded by the server entry file before this route is imported.
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error(
    "SMTP configuration missing. Check SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env"
  );
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true").toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      profileImage,
      profileImageType,
      avatarId,
      language,
    } = req.body;

    const text = messages[getLanguage(language)];

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: text.registerRequired });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let normalizedRole = String(role).trim().toLowerCase();

    if (normalizedRole === "customer") normalizedRole = "consumer";

    const validRoles = ["farmer", "consumer", "retailer", "wholesaler"];

    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: text.invalidRole });
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: text.emailExists });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      profileImage: profileImage || "",
      profileImageType: profileImageType || "none",
      avatarId: avatarId ?? null,
    });

    return res.status(201).json({
      message: text.registrationSuccess,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role === "customer" ? "consumer" : user.role,
        profileImage: user.profileImage || "",
        profileImageType: user.profileImageType || "none",
        avatarId: user.avatarId ?? null,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: messages.en.registrationError });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, language } = req.body;
    const text = messages[getLanguage(language)];

    if (!email || !password) {
      return res.status(400).json({ message: text.loginRequired });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: text.invalidLogin });
    }

    const role = user.role === "customer" ? "consumer" : user.role;

    const token = jwt.sign(
      { userId: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: text.loginSuccess,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role,
        profileImage: user.profileImage || "",
        profileImageType: user.profileImageType || "none",
        avatarId: user.avatarId ?? null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: messages.en.loginError });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, language } = req.body;
    const text = messages[getLanguage(language)];

    if (!email || !email.trim()) {
      return res.status(400).json({ message: text.forgotRequired });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Avoid revealing whether an account exists.
    if (!user) {
      return res.status(200).json({ message: text.forgotSuccess });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Update only reset fields, avoiding validation of legacy customer roles.
    const updateResult = await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: hashedResetToken,
          resetPasswordExpires: resetTokenExpires,
        },
      },
      { runValidators: false }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error("User not found while creating reset token");
    }

    const frontendUrl = (
      process.env.CLIENT_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    const resetUrl =
      `${frontendUrl}/reset-password/${resetToken}` +
      `?language=${getLanguage(language)}`;

    const tamil = getLanguage(language) === "ta";
    const subject = tamil
      ? "FarmConnect - கடவுச்சொல் மாற்றம்"
      : "FarmConnect - Password Reset";
    const title = tamil ? "கடவுச்சொல்லை மாற்றவும்" : "Reset Your Password";
    const greeting = tamil ? `வணக்கம் ${user.name},` : `Hello ${user.name},`;
    const description = tamil
      ? "உங்கள் FarmConnect கணக்கிற்கான கடவுச்சொல் மாற்ற கோரிக்கை பெறப்பட்டுள்ளது."
      : "We received a request to reset the password for your FarmConnect account.";
    const button = tamil ? "கடவுச்சொல்லை மாற்றவும்" : "Reset Password";
    const expiry = tamil
      ? "இந்த இணைப்பு 15 நிமிடங்களில் காலாவதியாகும்."
      : "This link will expire in 15 minutes.";
    const ignore = tamil
      ? "இந்த கோரிக்கையை நீங்கள் செய்யவில்லை என்றால், இந்த மின்னஞ்சலை புறக்கணிக்கலாம்."
      : "If you did not request this, you can safely ignore this email.";

    await transporter.sendMail({
      from: `"FarmConnect" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject,
      text: `${greeting}\n\n${description}\n${resetUrl}\n\n${expiry}\n${ignore}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>${subject}</title></head>
        <body style="margin:0;padding:24px;background:#e8f3e5;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:20px auto;background:#173f2a;border-radius:16px;padding:32px;color:#fff8d6;">
            <div style="text-align:center;font-size:40px;">🌱</div>
            <h1 style="text-align:center;color:#f5c542;">FarmConnect</h1>
            <h2>${title}</h2>
            <p>${greeting}</p>
            <p style="line-height:1.6;">${description}</p>
            <p style="text-align:center;margin:30px 0;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 24px;background:#f5c542;color:#173f2a;text-decoration:none;border-radius:8px;font-weight:bold;">
                ${button}
              </a>
            </p>
            <p>${expiry}</p>
            <p>${ignore}</p>
            <hr style="border:0;border-top:1px solid #4d765d;margin:24px 0;">
            <p style="text-align:center;color:#c9dfcf;font-size:13px;">FarmConnect — Direct from farm</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Password reset email sent to ${user.email}`);
    return res.status(200).json({ message: text.forgotSuccess });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: messages.en.forgotError });
  }
});

// Reset password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password, language } = req.body;
    const text = messages[getLanguage(language)];

    if (!password) {
      return res.status(400).json({ message: text.resetRequired });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: text.passwordTooShort });
    }

    const rawToken = req.params.token;
    if (!rawToken) {
      return res.status(400).json({ message: text.resetInvalid });
    }

    const hashedResetToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedResetToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: text.resetInvalid });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updateResult = await User.updateOne(
      {
        _id: user._id,
        resetPasswordToken: hashedResetToken,
        resetPasswordExpires: { $gt: new Date() },
      },
      {
        $set: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      },
      { runValidators: false }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({ message: text.resetInvalid });
    }

    console.log("Password reset successful for:", user.email);
    return res.status(200).json({ message: text.resetSuccess });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: messages.en.resetError });
  }
});

module.exports = router;