// controllers/messageController.js
const WhatsAppService = require('../services/WhatsAppService');
const Campaign = require('../models/campaignModel');
const Contact = require('../controllers/contactController');
const Template = require('../models/templateModel');
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
            const campaign = await Campaign.create({
                name: `Bulk Send - ${new Date().toLocaleString()}`,
                templateId,
                status: sendNow ? 'sending' : 'scheduled',
                scheduledAt: scheduledAt || null,
                userId
            });

            const results = {
                success: true,
                total: contacts.length,
                sent: 0,
                failed: 0,
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

                    await WhatsAppService.sendTemplateMessage(message);
                    results.success++;
                } catch (error) {
                    results.failures++;
                    results.errors.push({
                        contactId: contact ? contact.id : 'unknown',
                        error: error.message
                    });
                }
            }

            // Update campaign stats
            await Campaign.updateStats(campaign.id, {
                recipientCount: results.total,
                deliveredCount: results.success,
                readCount: 0
            });

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



}

module.exports = MessageController;