const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');


// Campaign routes
router.post('/', CampaignController.createCampaign);
router.get('/', CampaignController.getCampaigns);
router.get('/:id', CampaignController.getCampaignById);
router.put('/:id/status', CampaignController.updateCampaignStatus);
router.put('/:id/stats', CampaignController.updateCampaignStats);
router.delete('/:id', CampaignController.deleteCampaign);
router.put('/:id', CampaignController.updateCampaign);
// Add this route
router.get('/:id/stats', CampaignController.getCampaignWithStats);
router.get('/:id/recipients', CampaignController.getCampaignRecipients);

module.exports = router;