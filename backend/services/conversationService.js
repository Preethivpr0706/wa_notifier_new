// services/ConversationService.js
const axios = require('axios');
require('dotenv').config();
const { pool } = require('../config/database');
const ConversationController = require('../controllers/conversationController')

class ConversationService {
    static async sendMessage({ to, businessId, messageType, content, mediaId, filename, caption }) {
        try {
            console.log('Sending message to:', to, 'Business ID:', businessId, 'Type:', messageType);
            // Get business settings
            const [settings] = await pool.query(
                `SELECT * FROM business_settings 
        WHERE business_id = ?`, [businessId]
            );

            if (!settings.length) {
                throw new Error('Business settings not found');
            }

            const config = {
                headers: {
                    'Authorization': `Bearer ${settings[0].whatsapp_api_token}`,
                    'Content-Type': 'application/json'
                }
            };

            let payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: messageType
            };

            // Handle different message types
            switch (messageType) {
                case 'text':
                    payload.text = {
                        body: content
                    };
                    break;

                case 'document':
                    payload.document = {
                        id: mediaId,
                        filename: filename
                    };
                    if (caption) {
                        payload.document.caption = caption;
                    }
                    break;

                case 'image':
                    payload.image = {
                        id: mediaId
                    };
                    if (caption) {
                        payload.image.caption = caption;
                    }
                    break;

                case 'video':
                    payload.video = {
                        id: mediaId
                    };
                    if (caption) {
                        payload.video.caption = caption;
                    }
                    break;

                case 'audio':
                    payload.audio = {
                        id: mediaId
                    };
                    break;

                default:
                    throw new Error(`Unsupported message type: ${messageType}`);
            }

            const response = await axios.post(
                `https://graph.facebook.com/v17.0/${settings[0].whatsapp_phone_number_id}/messages`,
                payload,
                config
            );

            return {
                success: true,
                messageId: response.data.messages[0].id
            };
        } catch (error) {
            console.error('WhatsApp API error:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    static async processIncomingMessage(entry, wss) {
        try {
            for (const item of entry) {
                let phoneNumberId;

                if (
                    item &&
                    item.changes &&
                    item.changes[0] &&
                    item.changes[0].value &&
                    item.changes[0].value.metadata &&
                    item.changes[0].value.metadata.phone_number_id
                ) {
                    phoneNumberId = item.changes[0].value.metadata.phone_number_id;
                }

                if (!phoneNumberId) continue;

                // Get business settings
                const [settings] = await pool.query(
                    'SELECT business_id FROM business_settings WHERE whatsapp_phone_number_id = ?', [phoneNumberId]
                );

                if (!settings.length) continue;
                const businessId = settings[0].business_id;

                for (const change of item.changes) {
                    if (change.value.messages) {
                        for (const message of change.value.messages) {
                            let content = '';

                            // Handle different message types for incoming messages
                            switch (message.type) {
                                case 'text':
                                    content = message.text.body;
                                    break;
                                case 'document':
                                    content = message.document.filename || 'Document';
                                    break;
                                case 'image':
                                    content = message.image.caption || 'Image';
                                    break;
                                case 'video':
                                    content = message.video.caption || 'Video';
                                    break;
                                case 'audio':
                                    content = 'Audio message';
                                    break;
                                default:
                                    content = `${message.type} message`;
                            }

                            await ConversationController.addIncomingMessage({
                                businessId,
                                phoneNumber: message.from,
                                whatsappMessageId: message.id,
                                messageType: message.type,
                                content: content,
                                timestamp: message.timestamp
                            }, wss);
                        }
                    }
                }
            }
        } catch (error) {
            //error
            console.error('Error processing incoming message:', error);
            throw error;
        }
    }

}

module.exports = ConversationService;