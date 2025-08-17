// controllers/messageController.js
const WhatsAppService = require('../services/WhatsAppService');
const Campaign = require('../models/campaignModel');
const Contact = require('../controllers/ContactController');
const Template = require('../models/templateModel');
const WhatsappConfigService = require('../services/WhatsappConfigService');
const { v4: uuidv4 } = require('uuid');
// Convert timestamp to MySQL datetime format
const moment = require('moment-timezone');
const ConversationController = require('../controllers/conversationController');
const { pool } = require('../config/database'); // Add this at the top
class MessageController {

    static async sendBulkMessages(req, res) {
            try {
                const {
                    templateId,
                    campaignName,
                    audience_type,
                    list_id,
                    is_custom,
                    contacts,
                    fieldMappings,
                    sendNow,
                    scheduledAt,
                    csvListName
                } = req.body;
                const userId = req.user.id;
                const businessId = req.user.businessId;

                // Validate required fields
                if (!templateId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Template ID is required'
                    });
                }

                // Normalize audience_type to lowercase
                const normalizedAudienceType = audience_type ? audience_type.toLowerCase() : null;
                // Check for URL buttons
                const [rows] = await pool.execute(`
    SELECT 1 
    FROM template_buttons tb 
    WHERE tb.template_id = ? 
    AND tb.type = 'url'
    LIMIT 1
`, [templateId]);

                const hasUrlButton = rows.length > 0;

                console.log("Has URL Button?", hasUrlButton);


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

                // Handle CSV contact saving if it's a custom audience
                let actualListId = list_id;
                if (is_custom && csvListName && contacts && contacts.length > 0) {
                    try {
                        // Create the contact list
                        const [listResult] = await pool.execute(
                            'INSERT INTO contact_lists (name, user_id) VALUES (?, ?)', [csvListName, userId]
                        );

                        // Get the inserted list's UUID
                        const [lists] = await pool.execute(
                            'SELECT id FROM contact_lists WHERE name = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1', [csvListName, userId]
                        );

                        if (lists.length > 0) {
                            actualListId = lists[0].id;

                            // Prepare batch insert for contacts
                            const contactsToInsert = contacts.map(contact => [
                                contact.fname || '',
                                contact.lname || '',
                                contact.wanumber,
                                contact.email || '',
                                actualListId,
                                userId // Add user_id if your contacts table has it
                            ]);

                            // Batch insert contacts
                            await pool.query(
                                'INSERT INTO contacts (fname, lname, wanumber, email, list_id, user_id) VALUES ?', [contactsToInsert]
                            );

                            console.log(`Saved ${contactsToInsert.length} contacts to list: ${csvListName}`);
                        }
                    } catch (saveError) {
                        console.error('Error saving CSV contacts:', saveError);
                        // Continue with the campaign even if saving contacts fails
                    }
                }
                // Get target contacts based on audience type
                let targetContacts = [];

                if (normalizedAudienceType === 'all') {
                    targetContacts = await Contact.getAllByUser(userId);
                } else if (normalizedAudienceType === 'list') {
                    // Get contacts from the specified list
                    targetContacts = await Contact.getByList(actualListId, userId);
                } else if (normalizedAudienceType === 'custom') {
                    // For custom, if we saved to DB, get from there, otherwise use provided contacts
                    if (actualListId) {
                        try {
                            targetContacts = await Contact.getByList(actualListId, userId);
                        } catch (error) {
                            console.log('Using provided contacts as fallback');
                            targetContacts = contacts.map(c => ({...c, list_id: actualListId }));
                        }
                    } else {
                        targetContacts = contacts;
                    }
                }

                if (!targetContacts || targetContacts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No contacts found to send messages to'
                    });
                }

                // Create campaign record
                // Create campaign record with initial counts
                // Create campaign with appropriate status
                // In MessageController.sendBulkMessages

                // Update campaign creation to include the actual list_id
                const campaign = await Campaign.create({
                    name: `${campaignName} - ${new Date().toLocaleString()}`,
                    templateId,
                    status: sendNow ? 'sending' : 'scheduled',
                    scheduledAt: sendNow ? null : scheduledAt,
                    userId,
                    businessId,
                    contacts: targetContacts,
                    fieldMappings,
                    recipientCount: targetContacts.length,
                    deliveredCount: 0,
                    failedCount: 0,
                    readCount: 0,
                    list_id: actualListId // Use the actual list ID
                });
                if (sendNow) {
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

                            // IMPORTANT: Ensure conversation exists for this contact
                            await ConversationController.ensureConversationForCampaign(
                                businessId,
                                contact.wanumber,
                                contact.id
                            );

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


                            // Handle buttons - just indicate if we have URL buttons that need parameters
                            if (hasUrlButton) {
                                message.buttons = true; // Just indicate we have buttons that need parameters
                            }
                            // To this:
                            // Send message
                            const sendResult = await WhatsAppService.sendTemplateMessage(message, userId, campaign.id);
                            // Create message record with initial status
                            await MessageController.createMessageRecord({
                                messageId: sendResult.messageId,
                                campaignId: campaign.id,
                                businessId,
                                contactId: contact.id,
                                status: sendResult.status, // Use status from response
                                error: sendResult.error,
                                timestamp: sendResult.timestamp
                            });

                            // Update counts based on immediate result
                            const update = {};
                            if (sendResult.status === 'sent') {
                                update.delivered_count = 1;
                            } else if (sendResult.status === 'failed') {
                                update.failed_count = 1;
                            }

                            if (Object.keys(update).length > 0) {
                                await Campaign.incrementStats(campaign.id, update);
                            }
                        } catch (error) {
                            console.error(`Error sending to ${contact.wanumber}:`, error);

                            // Still try to ensure conversation exists even on failure
                            try {
                                await ConversationController.ensureConversationForCampaign(
                                    businessId,
                                    contact.wanumber,
                                    contact.id
                                );
                            } catch (convError) {
                                console.error('Failed to create conversation for failed message:', convError);
                            }
                            // Handle failed message creation
                            await MessageController.createMessageRecord({
                                messageId: `failed-${Date.now()}`,
                                campaignId: campaign.id,
                                businessId,
                                contactId: contact.id,
                                status: 'failed',
                                error: error.message,
                                timestamp: new Date().toISOString()
                            });

                            await Campaign.incrementStats(campaign.id, { failed_count: 1 });
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
                }
                res.json({
                    success: true,
                    message: sendNow ? 'Messages queued for sending' : 'Campaign scheduled successfully',
                    data: {
                        campaignId: campaign.id,
                        initialStatus: sendNow ? 'sending' : 'scheduled',
                        scheduledAt: scheduledAt
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
    static async createMessageRecord({ messageId, campaignId, businessId, contactId, status, error = null, timestamp = null }) {
        const connection = await pool.getConnection();
        console.log(timestamp)


        let mysqlTimestamp = null;
        if (timestamp) {
            // Convert to IST and format for MySQL
            mysqlTimestamp = moment(timestamp).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        }
        console.log(mysqlTimestamp);

        console.log(mysqlTimestamp)
        try {
            // Ensure we have required parameters
            if (!messageId || !campaignId || !businessId || !contactId) {
                throw new Error('Missing required parameters for message record');
            }

            const [result] = await connection.execute(
                `INSERT INTO messages
            (id, campaign_id, business_id, contact_id, status, error, created_at, updated_at, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(),?)`, [messageId, campaignId, businessId, contactId, status, error, mysqlTimestamp]
            );

            console.log(`Created message record for ${messageId} with status ${status}`);
            return result;
        } catch (err) {
            console.error('Error creating message record:', {
                error: err.message,
                messageId,
                campaignId,
                businessId,
                contactId,
                status
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

            if (!mode || !token) {
                return res.sendStatus(403);
            }

            // Get business config by verify token
            const [businessConfig] = await pool.execute(
                `SELECT * FROM business_settings 
             WHERE webhook_verify_token = ?`, [token]
            );

            if (!businessConfig || businessConfig.length === 0) {
                console.log('Invalid verify token:', token);
                return res.sendStatus(403);
            }

            if (mode === 'subscribe' && token === businessConfig[0].webhook_verify_token) {
                console.log('WEBHOOK_VERIFIED for business:', businessConfig[0].business_id);
                return res.status(200).send(challenge);
            }

            return res.sendStatus(403);
        } catch (error) {
            console.error('Webhook verification failed:', error);
            return res.sendStatus(500);
        }
    }

    /*
        static async handleWebhook(req, res) {
            try {
                console.log('Raw webhook payload:', JSON.stringify(req.body, null, 2)); // Log full payload
                const { entry } = req.body;
                res.status(200).send('EVENT_RECEIVED');
                console.log(JSON.stringify(entry, 2));
                for (const item of entry) {
                    // Get business ID from phone number ID
                    const phoneNumberId = item.changes[0] && item.changes[0].value && item.changes[0].value.metadata && item.changes[0].value.metadata.phone_number_id ? item.changes[0].value.metadata.phone_number_id : null;
                    if (!phoneNumberId) continue;

                    // Get business settings
                    const [settings] = await pool.execute(
                        'SELECT business_id FROM business_settings WHERE whatsapp_phone_number_id = ?', [phoneNumberId]
                    );

                    if (!settings.length) continue;
                    const businessId = settings[0].business_id;
                    for (const change of item.changes) {

                        if (change.value.statuses) {
                            for (const status of change.value.statuses) {
                                try {
                                    const { id: messageId, status: whatsappStatus, timestamp } = status;

                                    // Map WhatsApp status to our status
                                    let messageStatus;
                                    console.log('messageStatus!!!!!!!!!!!!!!!!1111111   ', messageId, whatsappStatus)
                                    switch (whatsappStatus) {
                                        case 'sent':
                                            messageStatus = 'sent';
                                            break;
                                        case 'delivered':
                                            messageStatus = 'delivered';
                                            break;
                                        case 'read':
                                            messageStatus = 'read';
                                            break;
                                        case 'failed':
                                            messageStatus = 'failed';
                                            break;
                                        default:
                                            continue; // Skip unknown statuses
                                    }

                                    // Update message status
                                    await MessageController.updateMessageStatus(
                                        messageId,
                                        messageStatus,
                                        timestamp
                                    );

                                    // Get campaign for this message
                                    const campaign = await Campaign.getByMessageId(messageId);
                                    if (!campaign) continue;

                                    // Recalculate all stats from messages table
                                    await Campaign.calculateStatsFromMessages(campaign.id);
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
    */
    // In your messageController.js or a new webhookController.js

    static async handleWebhook(req, res) {
        try {
            console.log('Raw webhook payload:', JSON.stringify(req.body, null, 2));
            const { entry } = req.body;

            // First respond to the webhook to prevent timeouts
            res.status(200).send('EVENT_RECEIVED');

            // Get WebSocket server instance
            const wss = req.app.get('wss');

            if (!wss) {
                console.error('WebSocket server instance not found in app');
                // Don't return error, continue processing without WebSocket
            }

            // Process status updates
            for (const item of entry) {
                const phoneNumberId = item.changes[0] && item.changes[0].value && item.changes[0].value.metadata && item.changes[0].value.metadata.phone_number_id ? item.changes[0].value.metadata.phone_number_id : null;
                if (!phoneNumberId) continue;

                // Get business settings
                const [settings] = await pool.execute(
                    'SELECT business_id FROM business_settings WHERE whatsapp_phone_number_id = ?', [phoneNumberId]
                );

                if (!settings.length) continue;
                const businessId = settings[0].business_id;

                for (const change of item.changes) {
                    // Process message status updates
                    if (change.value.statuses) {
                        for (const status of change.value.statuses) {
                            try {
                                const { id: messageId, status: whatsappStatus, timestamp } = status;

                                // Map WhatsApp status to our status
                                let messageStatus;
                                switch (whatsappStatus) {
                                    case 'sent':
                                        messageStatus = 'sent';
                                        break;
                                    case 'delivered':
                                        messageStatus = 'delivered';
                                        break;
                                    case 'read':
                                        messageStatus = 'read';
                                        break;
                                    case 'failed':
                                        messageStatus = 'failed';
                                        break;
                                    default:
                                        continue; // Skip unknown statuses
                                }

                                // Update message status in chat_messages table
                                await pool.execute(
                                    `UPDATE chat_messages 
                                SET status = ?, 
                                updated_at = NOW() 
                                WHERE whatsapp_message_id = ?`, [messageStatus, messageId]
                                );

                                // Update message status in messages table
                                await MessageController.updateMessageStatus(
                                    messageId,
                                    messageStatus,
                                    whatsappStatus,
                                    timestamp
                                );

                                // **NEW: Notify WebSocket clients about status update**
                                if (wss && typeof wss.notifyMessageStatus === 'function') {
                                    try {
                                        console.log(`Notifying WebSocket clients about message status update: ${messageId} -> ${messageStatus}`);
                                        wss.notifyMessageStatus(businessId, messageId, messageStatus);
                                    } catch (wsError) {
                                        console.error('Error notifying WebSocket clients about status update:', wsError);
                                    }
                                }

                                // Get campaign for this message
                                const campaign = await Campaign.getByMessageId(messageId);
                                if (!campaign) continue;
                                // Recalculate all stats from messages table
                                await Campaign.calculateStatsFromMessages(campaign.id);
                            } catch (error) {
                                console.error('Error processing status update:', error);
                            }
                        }
                    }

                    // Process incoming messages
                    if (change.value.messages) {
                        if (!wss) {
                            console.error('WebSocket server instance not found in app');
                            // Continue processing without WebSocket
                        } else {
                            console.log('WebSocket server instance found, processing message...');
                            await WhatsAppService.processIncomingMessage([item], wss);
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
    static async updateMessageStatus(messageId, newStatus, whatsappStatus) {
        const connection = await pool.getConnection();
        try {
            await connection.execute(
                `UPDATE messages SET 
                status = ?, whatsapp_status =?,
                updated_at = NOW() 
             WHERE id = ?`, [newStatus, whatsappStatus, messageId]
            );
            await MessageController.recordStatusChange(messageId, newStatus);
        } catch (err) {
            console.error('Error updating message status:', err);
        } finally {
            connection.release();
        }
    }
    static async recordStatusChange(messageId, status) {
            const connection = await pool.getConnection();
            try {
                await connection.execute(
                    `INSERT INTO message_status_history 
             (id, message_id, status) 
             VALUES (?, ?, ?)`, [uuidv4(), messageId, status]
                );
            } finally {
                connection.release();
            }
        }
        // Add to messageModel.js or similar
    static async checkStalledMessages() {
            const connection = await pool.getConnection();
            try {
                // Find messages stuck in 'sent' status for more than 15 minutes
                const [stalledMessages] = await connection.execute(
                    `SELECT id FROM messages 
             WHERE status = 'sent' 
             AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
                );

                for (const message of stalledMessages) {
                    await connection.execute(
                        `UPDATE messages SET 
                 status = 'failed',
                 error = 'Timeout: No delivery confirmation received',
                 updated_at = NOW()
                 WHERE id = ?`, [message.id]
                    );

                    // Update campaign stats
                    const campaign = await Campaign.getByMessageId(message.id);
                    if (campaign) {
                        await Campaign.calculateStatsFromMessages(campaign.id);
                    }
                }
            } finally {
                connection.release();
            }
        }
        // controllers/messageController.js

    static async processCampaignMessages(campaignId, contacts, fieldMappings, templateId, userId, businessId) {
        try {
            // Get template
            const template = await Template.getByIdForSending(templateId, userId);

            if (!template) {
                throw new Error('Template not found or not accessible');
            }

            if (!template.whatsapp_id) {
                throw new Error('Template is not approved on WhatsApp');
            }

            // Initialize counters for batch processing
            let successCount = 0;
            let failedCount = 0;
            const errors = [];

            // Check for URL buttons once
            const [rows] = await pool.execute(`
            SELECT 1
            FROM template_buttons tb
            WHERE tb.template_id = ?
            AND tb.type = 'url'
            LIMIT 1
        `, [templateId]);

            const hasUrlButton = rows.length > 0;
            console.log("Has URL Button?", hasUrlButton);

            // Process each contact with proper error handling
            for (const contact of contacts) {
                try {
                    // Validate contact data
                    if (!contact || typeof contact !== 'object' || !contact.wanumber) {
                        throw new Error('Invalid contact format - missing WhatsApp number');
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

                    // Handle buttons - just indicate if we have URL buttons that need parameters
                    if (hasUrlButton) {
                        message.buttons = true;
                    }

                    // Send message
                    const sendResult = await WhatsAppService.sendTemplateMessage(message, userId, campaignId);

                    // Create message record with proper businessId
                    await MessageController.createMessageRecord({
                        messageId: sendResult.messageId || `msg-${Date.now()}-${Math.random()}`,
                        campaignId,
                        businessId, // ← Fixed: using proper businessId parameter
                        contactId: contact.id,
                        status: sendResult.status || 'sent',
                        error: sendResult.error || null,
                        timestamp: sendResult.timestamp || new Date().toISOString()
                    });

                    // Update success counter
                    if (sendResult.status === 'sent' || !sendResult.status) {
                        successCount++;
                    } else {
                        failedCount++;
                    }

                } catch (contactError) {
                    console.error(`Error sending message to contact ${contact.id}:`, contactError);

                    // Create failed message record
                    await MessageController.createMessageRecord({
                        messageId: `failed-${Date.now()}-${Math.random()}`,
                        campaignId,
                        businessId,
                        contactId: contact.id,
                        status: 'failed',
                        error: contactError.message,
                        timestamp: new Date().toISOString(),
                    });

                    failedCount++;
                    errors.push({
                        contactId: contact.id,
                        error: contactError.message
                    });
                }
            }

            // Update campaign statistics after processing all contacts
            await Campaign.updateStats(campaignId, {
                recipientCount: contacts.length,
                deliveredCount: successCount,
                failedCount: failedCount,
                readCount: 0 // Will be updated by webhooks
            });

            // Determine final campaign status
            let campaignStatus = 'completed';
            if (failedCount === contacts.length) {
                campaignStatus = 'failed';
            } else if (failedCount > 0) {
                campaignStatus = 'partial'; // You might want to add this status
            }

            await Campaign.updateStatus(campaignId, campaignStatus);

            console.log(`Campaign ${campaignId} processed: ${successCount} sent, ${failedCount} failed`);

            return {
                total: contacts.length,
                success: successCount,
                failed: failedCount,
                errors: errors
            };

        } catch (error) {
            console.error('Error in processCampaignMessages:', error);

            // Update campaign to failed status
            await Campaign.updateStatus(campaignId, 'failed');

            throw error;
        }
    }

    static async saveDraft(req, res) {
        try {
            const {
                templateId,
                campaignName,
                audience_type,
                contacts,
                fieldMappings,
                scheduledAt = null,
                csvListName
            } = req.body;

            const userId = req.user.id;
            const businessId = req.user.businessId;

            // Validate required fields
            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID is required'
                });
            }

            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one contact is required'
                });
            }

            // Handle CSV contact saving if it's a custom audience
            let actualListId = null;
            if (audience_type === 'custom' && csvListName && contacts && contacts.length > 0) {
                try {
                    // Create the contact list
                    const [listResult] = await pool.execute(
                        'INSERT INTO contact_lists (name, user_id) VALUES (?, ?)', [csvListName, userId]
                    );

                    // Get the inserted list's UUID
                    const [lists] = await pool.execute(
                        'SELECT id FROM contact_lists WHERE name = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1', [csvListName, userId]
                    );

                    if (lists.length > 0) {
                        actualListId = lists[0].id;

                        // Prepare batch insert for contacts
                        const contactsToInsert = contacts.map(contact => [
                            contact.fname || '',
                            contact.lname || '',
                            contact.wanumber,
                            contact.email || '',
                            actualListId,
                            userId
                        ]);

                        // Batch insert contacts
                        await pool.query(
                            'INSERT INTO contacts (fname, lname, wanumber, email, list_id, user_id) VALUES ?', [contactsToInsert]
                        );
                    }
                } catch (saveError) {
                    console.error('Error saving CSV contacts:', saveError);
                }
            }

            // Create campaign as draft
            const campaign = await Campaign.create({
                name: `${campaignName} - ${new Date().toLocaleString()}`,
                templateId,
                status: 'draft',
                scheduledAt,
                userId,
                businessId,
                contacts,
                fieldMappings,
                recipientCount: contacts.length,
                list_id: actualListId
            });

            res.json({
                success: true,
                message: 'Draft saved successfully',
                data: { campaignId: campaign.id }
            });
        } catch (error) {
            console.error('Error saving draft:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save draft',
                error: error.message
            });
        }
    }

    static async sendDraft(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const businessId = req.user.businessId;

            // Get the draft campaign
            const campaign = await Campaign.getById(id, userId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Draft campaign not found'
                });
            }

            if (campaign.status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: 'Campaign is not in draft status'
                });
            }
            let contacts;
            let fieldMappings;
            // Parse stored contacts and field mappings
            try {
                contacts = typeof campaign.contacts === 'string' ?
                    JSON.parse(campaign.contacts) :
                    campaign.contacts;

                fieldMappings = typeof campaign.field_mappings === 'string' ?
                    JSON.parse(campaign.field_mappings) :
                    campaign.field_mappings;
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                throw new Error('Invalid campaign data format');
            }

            // IMPORTANT: Ensure conversations exist for all recipients before sending
            for (const contact of contacts) {
                try {
                    await ConversationController.ensureConversationForCampaign(
                        businessId,
                        contact.wanumber,
                        contact.id
                    );
                } catch (convError) {
                    console.error(`Failed to create conversation for ${contact.wanumber}:`, convError);
                    // Continue with other contacts even if one fails
                }
            }

            // Update campaign status to sending
            await Campaign.updateStatus(id, 'sending');

            // Process messages
            await MessageController.processCampaignMessages(
                id,
                contacts,
                fieldMappings,
                campaign.template_id,
                userId,
                businessId
            );

            res.json({
                success: true,
                message: 'Draft campaign sent successfully'
            });
        } catch (error) {
            console.error('Error sending draft:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send draft',
                error: error.message
            });
        }
    }


}

module.exports = MessageController;