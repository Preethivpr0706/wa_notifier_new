// services/SchedulerService.js

const Campaign = require('../models/campaignModel');
const MessageController = require('../controllers/messageController');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
// services/SchedulerService.js

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
                    // First update status to sending to prevent duplicate processing
                    await connection.execute(
                        `UPDATE campaigns
                        SET status = 'sending',
                        sent_at = NOW()
                        WHERE id = ?`, [campaign.id]
                    );

                    // Parse stored JSON data - handle both string and object cases
                    let contacts;
                    let fieldMappings;

                    try {
                        contacts = typeof campaign.contacts === 'string' ?
                            JSON.parse(campaign.contacts) :
                            campaign.contacts;

                        fieldMappings = typeof campaign.field_mappings === 'string' ?
                            JSON.parse(campaign.field_mappings) :
                            campaign.field_mappings;
                    } catch (parseError) {
                        console.error('Error parsing JSON:', parseError);
                        throw new Error('Invalid campaign data format');
                    }

                    const userId = campaign.user_id;

                    // FIX: Use businessId consistently (matching the database column name)
                    const businessId = campaign.business_id;

                    // Process messages with proper error handling
                    await MessageController.processCampaignMessages(
                        campaign.id,
                        contacts,
                        fieldMappings,
                        campaign.template_id,
                        userId,
                        businessId // ← Fixed parameter name
                    );

                    // Update campaign status to completed after successful processing
                    await connection.execute(
                        `UPDATE campaigns 
                        SET status = 'completed'
                        WHERE id = ?`, [campaign.id]
                    );

                } catch (error) {
                    console.error(`Error processing campaign ${campaign.id}:`, error);

                    // Update campaign status to failed with error details
                    await connection.execute(
                        `UPDATE campaigns
                        SET status = 'failed',
                        error_message = ?
                        WHERE id = ?`, [error.message, campaign.id]
                    );
                }
            }
        } catch (error) {
            console.error('Error in processScheduledCampaigns:', error);
        } finally {
            connection.release();
        }
    }
}


module.exports = SchedulerService;