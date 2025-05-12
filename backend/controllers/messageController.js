// controllers/messageController.js
const WhatsAppService = require('../services/WhatsAppService');
const Campaign = require('../models/campaignModel');
const Contact = require('../controllers/contactController');
const Template = require('../models/templateModel');

const { pool } = require('../config/database'); // Add this at the top
class MessageController {
    // controllers/messageController.js

    // In MessageController class


    static async sendBulkMessages(req, res) {
            try {
                const {
                    templateId,
                    audience_type,
                    list_id,
                    is_custom,
                    contacts,
                    fieldMappings,
                    sendNow,
                    scheduledAt
                } = req.body;
                // Add userId at the beginning of the method
                const userId = 1; // Hardcoded for testing - should come from auth middleware in production

                // Validate required fields
                if (!templateId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Template ID is required'
                    });
                }

                // Normalize audience_type to lowercase
                const normalizedAudienceType = audience_type ? audience_type.toLowerCase() : null;

                // Validate audience type
                const validAudienceTypes = ['all', 'list', 'custom'];
                if (!validAudienceTypes.includes(normalizedAudienceType)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid audience type. Must be one of: ${validAudienceTypes.join(', ')}`
                    });
                }
                // Validate contacts
                if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one contact is required'
                    });
                }


                // Validate each contact has a WhatsApp number
                const invalidContacts = contacts.filter(c => !c.wanumber);
                if (invalidContacts.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `${invalidContacts.length} contacts missing WhatsApp numbers`
                    });
                }

                // Get template with components
                const template = await Template.getByIdForSending(templateId, userId);
                if (!template) {
                    return res.status(404).json({
                        success: false,
                        message: 'Template not found'
                    });
                }

                if (!template.whatsapp_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Template is not approved on WhatsApp'
                    });
                }

                // Get target contacts based on audience type
                let targetContacts = [];

                if (normalizedAudienceType === 'all') {
                    targetContacts = await Contact.getAllByUser(userId);
                } else if (normalizedAudienceType === 'list' || normalizedAudienceType === 'custom') {
                    // Use the provided contacts for both list and custom types
                    targetContacts = contacts;
                }


                if (!targetContacts || targetContacts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No contacts found to send messages to'
                    });
                }

                // Create campaign record
                // Create campaign record with initial counts
                const campaign = await Campaign.create({
                    name: `Bulk Send - ${new Date().toLocaleString()}`,
                    templateId,
                    status: 'sending', // Set to sending immediately
                    scheduledAt: scheduledAt || null,
                    userId,
                    recipientCount: targetContacts.length,
                    deliveredCount: 0,
                    failedCount: 0,
                    readCount: 0
                });

                const results = {
                    total: targetContacts.length,
                    success: 0,
                    failures: 0,
                    errors: []
                };
                // Process each contact
                for (const contact of targetContacts) {
                    try {
                        if (!contact || typeof contact !== 'object' || !contact.wanumber) {
                            throw new Error('Invalid contact format');
                        }

                        // Prepare message components
                        const message = {
                            to: contact.wanumber,
                            template: template.name,
                            language: { code: template.language },
                            bodyParameters: [] // Add your parameters here
                        };


                        // Handle header if exists
                        if (template.header_type && template.header_content) {
                            message.header = {
                                type: template.header_type,
                                content: template.header_content
                            };

                            // For media headers, we expect header_content to be the media ID
                            if (['image', 'video', 'document'].includes(template.header_type)) {
                                message.header.mediaId = template.header_content;
                            }
                        }

                        // Map body variables to contact fields
                        if (template.variables) {
                            const variableNames = Object.keys(template.variables);
                            for (const varName of variableNames) {
                                const fieldName = fieldMappings[varName];
                                if (fieldName && contact[fieldName]) {
                                    message.bodyParameters.push(contact[fieldName]);
                                } else {
                                    // Use default sample if no mapping
                                    message.bodyParameters.push(template.variables[varName]);
                                }
                            }
                        }

                        // To this:
                        // Send message and get immediate status
                        const sendResult = await WhatsAppService.sendTemplateMessage(message);

                        // Create message record with initial status
                        await MessageController.createMessageRecord({
                            messageId: sendResult.messageId,
                            campaignId: campaign.id,
                            contactId: contact.id,
                            status: sendResult.success ? 'sent' : 'failed',
                            error: sendResult.error,
                            timestamp: sendResult.timestamp
                        });

                        // Update counts based on immediate result
                        if (sendResult.success) {
                            results.success++;
                        } else {
                            results.failures++;
                            results.errors.push({
                                contactId: contact.id,
                                error: sendResult.error
                            });
                        }
                    } catch (error) {
                        // Create failed message record
                        await MessageController.createMessageRecord({
                            messageId: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            campaignId: campaign.id,
                            contactId: contact.id,
                            status: 'failed',
                            error: error.message
                        });

                    }
                }
                // Update campaign with initial counts
                const updatedStats = {
                    recipientCount: results.total,
                    deliveredCount: results.success,
                    failedCount: results.failures,
                    readCount: 0
                };

                // Determine initial status
                let campaignStatus = 'sending';
                if (results.failures === results.total) {
                    campaignStatus = 'failed';
                } else if (results.success === results.total) {
                    campaignStatus = 'completed';
                }

                await Campaign.updateStats(campaign.id, updatedStats);
                await Campaign.updateStatus(campaign.id, campaignStatus);

                res.json({
                    success: true,
                    message: 'Messages queued for sending',
                    data: {
                        campaignId: campaign.id,
                        initialStatus: campaignStatus,
                        ...results
                    }
                });
            } catch (error) {
                console.error('Error in sendBulkMessages:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to send messages',
                    error: error.message,
                    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        }
        // Add this helper method to MessageController
    static async createMessageRecord({ messageId, campaignId, contactId, status, error = null }) {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.execute(
                `INSERT INTO messages 
             (id, campaign_id, contact_id, status, error, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`, [messageId, campaignId, contactId, status, error]
            );
            console.log(`Created message record for ${messageId}`);
            return result;
        } catch (err) {
            console.error('Error creating message record:', {
                error: err,
                messageId,
                campaignId,
                contactId
            });
            throw err;
        } finally {
            connection.release();
        }
    }
    static async verifyWebhook(req, res) {
            try {
                const mode = req.query['hub.mode'];
                const token = req.query['hub.verify_token'];
                const challenge = req.query['hub.challenge'];

                const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

                if (mode && token) {
                    if (mode === 'subscribe' && token === verifyToken) {
                        console.log('WEBHOOK_VERIFIED');
                        return res.status(200).send(challenge);
                    }
                }

                return res.sendStatus(403);
            } catch (error) {
                console.error('Webhook verification failed:', error);
                return res.sendStatus(500);
            }
        }
        // controllers/messageController.js
    static async handleWebhook(req, res) {
        try {
            const { entry } = req.body;
            res.status(200).send('EVENT_RECEIVED'); // Respond immediately

            for (const item of entry) {
                for (const change of item.changes) {
                    if (change.value.statuses) {
                        for (const status of change.value.statuses) {
                            try {
                                const { id: messageId, status: messageStatus, timestamp } = status;

                                // Only process delivered and read statuses in webhook
                                if (['delivered', 'read'].includes(messageStatus)) {
                                    // Update message status
                                    await MessageController.updateMessageStatus(
                                        messageId,
                                        messageStatus,
                                        timestamp
                                    );

                                    // Get campaign for this message
                                    const campaign = await Campaign.getByMessageId(messageId);
                                    if (!campaign) continue;

                                    // Prepare update based on status
                                    const update = {};
                                    if (messageStatus === 'read') {
                                        update.read_count = 1; // Increment by 1
                                    }

                                    // Update campaign stats atomically
                                    if (Object.keys(update).length > 0) {
                                        await Campaign.incrementStats(
                                            campaign.id,
                                            update
                                        );
                                    }

                                    // Re-evaluate campaign status after update
                                    await Campaign.recalculateStatus(campaign.id);
                                }
                            } catch (error) {
                                console.error('Error processing status update:', error);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Webhook processing error:', error);
        }
    }

    static async processMessageStatus(status) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update the message record
            const [updated] = await connection.execute(
                `UPDATE messages SET 
                status = ?,
                whatsapp_status = ?,
                timestamp = ?,
                updated_at = NOW()
             WHERE id = ?`, [status.status, status.status, status.timestamp, status.id]
            );

            if (updated.affectedRows === 0) {
                console.warn(`Message ${status.id} not found in database`);
                return;
            }

            // 2. Get the campaign ID
            const [message] = await connection.execute(
                'SELECT campaign_id FROM messages WHERE id = ?', [status.id]
            );

            if (!message[0]) return;

            const campaignId = message[0].campaign_id;

            // 3. Get current campaign stats
            const [campaign] = await connection.execute(
                'SELECT * FROM campaigns WHERE id = ?', [campaignId]
            );

            if (!campaign[0]) return;

            // 4. Calculate new stats based on status change
            const update = {
                recipientCount: campaign[0].recipient_count,
                deliveredCount: campaign[0].delivered_count,
                failedCount: campaign[0].failed_count,
                readCount: campaign[0].read_count
            };

            switch (status.status) {
                case 'delivered':
                    update.deliveredCount += 1;
                    break;
                case 'read':
                    update.readCount += 1;
                    break;
                case 'failed':
                    update.failedCount += 1;
                    break;
                    // Other statuses can be handled as needed
            }

            // 5. Update campaign stats
            await Campaign.updateStats(campaignId, update);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    static async updateMessageStatus(messageId, newStatus) {
        const connection = await pool.getConnection();
        try {
            await connection.execute(
                `UPDATE messages SET 
                status = ?, 
                updated_at = NOW() 
             WHERE id = ?`, [newStatus, messageId]
            );
        } catch (err) {
            console.error('Error updating message status:', err);
        } finally {
            connection.release();
        }
    }
}

module.exports = MessageController;