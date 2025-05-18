// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');

const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/send-bulk', MessageController.sendBulkMessages);
//router.post('/send-test', authenticate, MessageController.sendTestMessage);
router.get('/webhook', MessageController.verifyWebhook);
router.post('/webhook', MessageController.handleWebhook);

// routes/messageRoutes.js

router.post('/save-draft', MessageController.saveDraft);
router.post('/send-draft/:id', MessageController.sendDraft);


module.exports = router;