// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { authenticate } = require('./middleware/auth');
const { testConnection } = require('./config/database');
const templateRoutes = require('./routes/templateRoutes');
const contactRoutes = require('./routes/contactRoutes');
const messageRoutes = require('./routes/messageRoutes');
const businessRoutes = require('./routes/businessRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const Message = require('./controllers/messageController');
const SchedulerService = require('./services/schedulerService');
const WSServer = require('./webSocket/wsSocket');
const fileRoutes = require('./routes/fileRoutes');
const quickReplyRoutes = require('./routes/quickReplyRoutes');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ?
        process.env.FRONTEND_URL : ['http://localhost:3000', 'http://localhost:5173', 'https://wa-notifier-new-frontend.vercel.app'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
testConnection();

// Create HTTP server first
const server = http.createServer(app);

// Create WebSocket server with error handling
let wss = null;
try {
    wss = new WSServer(server);
    console.log('WebSocket server initialized with heartbeat');
} catch (error) {
    console.warn('WebSocket initialization failed:', error.message);
    console.warn('Continuing without WebSocket support');
}

// Set up WebSocket instance for app.get('wss') access
if (wss) {
    app.set('wss', wss);
} else {
    // Provide a mock WebSocket for platforms that don't support it
    const mockWss = {
        broadcast: (data) => {
            console.log('WebSocket not available - broadcast skipped');
            return Promise.resolve();
        },
        getConnectedBusinesses: () => [],
        getConnectionCount: (businessId) => 0,
        sendToUser: (userId, data) => {
            console.log('WebSocket not available - sendToUser skipped');
            return Promise.resolve();
        },
        sendToBusiness: (businessId, data) => {
            console.log('WebSocket not available - sendToBusiness skipped');
            return Promise.resolve();
        },
        close: () => {
            console.log('WebSocket not available - close skipped');
        }
    };
    app.set('wss', mockWss);
}

// Add WebSocket instance to all requests for backward compatibility
app.use((req, res, next) => {
    req.wss = req.app.get('wss');
    next();
});

// Routes
app.use('/api/templates', authenticate, templateRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contacts', authenticate, contactRoutes);
app.use('/api/messages/', messageRoutes);
app.use('/api/campaigns', authenticate, campaignRoutes);
app.use('/api/business', authenticate, businessRoutes);
app.use('/api/redirect', redirectRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/conversations', authenticate, conversationRoutes);
app.use('/api/files', authenticate, fileRoutes);
app.use('/api/quick-replies', authenticate, quickReplyRoutes);

// Scheduled tasks (only in environments that support long-running processes)
const isServerlessEnvironment = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (!isServerlessEnvironment) {
    setInterval(async() => {
        try {
            await Message.checkStalledMessages();
        } catch (error) {
            console.error('Error checking stalled messages:', error);
        }
    }, 15 * 60 * 1000); // Check every 15 minutes

    setInterval(() => {
        try {
            SchedulerService.processScheduledCampaigns();
        } catch (error) {
            console.error('Error processing scheduled campaigns:', error);
        }
    }, 60000);
}

// Static files
app.use('/uploads', express.static(
    path.join(__dirname, 'public/uploads'), {
        maxAge: '1y',
        setHeaders: (res) => {
            res.set('Cache-Control', 'public, max-age=31536000');
        }
    }
));

// Test route
app.get('/check-uploads', (req, res) => {
    const testPath = path.join(__dirname, 'public/uploads/business-profile');
    let exists = false;
    let canWrite = false;

    try {
        exists = fs.existsSync(testPath);
        if (exists) {
            fs.accessSync(testPath, fs.constants.W_OK);
            canWrite = true;
        }
    } catch (error) {
        canWrite = false;
    }

    res.json({
        uploadsDirectoryExists: exists,
        absolutePath: testPath,
        canWrite: canWrite
    });
});

// WebSocket status route
app.get('/api/websocket/status', (req, res) => {
    const wss = req.app.get('wss');

    if (!wss || !wss.getConnectedBusinesses) {
        return res.json({
            connected: false,
            supported: false,
            message: 'WebSocket not supported on this platform',
            connectedBusinesses: [],
            totalConnections: 0
        });
    }

    try {
        const connectedBusinesses = wss.getConnectedBusinesses();
        const totalConnections = connectedBusinesses.reduce((total, businessId) => {
            return total + (wss.getConnectionCount ? wss.getConnectionCount(businessId) : 0);
        }, 0);

        res.json({
            connected: true,
            supported: true,
            connectedBusinesses: connectedBusinesses,
            totalConnections: totalConnections
        });
    } catch (error) {
        res.json({
            connected: false,
            supported: true,
            error: error.message,
            connectedBusinesses: [],
            totalConnections: 0
        });
    }
});

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        websocket: !!req.app.get('wss') ? req.app.get('wss').getConnectedBusinesses : [],
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Templates API is running',
        status: 'OK',
        version: '1.0.0',
        websocket: !!req.app.get('wss') ? req.app.get('wss').getConnectedBusinesses : []
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File size too large (max 5MB)'
        });
    }

    if (err.code === 'LIMIT_FILE_TYPES') {
        return res.status(415).json({
            success: false,
            message: 'Invalid file type (only JPEG, PNG, GIF allowed)'
        });
    }

    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res, next) => {
    console.log('404 - Route not found:', req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Ensure required directories exist
const requiredDirs = [
    path.join(__dirname, 'public/uploads'),
    path.join(__dirname, 'public/uploads/temp'),
    path.join(__dirname, 'public/uploads/business-profile')
];

requiredDirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    } catch (error) {
        console.warn(`Could not create directory ${dir}:`, error.message);
    }
});

// Start server only if this file is run directly (not imported)
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

        if (wss) {
            console.log(`WebSocket server is ready at ws://localhost:${PORT}/ws`);
        } else {
            console.log(`WebSocket not available on this platform`);
        }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
        console.log(`${signal} received, shutting down gracefully`);

        server.close(() => {
            console.log('HTTP server closed');

            // Close WebSocket server if it exists
            const wss = app.get('wss');
            if (wss && typeof wss.close === 'function') {
                try {
                    wss.close();
                    console.log('WebSocket server closed');
                } catch (error) {
                    console.warn('Error closing WebSocket server:', error.message);
                }
            }

            console.log('Server shutdown complete');
            process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
            console.log('Forcing server shutdown');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Export the server as default for deployment platforms
module.exports = server;