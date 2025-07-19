const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const conversationService = require('./conversationService');
const WhatsAppService = require('../services/WhatsAppService');

class FileService {
    static async uploadFile(userId, businessId, file) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            console.log("file:", file)

            // Generate unique filename
            const fileExt = path.extname(file.originalname);
            const storageFilename = `${uuidv4()}${fileExt}`;
            console.log(fileExt)
                // Create upload directory if it doesn't exist
            const uploadDir = path.join(__dirname, '../public/uploads', businessId);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Save file to disk
            const filePath = path.join(uploadDir, storageFilename);
            await fs.promises.writeFile(filePath, file.buffer);

            // Generate file URL
            const fileUrl = `/uploads/${businessId}/${storageFilename}`;

            // Insert file record
            const fileId = uuidv4();
            await connection.query(
                `INSERT INTO business_files 
        (id, business_id, uploaded_by, original_filename, storage_filename, file_type, file_size, file_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    fileId,
                    businessId,
                    userId,
                    file.originalname,
                    storageFilename,
                    file.mimetype,
                    file.size,
                    fileUrl
                ]
            );

            await connection.commit();

            return {
                id: fileId,
                fileUrl,
                originalFilename: file.originalname,
                fileType: file.mimetype
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getFileById(fileId, businessId) {
        try {
            const [files] = await pool.query(
                `SELECT * FROM business_files 
        WHERE id = ? AND business_id = ?`, [fileId, businessId]
            );

            if (!files.length) {
                throw new Error('File not found');
            }

            const file = files[0];
            const filePath = path.join(__dirname, '../public/uploads', businessId, file.storage_filename);

            return {
                filePath,
                file
            };
        } catch (error) {
            throw error;
        }
    }

    // In your FileService.js, modify the sendFileMessage method

    static async sendFileMessage(conversationId, fileId, caption = '', userId, wss) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get conversation details
            const [conversation] = await connection.query(
                `SELECT c.* FROM conversations c
      JOIN users u ON c.business_id = u.business_id
      WHERE c.id = ? AND u.id = ?`, [conversationId, userId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            const { business_id, phone_number } = conversation[0];

            // Get file details
            const [files] = await connection.query(
                `SELECT * FROM business_files 
      WHERE id = ? AND business_id = ?`, [fileId, business_id]
            );

            if (!files.length) {
                throw new Error('File not found');
            }

            const file = files[0];
            const filePath = path.join(__dirname, '../public/uploads', business_id, file.storage_filename);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error('File not found on server');
            }

            let whatsappMediaId = null;

            try {
                // If this file was already uploaded to WhatsApp, use that ID
                if (file.whatsapp_media_id) {
                    whatsappMediaId = file.whatsapp_media_id;
                } else {
                    // Read file buffer and upload to WhatsApp
                    const fileBuffer = await fs.promises.readFile(filePath);
                    whatsappMediaId = await WhatsAppService.uploadMediaToWhatsApp(
                        userId,
                        fileBuffer,
                        file.file_type,
                        file.original_filename
                    );

                    // Update the file record with WhatsApp media ID
                    await connection.query(
                        `UPDATE business_files SET whatsapp_media_id = ? WHERE id = ?`, [whatsappMediaId, fileId]
                    );
                }
            } catch (uploadError) {
                console.error('WhatsApp upload error:', uploadError.message);
                throw uploadError;
            }

            // Determine message type based on file type
            let messageType = 'document';
            if (file.file_type.startsWith('image/')) {
                messageType = 'image';
            } else if (file.file_type.startsWith('video/')) {
                messageType = 'video';
            } else if (file.file_type.startsWith('audio/')) {
                messageType = 'audio';
            }

            // Create message record
            // Create message record
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages 
            (id, conversation_id, direction, message_type, content, 
            media_url, media_filename, whatsapp_media_id, status, timestamp)
            VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, 'sending', NOW())`, [messageId, conversationId, messageType, caption || file.original_filename,
                    file.file_url, file.original_filename, whatsappMediaId
                ]
            );

            // Update conversation last message
            await connection.query(
                `UPDATE conversations 
            SET last_message_at = NOW() 
            WHERE id = ?`, [conversationId]
            );

            await connection.commit();

            try {
                const whatsappResponse = await conversationService.sendMessage({
                    to: phone_number,
                    businessId: business_id,
                    messageType: messageType,
                    content: caption || file.original_filename,
                    mediaId: whatsappMediaId,
                    filename: file.original_filename,
                    caption: caption
                });

                // Update message status
                await pool.query(
                    `UPDATE chat_messages 
                SET whatsapp_message_id = ?, status = 'sent' 
                WHERE id = ?`, [whatsappResponse.messageId, messageId]
                );

                // Get updated message
                const [message] = await pool.query(
                    `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
                );

                // Send SINGLE WebSocket notification
                if (wss && typeof wss.notifyNewMessage === 'function' && message[0]) {
                    wss.notifyNewMessage(business_id, conversationId, message[0]);
                }

                return message[0];
            } catch (whatsappError) {
                await pool.query(
                    `UPDATE chat_messages 
                SET status = 'failed' 
                WHERE id = ?`, [messageId]
                );
                throw whatsappError;
            }
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = FileService;