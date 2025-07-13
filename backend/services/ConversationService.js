// services/ConversationService.js
const axios = require('axios');
require('dotenv').config();
const { pool } = require('../config/database');
const ConversationController = require('../controllers/conversationController')

class ConversationService {
    static async sendMessage({ to, businessId, messageType, content }) {
        try {
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

            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    body: content
                }
            };

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
                            await ConversationController.addIncomingMessage({
                                businessId,
                                phoneNumber: message.from,
                                whatsappMessageId: message.id,
                                messageType: message.type,
                                content: message.text ? message.text.body : '',
                                timestamp: message.timestamp
                            }, wss);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error processing incoming message:', error);
            throw error;
        }
    }

}



module.exports = ConversationService;