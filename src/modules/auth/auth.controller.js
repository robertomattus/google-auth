const User = require("../user/user.model");
const Token = require("../tokens/token.model");
const sendEmail = require("../../utils/sendEmail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Configura el transporter de Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // o tu servicio de correo preferido
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
    console.log("[LOGIN] Datos recibidos:", email, password);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("[LOGIN] Usuario no encontrado");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      console.log("[LOGIN] Usuario no verificado");
      return res.status(401).json({
        message: "Please verify your email before logging in",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[LOGIN] Contraseña incorrecta");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("[LOGIN] Token generado:", token);
    res.json({ token });
  } catch (error) {
    console.error("[LOGIN] Error en login:", error);
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

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Generar el token de verificación
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h", // Este token es válido por 1 hora
    });

    // Enviar el email de verificación (el mismo que en el registro)
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${user._id}/${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your email",
      text: `Click the link to verify your email: ${verificationUrl}`,
    };

    // Enviar correo con nodemailer (asumiendo que ya configuraste nodemailer)
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("[RESEND VERIFICATION] Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { register, login, verifyEmail, resendVerificationEmail };
