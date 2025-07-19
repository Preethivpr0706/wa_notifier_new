const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const ConversationService = require('../services/conversationService');

class ConversationController {
    static async getOrCreateConversation(businessId, phoneNumber) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if conversation exists
            const [existing] = await connection.query(
                `SELECT * FROM conversations 
                WHERE business_id = ? AND phone_number = ? 
                AND status = 'active'
                ORDER BY last_message_at DESC LIMIT 1`, [businessId, phoneNumber]
            );

            if (existing.length > 0) {
                await connection.commit();
                return existing[0];
            }

            // Create new conversation
            const conversationId = uuidv4();
            const [contact] = await connection.query(
                `SELECT * FROM contacts 
                WHERE business_id = ? AND wanumber = ? 
                LIMIT 1`, [businessId, phoneNumber]
            );

            const [client] = await connection.query(
                `SELECT * FROM clients 
                WHERE business_id = ? AND phone = ? 
                LIMIT 1`, [businessId, phoneNumber]
            );

            await connection.query(
                `INSERT INTO conversations 
                (id, business_id, phone_number, client_id, contact_id, status) 
                VALUES (?, ?, ?, ?, ?, 'active')`, [
                    conversationId,
                    businessId,
                    phoneNumber,
                    client.length ? client[0].id : null,
                    contact.length ? contact[0].id : null
                ]
            );

            await connection.commit();
            return {
                id: conversationId,
                business_id: businessId,
                phone_number: phoneNumber,
                client_id: client.length ? client[0].id : null,
                contact_id: contact.length ? contact[0].id : null,
                status: 'active'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async addIncomingMessage(messageData, wss) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                businessId,
                phoneNumber,
                whatsappMessageId,
                messageType,
                content,
                mediaUrl,
                mediaFilename,
                timestamp
            } = messageData;

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(businessId, phoneNumber);

            // Insert message
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages 
                (id, conversation_id, whatsapp_message_id, direction, 
                message_type, content, media_url, media_filename, status, timestamp) 
                VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?, 'delivered', ?)`, [
                    messageId,
                    conversation.id,
                    whatsappMessageId,
                    messageType,
                    content,
                    mediaUrl,
                    mediaFilename,
                    new Date(timestamp * 1000)
                ]
            );

            // Update conversation
            await connection.query(
                `UPDATE conversations 
                SET last_message_at = ?, 
                    unread_count = unread_count + 1,
                    whatsapp_message_id = ?
                WHERE id = ?`, [new Date(timestamp * 1000), whatsappMessageId, conversation.id]
            );

            await connection.commit();

            // Get full message for real-time update
            const [message] = await pool.query(
                `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
            );

            // Improved WebSocket notification with better error handling
            if (wss) {
                console.log("WebSocket server instance:", typeof wss);
                console.log("Available methods:", Object.getOwnPropertyNames(wss).filter(name => typeof wss[name] === 'function'));

                try {
                    // Check if it's the WSServer instance with notifyNewMessage method
                    if (typeof wss.notifyNewMessage === 'function') {
                        console.log("Calling notifyNewMessage with:", { businessId, conversationId: conversation.id });
                        wss.notifyNewMessage(businessId, conversation.id, message[0]);
                    } else {
                        console.warn("notifyNewMessage method not found on WebSocket server");
                        console.warn("Available methods:", Object.getOwnPropertyNames(wss));
                    }
                } catch (wsError) {
                    console.error("Error calling WebSocket notification:", wsError);
                }
            } else {
                console.warn("No WebSocket server instance provided");
            }

            return messageId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async listConversations(businessId, status = null, page = 1, limit = 20) {
        console.log("list called");
        try {
            let query = `
            SELECT 
                c.*,
                CONCAT(COALESCE(co.fname, ''), ' ', COALESCE(co.lname, '')) as contact_name,
                (SELECT content FROM chat_messages 
                 WHERE conversation_id = c.id 
                 ORDER BY timestamp DESC LIMIT 1) as last_message_content,
                (SELECT COUNT(*) FROM chat_messages 
                 WHERE conversation_id = c.id AND direction = 'inbound' AND read_at IS NULL) as unread_count
            FROM conversations c
            LEFT JOIN contacts co ON c.contact_id = co.id
            WHERE c.business_id = ?
        `;

            const params = [businessId];

            if (status) {
                query += ` AND c.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?`;

            const limitInt = parseInt(limit, 10);
            const pageInt = parseInt(page, 10);
            const offsetInt = (pageInt - 1) * limitInt;

            params.push(limitInt, offsetInt);

            const [conversations] = await pool.query(query, params);
            return conversations;
        } catch (error) {
            console.error('Error in listConversations:', error);
            throw error;
        }
    }

    static async getConversation(conversationId, userId) {
        try {
            const [conversation] = await pool.execute(
                `SELECT 
                    c.*,
                    CONCAT(COALESCE(co.fname, ''), ' ', COALESCE(co.lname, '')) as contact_name
                FROM conversations c
                LEFT JOIN contacts co ON c.contact_id = co.id
                JOIN users u ON c.business_id = u.business_id
                WHERE c.id = ? AND u.id = ?`, [conversationId, userId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            return conversation[0];
        } catch (error) {
            console.error('Error in getConversation:', error);
            throw error;
        }
    }

    static async getConversationMessages(conversationId) {
        const connection = await pool.getConnection();
        try {
            const [messages] = await connection.query(
                `SELECT * FROM chat_messages 
                WHERE conversation_id = ? 
                ORDER BY timestamp ASC`, [conversationId]
            );

            // Mark messages as read
            await connection.query(
                `UPDATE chat_messages 
                SET read_at = NOW() 
                WHERE conversation_id = ? AND direction = 'inbound' AND read_at IS NULL`, [conversationId]
            );

            // Update conversation unread count
            await connection.query(
                `UPDATE conversations 
                SET unread_count = 0 
                WHERE id = ?`, [conversationId]
            );

            return messages;
        } finally {
            connection.release();
        }
    }

    static async sendMessage(conversationId, messageData, userId, wss) {
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

            // Send message via WhatsApp
            const sendResult = await ConversationService.sendMessage({
                to: phone_number,
                businessId: business_id,
                ...messageData
            });

            // Insert message record
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages 
                (id, conversation_id, whatsapp_message_id, direction, 
                message_type, content, status, timestamp) 
                VALUES (?, ?, ?, 'outbound', ?, ?, 'sent', NOW())`, [
                    messageId,
                    conversationId,
                    sendResult.messageId,
                    messageData.messageType,
                    messageData.content
                ]
            );

            // Update conversation last message
            await connection.query(
                `UPDATE conversations 
                SET last_message_at = NOW() 
                WHERE id = ?`, [conversationId]
            );

            await connection.commit();

            // Get full message for response
            const [message] = await pool.query(
                `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
            );

            // Notify via WebSocket
            if (wss && typeof wss.notifyNewMessage === 'function') {
                try {
                    wss.notifyNewMessage(business_id, conversationId, message[0]);
                } catch (wsError) {
                    console.error("Error in WebSocket notification:", wsError);
                }
            }

            return {
                messageId,
                whatsappMessageId: sendResult.messageId,
                message: message[0]
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ... rest of the methods remain the same
    static async assignConversation(conversationId, userId) {
        const connection = await pool.getConnection();
        try {
            const [conversation] = await connection.execute(
                `SELECT * FROM conversations WHERE id = ?`, [conversationId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found');
            }

            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, conversation[0].business_id]
            );

            if (!user.length) {
                throw new Error('User not authorized for this conversation');
            }

            const [existing] = await connection.execute(
                `SELECT * FROM agent_conversations 
                WHERE conversation_id = ? AND unassigned_at IS NULL`, [conversationId]
            );

            if (existing.length > 0) {
                throw new Error('Conversation already assigned');
            }

            const assignmentId = uuidv4();
            await connection.execute(
                `INSERT INTO agent_conversations 
                (id, conversation_id, user_id) 
                VALUES (?, ?, ?)`, [assignmentId, conversationId, userId]
            );

            return assignmentId;
        } finally {
            connection.release();
        }
    }

    static async closeConversation(conversationId, userId) {
        const connection = await pool.getConnection();
        try {
            const [assignment] = await connection.execute(
                `SELECT ac.* FROM agent_conversations ac
                JOIN conversations c ON ac.conversation_id = c.id
                WHERE ac.conversation_id = ? AND ac.user_id = ? AND ac.unassigned_at IS NULL`, [conversationId, userId]
            );

            if (!assignment.length) {
                throw new Error('Conversation not assigned to user or already closed');
            }

            await connection.execute(
                `UPDATE conversations 
                SET status = 'closed' 
                WHERE id = ?`, [conversationId]
            );

            await connection.execute(
                `UPDATE agent_conversations 
                SET unassigned_at = NOW() 
                WHERE id = ?`, [assignment[0].id]
            );

            return true;
        } finally {
            connection.release();
        }
    }

    static async addQuickReply(businessId, userId, shortcode, message) {
        const connection = await pool.getConnection();
        try {
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, businessId]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            const quickReplyId = uuidv4();
            await connection.execute(
                `INSERT INTO quick_replies 
                (id, business_id, shortcode, message) 
                VALUES (?, ?, ?, ?)`, [quickReplyId, businessId, shortcode, message]
            );

            return quickReplyId;
        } finally {
            connection.release();
        }
    }

    static async getQuickReplies(businessId, userId) {
        const connection = await pool.getConnection();
        try {
            const [user] = await connection.execute(
                `SELECT * FROM users 
                WHERE id = ? AND business_id = ?`, [userId, businessId]
            );

            if (!user.length) {
                throw new Error('Access denied');
            }

            const [quickReplies] = await connection.execute(
                `SELECT * FROM quick_replies 
                WHERE business_id = ? 
                ORDER BY shortcode ASC`, [businessId]
            );

            return quickReplies;
        } finally {
            connection.release();
        }
    }
}

module.exports = ConversationController;