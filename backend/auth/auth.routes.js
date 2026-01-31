// UBICACIÓN: backend/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const { login } = require('./auth.controller');

// Definimos que cuando alguien llame a /login, se ejecute la función de arriba
router.post('/login', login);

module.exports = router;