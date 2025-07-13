const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class Business {

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
                 WHERE id = ?`, [imageUrl, business.business.id]
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
    static async getByUserId(userId) {
        try {
            // First get the business_id and user details from users table
            const [userRows] = await pool.execute(
                `SELECT u.*, b.* 
                 FROM users u 
                 LEFT JOIN businesses b ON u.business_id = b.id 
                 WHERE u.id = ?`, [userId]
            );

            if (!userRows.length) {
                return null;
            }

            // Format the response
            const user = userRows[0];
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    firstName: user.name.split(' ')[0] || '',
                    lastName: user.name.split(' ')[1] || '',
                    phone: user.phone
                },
                business: {
                    id: user.business_id,
                    name: user.name,
                    description: user.description,
                    profile_image_url: user.profile_image_url,
                    industry: user.industry,
                    size: user.size,
                    contact_email: user.contact_email,
                    contact_phone: user.contact_phone,
                    website: user.website,
                }
            };
        } catch (error) {
            console.error('Error in getByUserId:', error);
            throw error;
        }
    }

    // businessModel.js
    static async update(userId, updateData) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                console.log('Updating with data:', updateData); // Debug log

                const { user: userUpdate, business: businessUpdate } = updateData;

                // Update user details
                if (userUpdate) {
                    const fullName = `${userUpdate.firstName} ${userUpdate.lastName}`.trim();
                    console.log('Updating user:', { userId, fullName, email: userUpdate.email }); // Debug log

                    await connection.execute(
                        `UPDATE users 
                 SET name = ?, 
                     email = ?,
                     phone=?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [fullName, userUpdate.email, userUpdate.phone, userId]
                    );
                }

                // Update business details
                if (businessUpdate) {
                    // First get the business_id
                    const [userRow] = await connection.execute(
                        'SELECT business_id FROM users WHERE id = ?', [userId]
                    );
                    if (!userRow[0] || !userRow[0].business_id) {
                        throw new Error('No business associated with this user');
                    }


                    console.log('Updating business:', {
                        businessId: userRow[0].business_id,
                        data: businessUpdate
                    }); // Debug log

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
                            businessUpdate.name,
                            businessUpdate.description,
                            businessUpdate.industry,
                            businessUpdate.size,
                            businessUpdate.contact_email,
                            businessUpdate.contact_phone,
                            businessUpdate.website,
                            userRow[0].business_id
                        ]
                    );
                }

                await connection.commit();

                // Fetch and return updated data
                return await this.getByUserId(userId);
            } catch (error) {
                await connection.rollback();
                console.error('Error in update:', error); // Debug log
                throw error;
            } finally {
                connection.release();
            }
        }
        // businessModel.js
    static validateUpdateData(data) {
        const { user, business } = data;

        if (user && (!user.firstName || !user.email)) {
            throw new Error('First name and email are required for user update');
        }

        if (business && !business.name) {
            throw new Error('Business name is required for business update');
        }

        return true;
    }

}


module.exports = Business;