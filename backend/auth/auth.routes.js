// UBICACIÓN: backend/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const { login, clientLogin, forgotPassword, resetPassword, changeClientPassword, clientForgotPassword } = require('./auth.controller');

// Definimos que cuando alguien llame a /login, se ejecute la función de arriba
router.post('/login', login);

// Rutas de recuperación de contraseña
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Opcional: Exponer login de clientes aquí también para consistencia
router.post('/client/login', clientLogin);
router.post('/client/change-password', changeClientPassword);
router.post('/client/forgot-password', clientForgotPassword);

module.exports = router;