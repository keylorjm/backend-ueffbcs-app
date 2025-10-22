// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const conectarDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB conectado: ${conn.connection.host} 💾`);
    } catch (err) {
        console.error(`Error de conexión a la base de datos: ${err.message} ❌`);
        process.exit(1);
    }
};

module.exports = conectarDB;