const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const checkRole = require("../../middlewares/role.middleware");

// Profile route
router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

// Admin dashboard route
router.get("/dashboard", authMiddleware, checkRole(["admin"]), (req, res) => {
  res.json({ message: `Welcome to admin panel, ${req.user.email}` });
});

module.exports = router;
