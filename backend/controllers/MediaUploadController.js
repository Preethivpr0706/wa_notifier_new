// controllers/mediaUploadController.js
const WhatsAppService = require('../services/WhatsAppService');

const axios = require('axios'); // Add this import
class MediaUploadController {
    // Create a session for file upload
    static async createUploadSession(req, res) {
            try {
                const { fileType, fileName, fileSize } = req.body;

                console.log('Received request for upload session:', { fileType, fileName, fileSize });

                if (!fileType) {
                    return res.status(400).json({
                        success: false,
                        message: 'File type is required'
                    });
                }

                // Call WhatsApp API to create upload session
                const sessionData = await WhatsAppService.createMediaUploadSession(fileType, fileSize, req.user.id);
                console.log('Session data from WhatsApp:', sessionData);

                // Ensure we have the required data
                if (!sessionData || !sessionData.id) {
                    throw new Error('Invalid session data received from WhatsApp');
                }

                res.status(200).json({
                    success: true,
                    message: 'Upload session created',
                    data: {
                        id: sessionData.id,
                        uploadUrl: sessionData.upload_url || '', // Some APIs return this
                        fileType,
                        fileSize
                    }
                });
            } catch (error) {
                console.error('Error in createUploadSession:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create upload session',
                    error: error.message
                });
            }
        }
        // Upload file to the created session
        // controllers/MediaUploadController.js
    static async uploadFile(req, res) {
        try {
            const { sessionId } = req.params;
            const file = req.file;

            if (!file || !file.buffer) {
                return res.status(400).json({
                    success: false,
                    message: 'No file provided'
                });
            }

            // Add document MIME type validation
            const validMimeTypes = [
                'image/jpeg', 'image/png',
                'video/mp4',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ];

            if (!validMimeTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Unsupported file type'
                });
            }

            // Verify file size matches the declared size
            const declaredSize = parseInt(req.body.fileSize) || file.size;
            if (file.size !== declaredSize) {
                return res.status(400).json({
                    success: false,
                    message: `File size mismatch (declared: ${declaredSize}, actual: ${file.size})`
                });
            }

            // Upload to WhatsApp
            const result = await WhatsAppService.uploadFileToSession(sessionId, {
                    buffer: file.buffer,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                },
                req.user.id);

            if (!result.success || !result.h) {
                throw new Error('Upload failed or no handle received');
            }

            return res.status(200).json({
                success: true,
                message: 'File uploaded successfully',
                data: {
                    h: result.h,
                    fileType: file.mimetype,
                    fileSize: file.size
                }
            });

        } catch (error) {
            console.error('Upload error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'File upload failed',
                error: error.response ? error.response.data : error.message
            });
        }
    }

}

module.exports = MediaUploadController;