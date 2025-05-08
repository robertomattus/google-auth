const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth.middleware");
const checkRole = require("../../middlewares/role.middleware");

// Ruta de prueba: solo accesible por usuarios autenticados
router.get("/profile", auth, (req, res) => {
  res.json({ message: "Welcome!", user: req.user });
});

// Ruta para admins solamente
router.get("/admin", auth, checkRole(["admin"]), (req, res) => {
  res.json({ message: "Hello Admin" });
});

module.exports = router;
