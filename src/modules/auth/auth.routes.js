const express = require("express");
const router = express.Router();
const { register, login } = require("./auth.controller");
const { verifyEmail } = require("./auth.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/verify/:userId/:token", verifyEmail);

module.exports = router;
