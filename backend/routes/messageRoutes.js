// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth'); // Import authenticate middleware
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Protected routes (require authentication)
router.post('/send-bulk', authenticate, MessageController.sendBulkMessages);
router.post('/save-draft', authenticate, MessageController.saveDraft);
router.post('/send-draft/:id', authenticate, MessageController.sendDraft);

// Public routes (WhatsApp webhook endpoints - no authentication required)
router.get('/webhook', MessageController.verifyWebhook);
router.post('/webhook', MessageController.handleWebhook);

module.exports = router;