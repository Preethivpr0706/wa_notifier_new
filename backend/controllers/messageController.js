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
                // Create campaign record
                const campaign = await Campaign.create({
                    name: `Bulk Send - ${new Date().toLocaleString()}`,
                    templateId,
                    status: sendNow ? 'sending' : 'scheduled',
                    scheduledAt: scheduledAt || null,
                    userId
                });

                const results = {
                    total: targetContacts.length,
                    success: 0,
                    failures: 0,
                    errors: []
                };

                // Track message IDs and their statuses
                const messageStatusMap = {};

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
                            bodyParameters: []
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
                        const whatsappResponse = await WhatsAppService.sendTemplateMessage(message);

                        // Store initial status
                        messageStatusMap[whatsappResponse.id] = {
                            status: 'sent',
                            contactId: contact.id,
                            timestamp: new Date()
                        };

                        await MessageController.createMessageRecord({
                            messageId: whatsappResponse.id,
                            campaignId: campaign.id,
                            contactId: contact.id,
                            status: 'sent'
                        });

                        results.success++;
                    } catch (error) {
                        const failedId = `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        messageStatusMap[failedId] = {
                            status: 'failed',
                            contactId: contact.id,
                            timestamp: new Date(),
                            error: error.message
                        };

                        await MessageController.createMessageRecord({
                            messageId: failedId,
                            campaignId: campaign.id,
                            contactId: contact.id,
                            status: 'failed',
                            error: error.message
                        });

                        results.failures++;
                        results.errors.push({
                            contactId: contact ? contact.id : 'unknown',
                            error: error.message
                        });
                    }
                }


                // Initial stats update
                const updatedStats = {
                    recipientCount: results.total,
                    deliveredCount: results.success,
                    failedCount: results.failures,
                    readCount: 0
                };

                // Store message status map in campaign for webhook updates
                await Campaign.updateMessageStatusMap(campaign.id, messageStatusMap);
                await Campaign.updateStats(campaign.id, updatedStats);
                // Determine final status
                let finalStatus = 'sending';
                if (results.success === results.total) {
                    finalStatus = 'completed';
                } else if (results.success > 0) {
                    finalStatus = 'partial';
                } else if (results.failures === results.total) {
                    finalStatus = 'failed';
                }

                // Update campaign
                await Campaign.updateStats(campaign.id, updatedStats);
                await Campaign.updateStatus(campaign.id, finalStatus);

                res.json({
                    success: true,
                    message: 'Messages queued for sending',
                    data: {
                        campaignId: campaign.id,
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
    static async handleWebhook(req, res) {
        try {
            const { entry } = req.body;
            res.status(200).send('EVENT_RECEIVED');

            for (const item of entry) {
                const { changes } = item;
                for (const change of changes) {
                    const { value } = change;

                    if (value.statuses) {
                        for (const status of value.statuses) {
                            try {
                                const { id: messageId, status: messageStatus } = status;

                                // Update message status first
                                await MessageController.updateMessageStatus(messageId, messageStatus);

                                // Find which campaign this belongs to
                                const campaign = await Campaign.getByMessageId(messageId);
                                if (!campaign) continue;

                                // Get current status map
                                const statusMap = await Campaign.getMessageStatusMap(campaign.id) || {};

                                // Update status in map
                                if (statusMap[messageId]) {
                                    statusMap[messageId].status = messageStatus;
                                    statusMap[messageId].updated = new Date();

                                    // Recalculate counts
                                    const counts = {
                                        deliveredCount: 0,
                                        failedCount: 0,
                                        readCount: 0
                                    };

                                    Object.values(statusMap).forEach(msg => {
                                        if (msg.status === 'delivered') counts.deliveredCount++;
                                        if (msg.status === 'failed') counts.failedCount++;
                                        if (msg.status === 'read') counts.readCount++;
                                    });

                                    // Update campaign stats
                                    await Campaign.updateStats(campaign.id, {
                                        recipientCount: campaign.recipient_count,
                                        ...counts
                                    });

                                    // Save updated status map
                                    await Campaign.updateMessageStatusMap(campaign.id, statusMap);
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