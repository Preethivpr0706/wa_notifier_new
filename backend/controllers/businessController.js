const Business = require('../models/businessModel');
const { uploadToLocal } = require('../services/fileUploadService');
const path = require('path');
const fs = require('fs');
class BusinessController {
    static async getBusinessDetails(req, res) {
            try {
                // For testing, let's hardcode a user ID
                const userId = req.user.id;

                const business = await Business.getByUserId(userId);

                if (!business) {
                    // If no business exists, create a default one
                    return res.status(200).json({
                        success: true,
                        data: {
                            name: 'Your Business',
                            profile_image_url: null
                        }
                    });
                }

                res.status(200).json({
                    success: true,
                    data: business
                });
            } catch (error) {
                console.error('Error in getBusinessDetails:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get business details',
                    error: error.message
                });
            }
        }
        // businessController.js
    static async updateBusinessDetails(req, res) {
        try {
            const userId = req.user.id;
            const { user, business } = req.body; // Change to match frontend data structure

            console.log('Updating business details:', { userId, user, business }); // Debug log

            const updatedBusiness = await Business.update(userId, {
                user,
                business
            });

            res.json({
                success: true,
                data: updatedBusiness,
                message: 'Business details updated successfully'
            });
        } catch (error) {
            console.error('Error updating business details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update business details',
                error: error.message
            });
        }
    }


    static async uploadProfileImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            console.log('Received file:', req.file.originalname);

            // Verify upload directory exists
            const uploadDir = path.join(__dirname, '../public/uploads/business-profile');
            const dirExists = fs.existsSync(uploadDir);
            console.log('Upload directory exists:', dirExists, 'at:', uploadDir);

            if (!dirExists) {
                throw new Error('Upload directory does not exist');
            }

            const filePath = await uploadToLocal(req.file.buffer, req.file.originalname);
            const absolutePath = path.join(__dirname, '../public', filePath);

            // Verify file was actually written
            const fileExists = fs.existsSync(absolutePath);
            console.log('File exists on disk:', fileExists, 'at:', absolutePath);

            if (!fileExists) {
                throw new Error('File was not saved to disk');
            }

            const absoluteUrl = `${req.protocol}://${req.get('host')}${filePath}`;
            console.log("userid", req.user.id)
                // Update database
            const updatedBusiness = await Business.updateProfileImage(req.user.id, absoluteUrl);

            return res.json({
                success: true,
                data: {
                    profileImageUrl: absoluteUrl,
                    fileSaved: true,
                    filePath: absolutePath
                }
            });

        } catch (error) {
            console.error('Upload failed:', {
                error: error.message,
                stack: error.stack
            });
            return res.status(500).json({
                success: false,
                message: 'Upload failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = BusinessController;