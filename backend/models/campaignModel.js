// models/campaignModel.js
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function determineCampaignStatus({ recipientCount, deliveredCount, failedCount }) {
    // Convert to numbers in case they come as strings
    recipientCount = Number(recipientCount) || 0;
    deliveredCount = Number(deliveredCount) || 0;
    failedCount = Number(failedCount) || 0;

    const totalProcessed = deliveredCount + failedCount;

    if (recipientCount === 0) return 'draft'; // No recipients yet
    if (totalProcessed === 0) return 'scheduled'; // Created but not sent
    if (totalProcessed < recipientCount) return 'sending'; // In progress
    if (failedCount === recipientCount) return 'failed'; // All failed
    if (deliveredCount === recipientCount) return 'completed'; // All delivered
    if (failedCount > 0 && deliveredCount > 0) return 'partial'; // Some succeeded, some failed
    return 'sending'; // Default fallback
}
class Campaign {
    // Create a new campaign
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
                userId
            } = campaignData;

            // Insert campaign
            await connection.execute(
                `INSERT INTO campaigns (
          id, name, template_id, status, scheduled_at, user_id,
          recipient_count, delivered_count, read_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    campaignId, name, templateId, status, scheduledAt, userId,
                    0, 0, 0
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

                // Calculate new counts safely - replace undefined with current values or 0
                const newStats = {
                    recipientCount: stats.recipientCount !== undefined ? stats.recipientCount : current[0].recipient_count,
                    deliveredCount: stats.deliveredCount !== undefined ? stats.deliveredCount : current[0].delivered_count,
                    failedCount: stats.failedCount !== undefined ? stats.failedCount : current[0].failed_count,
                    readCount: stats.readCount !== undefined ? stats.readCount : current[0].read_count
                };

                // Ensure counts don't exceed recipients
                newStats.deliveredCount = Math.min(newStats.deliveredCount, newStats.recipientCount);
                newStats.failedCount = Math.min(newStats.failedCount, newStats.recipientCount);
                newStats.readCount = Math.min(newStats.readCount, newStats.deliveredCount);

                // Update campaign stats
                await connection.execute(
                    `UPDATE campaigns SET
                recipient_count = ?,
                delivered_count = ?,
                read_count = ?,
                failed_count = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`, [
                        newStats.recipientCount || 0,
                        newStats.deliveredCount || 0,
                        newStats.readCount || 0,
                        newStats.failedCount || 0,
                        campaignId
                    ]
                );

                // Update status based on new counts
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
                console.error('Error updating campaign stats:', error);
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
}

module.exports = Campaign;