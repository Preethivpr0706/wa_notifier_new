const express = require('express');
const router = express.Router();
const QuickReplyController = require('../controllers/quickReplyController');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Get all quick replies for a business
router.get('/', [
        query('businessId').optional() // Made optional since we can use req.user.businessId
    ],
    handleValidationErrors,
    async(req, res) => {
        try {
            const businessId = req.query.businessId || req.user.businessId;
            const quickReplies = await QuickReplyController.getQuickReplies(
                businessId,
                req.user.id
            );
            res.json({ success: true, data: quickReplies });
        } catch (error) {
            console.error('Error in GET /quick-replies:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Create a new quick reply
router.post('/', [
        body('businessId').optional(), // Made optional since we can use req.user.businessId
        body('shortcode')
        .notEmpty().withMessage('Shortcode is required')
        .isLength({ min: 1, max: 50 }).withMessage('Shortcode must be 1-50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Shortcode can only contain letters, numbers, hyphens, and underscores'),
        body('message')
        .notEmpty().withMessage('Message is required')
        .isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
    ],
    handleValidationErrors,
    async(req, res) => {
        try {
            const businessId = req.body.businessId || req.user.businessId;
            const quickReply = await QuickReplyController.createQuickReply({
                businessId,
                shortcode: req.body.shortcode,
                message: req.body.message,
                userId: req.user.id
            });
            res.status(201).json({ success: true, data: quickReply });
        } catch (error) {
            console.error('Error in POST /quick-replies:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Update a quick reply
router.put('/:id', [
        param('id').isUUID().withMessage('Invalid quick reply ID'),
        body('shortcode')
        .notEmpty().withMessage('Shortcode is required')
        .isLength({ min: 1, max: 50 }).withMessage('Shortcode must be 1-50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Shortcode can only contain letters, numbers, hyphens, and underscores'),
        body('message')
        .notEmpty().withMessage('Message is required')
        .isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
    ],
    handleValidationErrors,
    async(req, res) => {
        try {
            const updatedReply = await QuickReplyController.updateQuickReply(
                req.params.id, {
                    shortcode: req.body.shortcode,
                    message: req.body.message
                },
                req.user.id
            );
            res.json({ success: true, data: updatedReply });
        } catch (error) {
            console.error('Error in PUT /quick-replies/:id:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Delete a quick reply
router.delete('/:id', [
        param('id').isUUID().withMessage('Invalid quick reply ID')
    ],
    handleValidationErrors,
    async(req, res) => {
        try {
            await QuickReplyController.deleteQuickReply(req.params.id, req.user.id);
            res.json({
                success: true,
                message: 'Quick reply deleted successfully'
            });
        } catch (error) {
            console.error('Error in DELETE /quick-replies/:id:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Search quick replies
router.get('/search', [
        query('businessId').optional(), // Made optional since we can use req.user.businessId
        query('q').optional().isLength({ min: 1, max: 100 }).withMessage('Query must be 1-100 characters')
    ],
    handleValidationErrors,
    async(req, res) => {
        try {
            const businessId = req.query.businessId || req.user.businessId;
            const searchResults = await QuickReplyController.searchQuickReplies(
                businessId,
                req.query.q || '',
                req.user.id
            );
            res.json({
                success: true,
                data: searchResults,
                message: `Found ${searchResults.length} quick replies`
            });
        } catch (error) {
            console.error('Error in GET /quick-replies/search:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

module.exports = router;