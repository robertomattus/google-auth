const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const checkRole = require("../../middlewares/role.middleware");

// Ruta de prueba: solo accesible por usuarios autenticados
router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

// Ruta para admins solamente
router.get("/dashboard", authMiddleware, checkRole(["admin"]), (req, res) => {
  res.json({ message: `Bienvenido al panel de admin, ${req.user.email}` });
});

module.exports = router;
