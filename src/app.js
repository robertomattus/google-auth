const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
// Aquí se montarán más adelante las rutas de auth, user, etc.
app.get("/", (req, res) => {
  res.send("API running");
});

module.exports = app;
