const express = require("express");
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/verify/:userId/:token", verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:id/:token", resetPassword);

module.exports = router;
