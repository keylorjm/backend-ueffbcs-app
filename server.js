// server.js
require('dotenv').config(); 
const express = require('express');
const dotenv = require('dotenv');
const conectarDB = require('./config/db');
const cors = require('cors'); 

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
conectarDB();

const app = express();

// --- CONFIGURACIÓN DE CORS ---
const corsOptions = {
    // ⬅️ 2. El origen de tu frontend Angular
    origin: 'http://localhost:4200', 
    // Métodos necesarios para peticiones de CRUD y preflight (OPTIONS)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    // Cabeceras que el frontend enviará (necesario para el token JWT)
    allowedHeaders: ['Content-Type', 'Authorization'], 
    // Permite que el navegador envíe cookies y headers de autorización
    credentials: true 
};

app.use(cors(corsOptions)); // ⬅️ 3. Usar el middleware CORS

// Middleware para parsear datos (Debe ir después del CORS)
app.use(express.json());

// Uso de Rutas de CRUD y Autenticación
app.use('/api/autenticacion', require('./routes/autenticacion'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/estudiantes', require('./routes/estudiantes'));
app.use('/api/cursos', require('./routes/cursos'));
app.use('/api/calificaciones', require('./routes/calificaciones'));
app.use('/api/asistencias', require('./routes/asistencias')); 
app.use('/api/materias', require('./routes/materia')); 
app.use('/api/aniolectivo', require('./routes/anios-lectivos'));
app.use("/api/profesor", require("./routes/profesor"));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/matriculas', require('./routes/matriculas'));
app.use("/api/promocion", require("./routes/promocion"));


const errorHandler = require('./middleware/error');
app.use(errorHandler);



app.get('/', (req, res) => res.send('API de Gestión de Calificaciones en funcionamiento!'));

const PUERTO = process.env.PUERTO || 5000;

app.listen(PUERTO, () => console.log(`Servidor ejecutándose en el puerto ${PUERTO} 🚀`));