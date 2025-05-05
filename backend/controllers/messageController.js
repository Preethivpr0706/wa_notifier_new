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
                audienceType,
                customAudience,
                fieldMappings,
                sendNow,
                scheduledAt
            } = req.body;

            const userId = 1;

            // Validate required fields
            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID is required'
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

            // Get contacts based on audience type
            let contacts = [];
            if (audienceType === 'all') {
                const allContacts = await Contact.getAllByUser(userId);
                contacts = allContacts;
            } else if (audienceType === 'custom' && customAudience) {
                contacts = await this.processCustomAudience(customAudience);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid audience type or missing custom audience'
                });
            }

            if (!contacts || contacts.length === 0) {
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
                total: contacts.length,
                success: 0,
                failures: 0,
                errors: []
            };

            // Process each contact
            for (const contact of contacts) {
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

    static async processCustomAudience(customAudience) {
        // Implement your CSV processing logic here
        // This should return an array of contact objects with at least { wanumber }
        // Example implementation:

        try {
            if (!customAudience.buffer) {
                throw new Error('No file data received');
            }

            const csvData = customAudience.buffer.toString('utf8');
            const parsed = await new Promise((resolve, reject) => {
                Papa.parse(csvData, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results),
                    error: (error) => reject(error)
                });
            });

            // Validate required fields
            if (!parsed.data || parsed.data.length === 0) {
                throw new Error('CSV file is empty or contains no valid data');
            }

            if (!parsed.data[0].wanumber) {
                throw new Error('CSV must contain a wanumber column');
            }

            // Transform to contact objects
            return parsed.data.map(row => ({
                id: row.id || undefined,
                wanumber: row.wanumber,
                ...row // Include all other fields for variable replacement
            }));
        } catch (error) {
            console.error('Error processing custom audience:', error);
            throw new Error(`Failed to process custom audience: ${error.message}`);
        }
    }
}

module.exports = MessageController;