// routes/redirectRoutes.js
const express = require('express');
const router = express.Router();
const UrlTrackingService = require('../services/UrlTrackingService');

router.get('/:trackingId', async(req, res) => {
    console.log(req.url)
    console.log('Received redirect request:', {
        trackingId: req.params.trackingId,
        campaignId: req.query.campaign_id,
    });
    try {
        const { trackingId } = req.params;
        const campaignId = req.query.campaign_id;

        if (!campaignId) {
            return res.status(400).send('Campaign ID is required');
        }

        await UrlTrackingService.handleRedirect(
            trackingId,
            campaignId,
            res
        );
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;