const Campaign = require('../models/campaignModel');
const { pool } = require('../config/database');

function determineCampaignStatus({ recipientCount, deliveredCount, failedCount }) {
    const totalProcessed = (deliveredCount || 0) + (failedCount || 0);

    if (totalProcessed < recipientCount) return 'sending';
    if (failedCount === recipientCount) return 'failed';
    if (deliveredCount === recipientCount) return 'completed';
    return 'partial';
}
class CampaignController {
    // Create a new campaign
    static async createCampaign(req, res) {
        try {
            const { name, templateId, status, scheduledAt } = req.body;
            const userId = req.user.id; // From auth middleware

            // Validate required fields
            if (!name || !templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and template ID are required'
                });
            }

            const campaignData = {
                name,
                templateId,
                status: status || 'draft',
                scheduledAt: scheduledAt || null,
                userId
            };

            const campaign = await Campaign.create(campaignData);

            res.status(201).json({
                success: true,
                message: 'Campaign created successfully',
                data: campaign
            });
        } catch (error) {
            console.error('Error creating campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create campaign',
                error: error.message
            });
        }
    }

    // Get all campaigns for authenticated user
    // In getCampaigns method
    static async getCampaigns(req, res) {
        try {
            console.log('Fetching campaigns...'); // Add logging

            // Either use authenticated user or remove auth completely
            const userId = req.user.id;
            const { status, templateId } = req.query;
            const filters = {};

            if (status) filters.status = status;
            if (templateId) filters.templateId = templateId;

            console.log('Filters:', filters); // Log filters

            const campaigns = await Campaign.getAllByUser(userId, filters);

            console.log('Found campaigns:', campaigns.length); // Log results
            const formattedCampaigns = campaigns.map(campaign => ({
                ...campaign,
                failedCount: campaign.failedCount || 0 // Ensure failedCount is always present
            }));

            res.json({
                success: true,
                data: formattedCampaigns
            });
        } catch (error) {
            console.error('Error in getCampaigns:', error); // Detailed error logging
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaigns',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get single campaign by ID
    static async getCampaignById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const campaign = await Campaign.getById(id, userId);

            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            res.json({
                success: true,
                data: campaign
            });
        } catch (error) {
            console.error('Error fetching campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign',
                error: error.message
            });
        }
    }

    // Update campaign status
    static async updateCampaignStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user.id;

            // Verify campaign exists and belongs to user
            const campaign = await Campaign.getById(id, userId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            const validStatuses = ['draft', 'scheduled', 'sending', 'completed', 'failed', 'paused'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status value'
                });
            }
            const [updatedCampaign] = await connection.execute(
                'SELECT * FROM campaigns WHERE id = ?', [id]
            );

            if (updatedCampaign.length > 0) {
                const newStatus = determineCampaignStatus(updatedCampaign[0]);
                await connection.execute(
                    'UPDATE campaigns SET status = ? WHERE id = ?', [newStatus, id]
                );
            }

            res.json({
                success: true,
                message: 'Campaign status updated successfully'
            });
        } catch (error) {
            console.error('Error updating campaign status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign status',
                error: error.message
            });
        }
    }

    // Update campaign statistics
    static async updateCampaignStats(req, res) {
        try {
            const { id } = req.params;
            const { recipientCount, deliveredCount, readCount } = req.body;
            const userId = req.user.id;

            // Verify campaign exists and belongs to user
            const campaign = await Campaign.getById(id, userId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            const stats = {
                recipientCount,
                deliveredCount,
                readCount
            };

            const updated = await Campaign.updateStats(id, stats);

            if (!updated) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update campaign stats'
                });
            }

            res.json({
                success: true,
                message: 'Campaign stats updated successfully'
            });
        } catch (error) {
            console.error('Error updating campaign stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign stats',
                error: error.message
            });
        }
    }

    // Delete campaign
    static async deleteCampaign(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const deleted = await Campaign.delete(id, userId);

            if (!deleted) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to delete campaign'
                });
            }

            res.json({
                success: true,
                message: 'Campaign deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete campaign',
                error: error.message
            });
        }
    }
    static async updateCampaign(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            // Verify campaign exists and belongs to user
            const campaign = await Campaign.getById(id, userId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            if (campaign.status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: 'Only draft campaigns can be edited'
                });
            }

            // Update campaign
            await Campaign.update(id, updateData);

            res.json({
                success: true,
                message: 'Campaign updated successfully'
            });
        } catch (error) {
            console.error('Error updating campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign',
                error: error.message
            });
        }
    }
}

module.exports = CampaignController;