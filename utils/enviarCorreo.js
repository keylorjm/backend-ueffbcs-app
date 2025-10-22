// utils/enviarCorreo.js
const nodemailer = require('nodemailer');

const enviarCorreo = async (opciones) => {
    const transportador = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PUERTO,
        secure: process.env.EMAIL_PUERTO == 465,
        auth: {
            user: process.env.EMAIL_USUARIO,
            pass: process.env.EMAIL_CLAVE
        },
    });

    const mensaje = {
        from: `${process.env.EMAIL_USUARIO}`,
        to: opciones.correo,
        subject: opciones.asunto,
        text: opciones.mensaje,
        html: `<p>${opciones.mensaje.replace(/\n/g, '<br>')}</p>`
    };

    await transportador.sendMail(mensaje);
};

module.exports = enviarCorreo;