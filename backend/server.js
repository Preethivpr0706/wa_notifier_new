// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { testConnection } = require('./config/database');
const templateRoutes = require('./routes/templateRoutes');
// Add this with other route imports
const contactRoutes = require('./routes/contactRoutes');
const messageRoutes = require('./routes/messageRoutes');
const businessRoutes = require('./routes/businessRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const Message = require('./controllers/messageController');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
testConnection();

// Routes
app.use('/api/templates', templateRoutes);


// Add this with other route middleware
app.use('/api/contacts', contactRoutes);

app.use('/api/messages/', messageRoutes);

app.use('/api/campaigns', campaignRoutes);

app.use('/api/business', businessRoutes);

// Add to your server initialization code
setInterval(async() => {
    try {
        await Message.checkStalledMessages();
    } catch (error) {
        console.error('Error checking stalled messages:', error);
    }
}, 15 * 60 * 1000); // Check every 15 minutes
// Add this with your other middleware
app.use('/uploads', express.static(
    path.join(__dirname, 'public/uploads'), {
        maxAge: '1y',
        setHeaders: (res) => {
            res.set('Cache-Control', 'public, max-age=31536000');
        }
    }
));

// Add route to verify static files
app.get('/check-uploads', (req, res) => {
    const testPath = path.join(__dirname, 'public/uploads/business-profile');
    const exists = fs.existsSync(testPath);

    res.json({
        uploadsDirectoryExists: exists,
        absolutePath: testPath,
        canWrite: exists ? fs.accessSync(testPath, fs.constants.W_OK) : false
    });
});

// Root route
app.get('/', (req, res) => {
    res.send('WhatsApp Templates API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Handle Multer errors
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
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;