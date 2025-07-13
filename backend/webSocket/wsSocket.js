// webSocket/wsSocket.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const url = require('url');

class WSServer {
    constructor(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/ws'
        });
        this.clients = new Map(); // businessId -> Map of clientId -> client info
        this.clientCounter = 0;

        this.wss.on('connection', async(ws, req) => {
            let clientId = ++this.clientCounter;

            try {
                console.log(`[${clientId}] WebSocket connection attempt from:`, req.url);

                const parsedUrl = url.parse(req.url, true);
                const { businessId, token } = parsedUrl.query;

                console.log(`[${clientId}] Parsed businessId: ${businessId}, token exists: ${!!token}`);

                if (!token) {
                    console.log(`[${clientId}] No token provided`);
                    ws.close(1008, 'Authentication required');
                    return;
                }

                // Verify JWT token
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET);
                    console.log(`[${clientId}] Token decoded successfully for user:`, decoded.email);
                } catch (jwtError) {
                    console.log(`[${clientId}] JWT verification failed:`, jwtError.message);
                    ws.close(1008, 'Invalid token');
                    return;
                }

                const finalBusinessId = businessId || decoded.businessId;

                if (!finalBusinessId) {
                    console.log(`[${clientId}] No business ID found`);
                    ws.close(1008, 'Business ID required');
                    return;
                }

                // Validate business exists
                const [business] = await pool.query(
                    'SELECT id FROM businesses WHERE id = ?', [finalBusinessId]
                );

                if (!business.length) {
                    console.log(`[${clientId}] Business not found: ${finalBusinessId}`);
                    ws.close(1008, 'Invalid business');
                    return;
                }

                console.log(`[${clientId}] WebSocket authenticated for business: ${finalBusinessId}`);

                // Store client info
                ws.clientId = clientId;
                ws.businessId = finalBusinessId;
                ws.userId = decoded.id;
                ws.userEmail = decoded.email;
                ws.isAlive = true;

                // Initialize business clients map if not exists
                if (!this.clients.has(finalBusinessId)) {
                    this.clients.set(finalBusinessId, new Map());
                }

                // Store client with detailed info
                this.clients.get(finalBusinessId).set(clientId, {
                    ws,
                    userId: decoded.id,
                    userEmail: decoded.email,
                    connectedAt: new Date(),
                    lastSeen: new Date()
                });

                const businessClients = this.clients.get(finalBusinessId);
                console.log(`[${clientId}] Client connected. Total clients for business ${finalBusinessId}: ${businessClients.size}`);

                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'connected',
                    clientId,
                    businessId: finalBusinessId,
                    timestamp: new Date().toISOString()
                }));

                // Handle heartbeat
                ws.on('pong', () => {
                    ws.isAlive = true;
                    if (businessClients.has(clientId)) {
                        businessClients.get(clientId).lastSeen = new Date();
                    }
                });

                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        console.log(`[${clientId}] Received message:`, data.type);

                        // Update last seen
                        if (businessClients.has(clientId)) {
                            businessClients.get(clientId).lastSeen = new Date();
                        }

                        const { type, conversationId, isTyping } = data;

                        if (type === 'typing') {
                            this.broadcastToBusiness(finalBusinessId, {
                                type: 'typing',
                                conversationId,
                                isTyping,
                                userId: decoded.id
                            }, clientId); // Exclude sender
                        } else if (type === 'ping') {
                            // Respond to ping
                            ws.send(JSON.stringify({
                                type: 'pong',
                                timestamp: new Date().toISOString()
                            }));
                        }
                    } catch (error) {
                        console.error(`[${clientId}] Error processing message:`, error);
                    }
                });

                ws.on('close', (code, reason) => {
                    console.log(`[${clientId}] WebSocket disconnected. Code: ${code}, Reason: ${reason}`);
                    this.removeClient(finalBusinessId, clientId);
                });

                ws.on('error', (error) => {
                    console.error(`[${clientId}] WebSocket error:`, error);
                    this.removeClient(finalBusinessId, clientId);
                });

            } catch (error) {
                console.error(`[${clientId}] WebSocket connection error:`, error);
                ws.close(1008, 'Authentication failed');
            }
        });

        // Heartbeat interval - ping clients every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((businessClients, businessId) => {
                businessClients.forEach((clientInfo, clientId) => {
                    const { ws } = clientInfo;
                    if (ws.isAlive === false) {
                        console.log(`[${clientId}] Terminating dead connection`);
                        this.removeClient(businessId, clientId);
                        return ws.terminate();
                    }

                    ws.isAlive = false;
                    ws.ping();
                });
            });
        }, 30000);

        console.log('WebSocket server initialized with heartbeat');
    }

    removeClient(businessId, clientId) {
        if (this.clients.has(businessId)) {
            const businessClients = this.clients.get(businessId);
            if (businessClients.has(clientId)) {
                businessClients.delete(clientId);
                console.log(`[${clientId}] Client removed. Remaining clients for business ${businessId}: ${businessClients.size}`);

                // Clean up empty business entries
                if (businessClients.size === 0) {
                    this.clients.delete(businessId);
                    console.log(`Business ${businessId} removed from active connections`);
                }
            }
        }
    }

    broadcastToBusiness(businessId, message, excludeClientId = null) {
        const businessClients = this.clients.get(businessId);
        if (!businessClients || businessClients.size === 0) {
            console.log(`No clients found for business: ${businessId}`);
            return false;
        }

        let sentCount = 0;
        const totalClients = businessClients.size;

        businessClients.forEach((clientInfo, clientId) => {
            if (clientId === excludeClientId) return;

            const { ws } = clientInfo;
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify(message));
                    sentCount++;
                } catch (error) {
                    console.error(`[${clientId}] Error sending message:`, error);
                    this.removeClient(businessId, clientId);
                }
            } else {
                console.log(`[${clientId}] Client not ready, removing`);
                this.removeClient(businessId, clientId);
            }
        });

        console.log(`Broadcasting to business ${businessId}: ${sentCount}/${totalClients} clients received message`);
        return sentCount > 0;
    }

    notifyNewMessage(businessId, conversationId, message) {
        console.log('=== NOTIFY NEW MESSAGE ===');
        console.log('Business ID:', businessId);
        console.log('Conversation ID:', conversationId);
        console.log('Message ID:', message.id);
        console.log('Available businesses:', Array.from(this.clients.keys()));

        // Ensure businessId is string for comparison
        const businessIdStr = String(businessId);

        const success = this.broadcastToBusiness(businessIdStr, {
            type: 'new_message',
            id: `msg-${message.id}-${Date.now()}`,
            conversationId,
            message,
            timestamp: new Date().toISOString()
        });

        console.log('Notification sent successfully:', success);
        console.log('=== END NOTIFY NEW MESSAGE ===');

        return success;
    }

    notifyMessageStatus(businessId, messageId, status) {
        console.log('Notifying message status:', { businessId, messageId, status });

        const businessIdStr = String(businessId);
        return this.broadcastToBusiness(businessIdStr, {
            type: 'message_status',
            id: `status-${messageId}-${Date.now()}`,
            messageId,
            status,
            timestamp: new Date().toISOString()
        });
    }

    notifyNewConversation(businessId, conversation) {
        console.log('Notifying new conversation:', { businessId, conversationId: conversation.id });

        const businessIdStr = String(businessId);
        return this.broadcastToBusiness(businessIdStr, {
            type: 'new_conversation',
            id: `conv-${conversation.id}-${Date.now()}`,
            conversation,
            timestamp: new Date().toISOString()
        });
    }

    // Get connection count for a business
    getConnectionCount(businessId) {
        const businessClients = this.clients.get(String(businessId));
        return businessClients ? businessClients.size : 0;
    }

    // Get all connected business IDs
    getConnectedBusinesses() {
        return Array.from(this.clients.keys()).filter(businessId =>
            this.clients.get(businessId).size > 0
        );
    }

    // Get detailed connection info
    getConnectionInfo() {
        const info = {};
        this.clients.forEach((businessClients, businessId) => {
            info[businessId] = {
                clientCount: businessClients.size,
                clients: Array.from(businessClients.entries()).map(([clientId, clientInfo]) => ({
                    clientId,
                    userId: clientInfo.userId,
                    userEmail: clientInfo.userEmail,
                    connectedAt: clientInfo.connectedAt,
                    lastSeen: clientInfo.lastSeen
                }))
            };
        });
        return info;
    }

    // Test method to verify WebSocket is working
    testNotification(businessId) {
        console.log('Testing notification for business:', businessId);
        return this.broadcastToBusiness(String(businessId), {
            type: 'test_notification',
            id: `test-${Date.now()}`,
            message: 'This is a test notification',
            timestamp: new Date().toISOString()
        });
    }

    // Cleanup method
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.clients.forEach((businessClients) => {
            businessClients.forEach((clientInfo) => {
                clientInfo.ws.close(1001, 'Server shutting down');
            });
        });

        this.clients.clear();
        this.wss.close();
    }
}

module.exports = WSServer;