// server.js
require('dotenv').config(); 
const express = require('express');
const dotenv = require('dotenv');
const conectarDB = require('./config/db');
const cors = require('cors'); // ⬅️ 1. Importar el módulo CORS

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

// Importación de RUTAS
const authRoutes = require('./routes/autenticacion');
const usuarioRoutes = require('./routes/usuarios');
const estudianteRoutes = require('./routes/estudiantes');
const cursoRoutes = require('./routes/cursos');
const calificacionRoutes = require('./routes/calificaciones');
const materiaRoutes = require('./routes/materia');
const aniosLectivosRoutes = require('./routes/anios-lectivos');

// Uso de Rutas de CRUD y Autenticación
app.use('/api/autenticacion', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/estudiantes', estudianteRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/calificaciones', calificacionRoutes); 
app.use('/api/materias', materiaRoutes); 
app.use('/api/anios-lectivos', aniosLectivosRoutes);


const errorHandler = require('./middleware/error');
app.use(errorHandler);



app.get('/', (req, res) => res.send('API de Gestión de Calificaciones en funcionamiento!'));

const PUERTO = process.env.PUERTO || 5000;

app.listen(PUERTO, () => console.log(`Servidor ejecutándose en el puerto ${PUERTO} 🚀`));