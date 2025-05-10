const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const express = require("express");
const cors = require("cors");
const passport = require("passport");

require("dotenv").config();
require("./config/passport");

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
  res.send("API running");
});

module.exports = app;
