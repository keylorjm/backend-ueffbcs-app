const { request, response } = require("express");
const Materia = require("../models/materia");

// -------------------------------------------------------------
// 1. OBTENER TODAS LAS MATERIAS (GET con POPULATE)
// -------------------------------------------------------------
const obtenerMaterias = async (req = request, res = response) => {
    const limite = Number(req.query.limite) || 10;
    const desde = Number(req.query.desde) || 0;

    try {
        const [total, materias] = await Promise.all([
            // Contar solo las materias con estado: true
            Materia.countDocuments({ estado: true }),
            
            Materia.find({ estado: true })
                // 🛑 CRÍTICO: Trae el objeto del profesor y solo el campo 'nombre'
                .populate('profesor', 'nombre') 
                .skip(desde)
                .limit(limite),
        ]);

        res.json({
            ok: true,
            total,
            materias,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: "Error al obtener las materias.",
        });
    }
};

// -------------------------------------------------------------
// 2. CREAR MATERIA (POST)
// -------------------------------------------------------------
const crearMateria = async (req = request, res = response) => {
    // Campos requeridos: nombre, descripcion, y el UID del profesor (que viene del frontend)
    const { nombre, descripcion, profesor } = req.body; 

    try {
        let materia = await Materia.findOne({ nombre });

        if (materia) {
            return res.status(400).json({
                ok: false,
                msg: `La materia ${nombre} ya existe.`,
            });
        }

        // Crear y guardar en DB
        materia = new Materia({ nombre, descripcion, profesor });
        await materia.save();
        
        // Opcional: Popular la materia antes de responder para que el frontend reciba el nombre del profesor
        await materia.populate('profesor', 'nombre'); 

        res.status(201).json({
            ok: true,
            materia,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: "Error al crear la materia. Revise que el ID de profesor sea válido.",
        });
    }
};

// -------------------------------------------------------------
// 3. ACTUALIZAR MATERIA (PUT)
// -------------------------------------------------------------
const actualizarMateria = async (req = request, res = response) => {
    const { id } = req.params;
    // Evitar que se actualicen campos internos como _id o estado
    const { _id, estado, ...resto } = req.body; 

    try {
        const materia = await Materia.findByIdAndUpdate(id, resto, {
            new: true, // Devuelve el nuevo documento actualizado
        });

        if (!materia) {
            return res.status(404).json({
                ok: false,
                msg: "Materia no encontrada para actualizar.",
            });
        }
        
        // Asegurar que la respuesta devuelva el profesor populado
        await materia.populate('profesor', 'nombre');

        res.json({
            ok: true,
            materia,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: "Error al actualizar la materia.",
        });
    }
};

// -------------------------------------------------------------
// 4. ELIMINAR MATERIA (DELETE - lógico)
// -------------------------------------------------------------
const eliminarMateria = async (req = request, res = response) => {
    const { id } = req.params;

    try {
        // Eliminación lógica: cambia estado a false
        const materiaEliminada = await Materia.findByIdAndUpdate(
            id,
            { estado: false },
            { new: true }
        );

        if (!materiaEliminada) {
            return res.status(404).json({
                ok: false,
                msg: "Materia no encontrada para eliminar.",
            });
        }

        res.json({
            ok: true,
            msg: "Materia eliminada lógicamente.",
            materia: materiaEliminada,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: "Error al eliminar la materia.",
        });
    }
};

module.exports = {
    obtenerMaterias,
    crearMateria,
    actualizarMateria,
    eliminarMateria,
};