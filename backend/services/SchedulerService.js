// services/SchedulerService.js

const Campaign = require('../models/campaignModel');
const MessageController = require('../controllers/messageController');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
class SchedulerService {
    static async processScheduledCampaigns() {
        const connection = await pool.getConnection();
        try {
            // Get campaigns that should be sent now
            const [campaigns] = await connection.execute(
                `SELECT * FROM campaigns 
                 WHERE status = 'scheduled' 
                 AND scheduled_at <= NOW() 
                 AND scheduled_at IS NOT NULL`
            );

            for (const campaign of campaigns) {
                try {
                    // Parse stored JSON data
                    const contacts = JSON.parse(campaign.contacts);
                    const fieldMappings = JSON.parse(campaign.field_mappings);

                    // Update campaign status to sending
                    await connection.execute(
                        `UPDATE campaigns 
                         SET status = 'sending', 
                             sent_at = NOW() 
                         WHERE id = ?`, [campaign.id]
                    );

                    // Process messages
                    await MessageController.processCampaignMessages(
                        campaign.id,
                        contacts,
                        fieldMappings,
                        campaign.template_id
                    );
                } catch (error) {
                    console.error(`Error processing campaign ${campaign.id}:`, error);
                    // Update campaign status to failed
                    await connection.execute(
                        `UPDATE campaigns 
                         SET status = 'failed', 
                         WHERE id = ?`, [campaign.id]
                    );
                }
            }
        } finally {
            connection.release();
        }
    }
}

module.exports = SchedulerService;