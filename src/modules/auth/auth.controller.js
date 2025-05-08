const User = require("../user/user.model");
const Token = require("../tokens/token.model");
const sendEmail = require("../../utils/sendEmail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generar token único
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Guardar en DB
    await new Token({
      userId: newUser._id,
      token: verificationToken,
    }).save();

    // Crear link de verificación
    const verifyURL = `http://localhost:4000/api/auth/verify/${newUser._id}/${verificationToken}`;

    // Enviar email
    await sendEmail(
      newUser.email,
      "Verifica tu cuenta",
      `<h3>Hola ${newUser.name},</h3>
      <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
      <a href="${verifyURL}">Verificar cuenta</a>`
    );

    res
      .status(201)
      .json({ message: "User registered. Please verify your email." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Verificar si el email está confirmado
    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { userId, token } = req.params;

    const foundToken = await Token.findOne({ userId, token });
    if (!foundToken)
      return res.status(400).json({ message: "Invalid or expired token" });

    await User.findByIdAndUpdate(userId, { isVerified: true });
    await Token.findByIdAndDelete(foundToken._id);

    res.send(
      "<h2>Email verificado correctamente. Ya puedes iniciar sesión.</h2>"
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { register, login };
