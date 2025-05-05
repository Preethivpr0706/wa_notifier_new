// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/send-bulk', MessageController.sendBulkMessages);
//router.post('/send-test', authenticate, MessageController.sendTestMessage);

module.exports = router;