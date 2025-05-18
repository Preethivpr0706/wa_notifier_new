// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', AuthController.login);
router.post('/logout', authenticate, AuthController.logout); // Add this route

module.exports = router;