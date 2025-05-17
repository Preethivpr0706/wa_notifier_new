// models/campaignModel.js
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function determineCampaignStatus({ recipientCount, deliveredCount, failedCount }) {
    recipientCount = Number(recipientCount) || 0;
    deliveredCount = Number(deliveredCount) || 0;
    failedCount = Number(failedCount) || 0;

    const totalProcessed = deliveredCount + failedCount;

    if (recipientCount === 0) return 'draft';
    if (totalProcessed === 0) return 'scheduled';
    if (totalProcessed < recipientCount) return 'sending';
    if (failedCount === recipientCount) return 'failed';
    if (deliveredCount === recipientCount) return 'completed';
    if (failedCount > 0 && deliveredCount > 0) return 'partial';
    return 'sending';
}
class Campaign {
    // Create a new campaign
    // models/campaignModel.js

    // Add these fields to your campaigns table:
    // ALTER TABLE campaigns ADD COLUMN contacts JSON;
    // ALTER TABLE campaigns ADD COLUMN field_mappings JSON;

    static async create(campaignData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const campaignId = uuidv4();
            const {
                name,
                templateId,
                status = 'draft',
                scheduledAt = null,
                userId,
                contacts, // Add these
                fieldMappings, // Add these
                recipientCount = 0
            } = campaignData;

            // Format scheduledAt datetime
            let formattedScheduledAt = null;
            if (scheduledAt) {
                formattedScheduledAt = new Date(scheduledAt)
                    .toISOString()
                    .slice(0, 19)
                    .replace('T', ' ');
            }

            // Insert campaign with contacts and mappings
            await connection.execute(
                `INSERT INTO campaigns (
                id, name, template_id, status, scheduled_at, user_id,
                recipient_count, delivered_count, read_count,
                contacts, field_mappings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    campaignId,
                    name,
                    templateId,
                    status,
                    formattedScheduledAt,
                    userId,
                    recipientCount,
                    0,
                    0,
                    JSON.stringify(contacts),
                    JSON.stringify(fieldMappings)
                ]
            );

            await connection.commit();
            return { id: campaignId, ...campaignData };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }


    // Get all campaigns for a user
    static async getAllByUser(userId, filters = {}) {
        console.log(`Getting campaigns for user ${userId} with filters:`, filters);

        const queryParams = [userId];
        let filterQuery = '';

        if (filters.status) {
            filterQuery = ' AND c.status = ?'; // Changed to c.status
            queryParams.push(filters.status);
        }

        if (filters.templateId) {
            filterQuery += ' AND c.template_id = ?'; // Changed to c.template_id
            queryParams.push(filters.templateId);
        }

        const [campaigns] = await pool.execute(
            `SELECT 
            c.id, c.name, c.status, c.scheduled_at as scheduledAt,
            c.recipient_count as recipientCount,
            c.delivered_count as deliveredCount,
             c.failed_count as failedCount, 
            c.read_count as readCount,
            t.name as templateName, t.category as templateCategory
        FROM campaigns c
        LEFT JOIN templates t ON c.template_id = t.id
        WHERE c.user_id = ?${filterQuery}
        ORDER BY c.created_at DESC`,
            queryParams
        );

        return campaigns;
    }

    // Get campaign by ID
    static async getById(campaignId, userId) {
            const [campaigns] = await pool.execute(
                `SELECT 
        c.*, 
        t.name as template_name, 
        t.body_text as template_body,
        t.header_type as template_header_type,
        t.header_content as template_header_content
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = ? AND c.user_id = ?`, [campaignId, userId]
            );

            if (campaigns.length === 0) {
                return null;
            }

            return campaigns[0];
        }
        // In campaignModel.js
    static async getByMessageId(messageId) {
            const [campaigns] = await pool.execute(
                `SELECT c.* FROM campaigns c
         JOIN messages m ON c.id = m.campaign_id
         WHERE m.id = ?`, [messageId]
            );
            return campaigns[0] || null;
        }
        // Update campaign status
    static async updateStatus(campaignId, status) {
        const [result] = await pool.execute(
            `UPDATE campaigns 
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [status, campaignId]
        );

        return result.affectedRows > 0;
    }

    // Update campaign statistics
    static async updateStats(campaignId, stats) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Get current counts first
                const [current] = await connection.execute(
                    'SELECT recipient_count, delivered_count, failed_count, read_count FROM campaigns WHERE id = ?', [campaignId]
                );

                if (current.length === 0) {
                    throw new Error('Campaign not found');
                }

                // Calculate new counts safely
                const newStats = {
                    recipientCount: stats.recipientCount !== undefined ? stats.recipientCount : current[0].recipient_count,
                    deliveredCount: stats.deliveredCount !== undefined ?
                        Math.min(stats.deliveredCount, current[0].recipient_count) : current[0].delivered_count,
                    failedCount: stats.failedCount !== undefined ?
                        Math.min(stats.failedCount, current[0].recipient_count) : current[0].failed_count,
                    readCount: stats.readCount !== undefined ?
                        Math.min(stats.readCount, current[0].delivered_count) : current[0].read_count
                };

                // Update campaign stats
                await connection.execute(
                    `UPDATE campaigns SET
       recipient_count = ?,
       delivered_count = ?,
       failed_count = ?,
       read_count = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [
                        newStats.recipientCount,
                        newStats.deliveredCount,
                        newStats.failedCount,
                        newStats.readCount,
                        campaignId
                    ]
                );

                // Determine new status based on counts
                const newStatus = determineCampaignStatus({
                    recipientCount: newStats.recipientCount,
                    deliveredCount: newStats.deliveredCount,
                    failedCount: newStats.failedCount
                });

                await connection.execute(
                    'UPDATE campaigns SET status = ? WHERE id = ?', [newStatus, campaignId]
                );

                await connection.commit();
                return true;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        // In campaignModel.js
    static async incrementStats(campaignId, increments) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Build update query dynamically
            let updateQuery = 'UPDATE campaigns SET ';
            const updateParts = [];
            const params = [];

            for (const [field, value] of Object.entries(increments)) {
                updateParts.push(`${field} = ${field} + ?`);
                params.push(value);
            }

            updateQuery += updateParts.join(', ');
            updateQuery += ' WHERE id = ?';
            params.push(campaignId);

            await connection.execute(updateQuery, params);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async recalculateStatus(campaignId) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(
                `SELECT recipient_count, delivered_count, failed_count, read_count 
             FROM campaigns WHERE id = ?`, [campaignId]
            );

            const { recipient_count, delivered_count, failed_count, read_count } = rows[0];

            const totalDone = delivered_count + failed_count;
            let status = 'sending';
            if (totalDone >= recipient_count) status = 'completed';

            await connection.execute(
                `UPDATE campaigns SET status = ? WHERE id = ?`, [status, campaignId]
            );
        } finally {
            connection.release();
        }
    }

    static async calculateStatsFromMessages(campaignId) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Get counts from messages table
                const [messageStats] = await connection.execute(
                    `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('delivered', 'read') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count
       FROM messages 
       WHERE campaign_id = ?`, [campaignId]
                );

                if (messageStats.length === 0) {
                    throw new Error('No messages found for campaign');
                }

                const stats = messageStats[0];

                // Update campaign with these counts
                await connection.execute(
                    `UPDATE campaigns SET
        delivered_count = ?,
        failed_count = ?,
        read_count = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [
                        stats.delivered || 0,
                        stats.failed || 0,
                        stats.read_count || 0,
                        campaignId
                    ]
                );

                // Determine new status based on counts
                const [campaign] = await connection.execute(
                    'SELECT recipient_count FROM campaigns WHERE id = ?', [campaignId]
                );

                const newStatus = determineCampaignStatus({
                    recipientCount: campaign[0].recipient_count,
                    deliveredCount: stats.delivered || 0,
                    failedCount: stats.failed || 0
                });

                await connection.execute(
                    'UPDATE campaigns SET status = ? WHERE id = ?', [newStatus, campaignId]
                );

                await connection.commit();
                return true;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        // Delete campaign
    static async delete(campaignId, userId) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Verify campaign exists and belongs to user
                const [campaigns] = await connection.execute(
                    'SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, userId]
                );

                if (campaigns.length === 0) {
                    throw new Error('Campaign not found or not authorized');
                }

                // Delete campaign
                const [result] = await connection.execute(
                    'DELETE FROM campaigns WHERE id = ?', [campaignId]
                );

                await connection.commit();
                return result.affectedRows > 0;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        // models/campaignModel.js

    // Add this method to handle scheduled campaigns
    static async getScheduledCampaigns() {
        const [campaigns] = await pool.execute(
            `SELECT * FROM campaigns 
     WHERE status = 'scheduled' 
     AND scheduled_at <= NOW() 
     AND scheduled_at IS NOT NULL`
        );
        return campaigns;
    }

    // Add method to start a scheduled campaign
    static async startScheduledCampaign(campaignId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update campaign status to sending
            await connection.execute(
                `UPDATE campaigns 
       SET status = 'sending', 
           sent_at = NOW() 
       WHERE id = ?`, [campaignId]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

}

module.exports = Campaign;