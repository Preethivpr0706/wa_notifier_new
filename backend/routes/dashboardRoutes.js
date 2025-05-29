// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, DashboardController.getStats);
router.get('/recent-campaigns', authenticate, DashboardController.getRecentCampaigns);
router.get('/top-templates', authenticate, DashboardController.getTopTemplates);
router.get('/message-stats', authenticate, DashboardController.getMessageStats);

module.exports = router;