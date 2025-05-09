const User = require("../user/user.model");
const Token = require("../tokens/token.model");
const sendEmail = require("../../utils/sendEmail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Configura el transporter de Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email before logging in",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // Token válido por 15 minutos
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${user._id}/${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password reset request",
      text: `Click the link to reset your password: ${resetUrl}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("[FORGOT PASSWORD] Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

const resetPassword = async (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  try {
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userId !== id) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Encriptar la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("[RESET PASSWORD] Error:", error);
    res.status(400).json({ message: "Invalid or expired token", error });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};
