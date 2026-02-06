// UBICACIÓN: backend/auth/auth.routes.js
const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { login, clientLogin, forgotPassword, resetPassword, changeClientPassword, clientForgotPassword } = require('./auth.controller');
=======
const { login } = require('./auth.controller');
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a

// Definimos que cuando alguien llame a /login, se ejecute la función de arriba
router.post('/login', login);

<<<<<<< HEAD
// Rutas de recuperación de contraseña
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Opcional: Exponer login de clientes aquí también para consistencia
router.post('/client/login', clientLogin);
router.post('/client/change-password', changeClientPassword);
router.post('/client/forgot-password', clientForgotPassword);

=======
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
module.exports = router;