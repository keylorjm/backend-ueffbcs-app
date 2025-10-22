const Usuario = require('../models/Usuario');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler'); 
const { request, response } = require('express');


exports.getPerfil = asyncHandler(async (req = request, res = response, next) => {
    
    const usuario = await Usuario.findById(req.usuario.id || req.user.id).select('-clave');

    if (!usuario) {
        
        return next(new ErrorResponse('Usuario logueado no encontrado', 404));
    }
    
  
    res.status(200).json({
        ok: true,
        usuario: usuario 
    });
});


exports.getUsuariosPorRolProfesor = asyncHandler(async (req = request, res = response, next) => {
    const query = { rol: 'profesor' }; 
    
    const profesores = await Usuario.find(query).select('nombre correo'); 

    res.status(200).json({
        ok: true, 
        total: profesores.length,
        usuarios: profesores 
    });
});

// -------------------------------------------------------------------
exports.getUsuarios = asyncHandler(async (req = request, res = response, next) => {
    const usuarios = await Usuario.find(); 
    
    res.status(200).json({
        ok: true,
        total: usuarios.length,
        usuarios: usuarios
    });
});


exports.getUsuario = asyncHandler(async (req, res, next) => {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
        return next(new ErrorResponse(`Usuario no encontrado con id ${req.params.id}`, 404));
    }
    
    res.status(200).json({
        ok: true,
        usuario: usuario
    });
});

exports.crearUsuario = asyncHandler(async (req, res, next) => {
    const usuario = await Usuario.create(req.body); 

    res.status(201).json({
        ok: true,
        usuario: usuario
    });
});

exports.actualizarUsuario = asyncHandler(async (req, res, next) => {
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!usuario) {
        return next(new ErrorResponse(`Usuario no encontrado con id ${req.params.id}`, 404));
    }
    
    res.status(200).json({
        ok: true,
        usuario: usuario
    });
});

exports.eliminarUsuario = asyncHandler(async (req, res, next) => {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);

    if (!usuario) {
        return next(new ErrorResponse(`Usuario no encontrado con id ${req.params.id}`, 404));
    }
    
    res.status(200).json({
        ok: true,
        msg: "Usuario eliminado correctamente"
    });
});