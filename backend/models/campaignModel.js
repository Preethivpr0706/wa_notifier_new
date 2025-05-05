// models/campaignModel.js
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
        const queryParams = [userId];
        let filterQuery = '';

        if (filters.status) {
            filterQuery = ' AND status = ?';
            queryParams.push(filters.status);
        }

        if (filters.templateId) {
            filterQuery += ' AND template_id = ?';
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

            const {
                recipientCount,
                deliveredCount,
                readCount
            } = stats;

            // Update stats
            await connection.execute(
                `UPDATE campaigns SET
          recipient_count = COALESCE(?, recipient_count),
          delivered_count = COALESCE(?, delivered_count),
          read_count = COALESCE(?, read_count),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`, [recipientCount, deliveredCount, readCount, campaignId]
            );

            // Update status based on delivery
            if (deliveredCount !== undefined) {
                const [campaign] = await connection.execute(
                    'SELECT recipient_count FROM campaigns WHERE id = ?', [campaignId]
                );

                if (campaign.length > 0) {
                    const { recipient_count } = campaign[0];
                    let newStatus = 'sending';

                    if (deliveredCount >= recipient_count) {
                        newStatus = 'completed';
                    } else if (deliveredCount > 0) {
                        newStatus = 'partial';
                    }

                    await connection.execute(
                        'UPDATE campaigns SET status = ? WHERE id = ?', [newStatus, campaignId]
                    );
                }
            }

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
}

module.exports = Campaign;