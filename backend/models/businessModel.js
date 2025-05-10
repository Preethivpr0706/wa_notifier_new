const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class Business {
    static async getByUserId(userId) {
        try {
            // First get the business_id from users table
            const [userRows] = await pool.execute(
                'SELECT business_id FROM users WHERE id = ?', [userId]
            );

            if (!userRows.length || !userRows[0].business_id) {
                return null;
            }

            const businessId = userRows[0].business_id;

            // Then get the business details
            const [businessRows] = await pool.execute(
                'SELECT * FROM businesses WHERE id = ?', [businessId]
            );

            return businessRows[0] || null;
        } catch (error) {
            console.error('Error in getByUserId:', error);
            throw error;
        }
    }

    static async updateProfileImage(userId, imageUrl) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // First get the current business and image URL
            const business = await this.getByUserId(userId);
            if (!business) {
                throw new Error('Business not found for this user');
            }

            // Update with new image URL
            await connection.execute(
                `UPDATE businesses 
                 SET profile_image_url = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [imageUrl, business.id]
            );

            // Delete old image file if it exists
            if (business.profile_image_url) {
                const oldImagePath = path.join(
                    __dirname,
                    '../../public',
                    business.profile_image_url
                );

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            await connection.commit();

            return this.getByUserId(userId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(userId, updateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // First get the business_id
            const business = await this.getByUserId(userId);
            if (!business) {
                throw new Error('Business not found for this user');
            }

            const {
                name,
                description,
                industry,
                size,
                contactEmail,
                contactPhone,
                website
            } = updateData;

            await connection.execute(
                `UPDATE businesses 
                 SET name = ?, 
                     description = ?,
                     industry = ?,
                     size = ?,
                     contact_email = ?,
                     contact_phone = ?,
                     website = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [
                    name,
                    description,
                    industry,
                    size,
                    contactEmail,
                    contactPhone,
                    website,
                    business.id
                ]
            );

            await connection.commit();
            return this.getByUserId(userId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}


module.exports = Business;