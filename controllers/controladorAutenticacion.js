const Usuario = require("../models/Usuario");
const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// --- UTILIDADES ---

// Función para enviar la respuesta con el token JWT
const sendTokenResponse = (usuario, statusCode, res) => {
  const token = usuario.getSignedJwtToken();

  // 🛑 SE ELIMINÓ EL MANEJO DE COOKIES (options y res.cookie)
  // Dejamos solo la respuesta JSON, que es lo que el frontend lee.
  res.status(statusCode).json({
    success: true,
    token, // 👈 ESTE CAMPO ES VITAL. Angular lo lee y lo guarda en localStorage.
    datos: {
      id: usuario._id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
  });
};

// Función para enviar correo (Asegúrate de configurar .env con tus credenciales)
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(message);
};

// --- ENDPOINTS ---

// @desc    Registrar usuario
// @route   POST /api/autenticacion/registrar
exports.registrarUsuario = async (req, res, next) => {
  const { nombre, correo, clave, rol } = req.body;

  try {
    const usuario = await Usuario.create({
      nombre,
      correo,
      clave,
      rol: rol || "estudiante",
    });

    sendTokenResponse(usuario, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Iniciar Sesión
// @route   POST /api/autenticacion/iniciarSesion
exports.iniciarSesion = async (req, res, next) => {
  const { correo, clave } = req.body;

  if (!correo || !clave) {
    return next(
      new ErrorResponse(
        "Por favor, proporciona un correo y una contraseña",
        400
      )
    );
  }

  try {
    const usuario = await Usuario.findOne({ correo }).select("+clave");

    if (!usuario) {
      return next(new ErrorResponse("Credenciales inválidas", 401));
    }

    const isMatch = await usuario.getPasswordMatch(clave);

    if (!isMatch) {
      return next(new ErrorResponse("Credenciales inválidas", 401));
    }

    sendTokenResponse(usuario, 200, res);
  } catch (err) {
    next(err);
  }
};


exports.recuperarContrasena = async (req, res, next) => {
  const { correo } = req.body;

  try {
    // Temporalmente, añade esto:
    const usuario = await Usuario.findOne({ correo });

    if (!usuario) {
      console.log("DIAGNÓSTICO: Usuario NO encontrado.");
      return res
        .status(200)
        .json({
          success: true,
          data: "Instrucciones enviadas al correo si existe.",
        });
    }    

    const resetToken = usuario.getResetPasswordToken();
    await usuario.save({ validateBeforeSave: false });

    
    const resetUrl = `http://localhost:4200/restablecer-contrasena/${resetToken}`; 

    const message = `
            <h1>Solicitud de Restablecimiento de Contraseña</h1>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <a href="${resetUrl}" target="_blank">${resetUrl}</a>
            <p>Este enlace expirará en 10 minutos. Si no solicitaste este cambio, ignora este correo.</p>
        `;

    await sendEmail({
      email: usuario.correo,
      subject: "Restablecimiento de Contraseña (Sistema de Calificaciones)",
      message,
    });

    
    res.status(200).json({
      success: true,
      data: "Instrucciones enviadas al correo.",      
    });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    // Limpiar token si el envío falla
    usuario.resetPasswordToken = undefined;
    usuario.resetPasswordExpire = undefined;
    await usuario.save({ validateBeforeSave: false });

    return next(
      new ErrorResponse(
        "Error al intentar enviar el correo. Verifica las credenciales en .env",
        500
      )
    );
  }
};

exports.restablecerContrasena = async (req, res, next) => {

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  try {
    const usuario = await Usuario.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // Token no expirado y válido
    });

    if (!usuario) {
      return next(new ErrorResponse("Token inválido o expirado.", 400));
    }

    
    usuario.clave = req.body.clave; 
    usuario.resetPasswordToken = undefined;
    usuario.resetPasswordExpire = undefined;

    await usuario.save();

    sendTokenResponse(usuario, 200, res); 
  } catch (err) {
    next(err);
  }
};
