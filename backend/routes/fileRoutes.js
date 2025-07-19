const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FileService = require('../services/FileService');
const upload = require('../middleware/multer');

// Upload file endpoint
router.post('/upload', authenticate, upload.single('file'), async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const result = await FileService.uploadFile(
            req.user.id,
            req.user.businessId,
            req.file
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload file'
        });
    }
});

// Send file as message
router.post('/conversations/:id/send-file', authenticate, async(req, res) => {
    try {
        const { fileId, caption } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, message: 'File ID is required' });
        }

        const message = await FileService.sendFileMessage(
            req.params.id,
            fileId,
            caption,
            req.user.id,
            req.app.get('wss')
        );

        res.json({ success: true, data: message });
    } catch (error) {
        console.error('Error sending file message:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send file message'
        });
    }
});

// Get file info
router.get('/:id', authenticate, async(req, res) => {
    try {
        const { filePath, file } = await FileService.getFileById(
            req.params.id,
            req.user.business_id
        );

        res.json({ success: true, data: file });
    } catch (error) {
        console.error('Error getting file:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get file'
        });
    }
});

module.exports = router;