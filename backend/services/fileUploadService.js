const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Correct path - points to backend/public/uploads
const uploadDir = path.join(__dirname, '../public/uploads/business-profile');

// Ensure directory exists with error handling
const ensureUploadDirExists = () => {
    try {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
            console.log(`Created upload directory: ${uploadDir}`);
        }
    } catch (err) {
        console.error('Directory creation failed:', err);
        throw new Error('Failed to initialize upload directory');
    }
};

// Initialize on startup
ensureUploadDirExists();

exports.uploadToLocal = async(fileBuffer, originalname) => {
    try {
        ensureUploadDirExists(); // Verify on each upload

        const fileExt = path.extname(originalname).toLowerCase();
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.promises.writeFile(filePath, fileBuffer);
        console.log(`File saved to: ${filePath}`);

        return `/uploads/business-profile/${fileName}`;
    } catch (error) {
        console.error('File save error:', error);
        throw error;
    }
};