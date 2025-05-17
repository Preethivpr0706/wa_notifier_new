const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all campaign routes
//router.use(authenticate);

// Campaign routes
router.post('/', CampaignController.createCampaign);
router.get('/', CampaignController.getCampaigns);
router.get('/:id', CampaignController.getCampaignById);
router.put('/:id/status', CampaignController.updateCampaignStatus);
router.put('/:id/stats', CampaignController.updateCampaignStats);
router.delete('/:id', CampaignController.deleteCampaign);
router.put('/:id', CampaignController.updateCampaign);

module.exports = router;