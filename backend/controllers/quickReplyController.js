const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class QuickReplyController {
    static async getQuickReplies(businessId, userId) {
        const connection = await pool.getConnection();
        try {
            // Verify user has access to business
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, businessId]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            const [quickReplies] = await connection.execute(
                `SELECT id, business_id, shortcode, message, created_at, updated_at
                FROM quick_replies 
                WHERE business_id = ? 
                ORDER BY shortcode ASC`, [businessId]
            );

            return quickReplies;
        } finally {
            connection.release();
        }
    }

    static async createQuickReply({ businessId, shortcode, message, userId }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Verify user has access to business
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, businessId]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            // Check if shortcode already exists for this business
            const [existingReplies] = await connection.execute(
                `SELECT * FROM quick_replies 
                WHERE business_id = ? AND LOWER(shortcode) = LOWER(?)`, [businessId, shortcode]
            );

            if (existingReplies.length > 0) {
                throw new Error('A quick reply with this shortcode already exists');
            }

            const quickReplyId = uuidv4();
            await connection.execute(
                `INSERT INTO quick_replies 
                (id, business_id, shortcode, message, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW())`, [quickReplyId, businessId, shortcode.toLowerCase().trim(), message.trim()]
            );

            // Get the created quick reply
            const [createdReply] = await connection.execute(
                `SELECT id, business_id, shortcode, message, created_at, updated_at
                FROM quick_replies 
                WHERE id = ?`, [quickReplyId]
            );

            await connection.commit();
            return createdReply[0];
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async updateQuickReply(id, { shortcode, message }, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if quick reply exists
            const [existingReply] = await connection.execute(
                `SELECT * FROM quick_replies WHERE id = ?`, [id]
            );

            if (!existingReply.length) {
                throw new Error('Quick reply not found');
            }

            const reply = existingReply[0];

            // Verify user has access to this business
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, reply.business_id]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            // Check if shortcode already exists for this business (excluding current reply)
            const [duplicateShortcode] = await connection.execute(
                `SELECT * FROM quick_replies 
                WHERE business_id = ? AND LOWER(shortcode) = LOWER(?) AND id != ?`, [reply.business_id, shortcode, id]
            );

            if (duplicateShortcode.length > 0) {
                throw new Error('A quick reply with this shortcode already exists');
            }

            await connection.execute(
                `UPDATE quick_replies 
                SET shortcode = ?, message = ?, updated_at = NOW()
                WHERE id = ?`, [shortcode.toLowerCase().trim(), message.trim(), id]
            );

            // Get the updated quick reply
            const [updatedReply] = await connection.execute(
                `SELECT id, business_id, shortcode, message, created_at, updated_at
                FROM quick_replies 
                WHERE id = ?`, [id]
            );

            await connection.commit();
            return updatedReply[0];
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async deleteQuickReply(id, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if quick reply exists
            const [existingReply] = await connection.execute(
                `SELECT * FROM quick_replies WHERE id = ?`, [id]
            );

            if (!existingReply.length) {
                throw new Error('Quick reply not found');
            }

            const reply = existingReply[0];

            // Verify user has access to this business
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, reply.business_id]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            await connection.execute(
                `DELETE FROM quick_replies WHERE id = ?`, [id]
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

    static async searchQuickReplies(businessId, searchQuery, userId) {
        const connection = await pool.getConnection();
        try {
            // Verify user has access to business
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, businessId]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            const [allReplies] = await connection.execute(
                `SELECT id, business_id, shortcode, message, created_at, updated_at
                FROM quick_replies 
                WHERE business_id = ? 
                ORDER BY shortcode ASC`, [businessId]
            );

            if (!searchQuery) {
                return allReplies;
            }

            const searchQueryLower = searchQuery.toLowerCase();
            const filteredReplies = allReplies.filter(reply =>
                reply.shortcode.toLowerCase().includes(searchQueryLower) ||
                reply.message.toLowerCase().includes(searchQueryLower)
            );

            return filteredReplies;
        } finally {
            connection.release();
        }
    }

    static async getQuickReplyById(id) {
        const connection = await pool.getConnection();
        try {
            const [replies] = await connection.execute(
                `SELECT id, business_id, shortcode, message, created_at, updated_at
                FROM quick_replies 
                WHERE id = ?`, [id]
            );

            return replies[0] || null;
        } finally {
            connection.release();
        }
    }

    static async getQuickReplyByShortcode(businessId, shortcode) {
        const connection = await pool.getConnection();
        try {
            const [replies] = await connection.execute(
                `SELECT id, business_id, shortcode, message, created_at, updated_at
                FROM quick_replies 
                WHERE business_id = ? AND LOWER(shortcode) = LOWER(?)`, [businessId, shortcode]
            );

            return replies[0] || null;
        } finally {
            connection.release();
        }
    }
}

module.exports = QuickReplyController;