const express = require('express');
const router = express.Router();
const BusinessController = require('../controllers/businessController');
const upload = require('../config/multerConfig');

// Get business details
router.get('/', BusinessController.getBusinessDetails);

// Update business details
router.put('/', BusinessController.updateBusinessDetails);

// Upload business profile image
router.post(
    '/upload-profile-image',
    upload.single('profileImage'),
    BusinessController.uploadProfileImage
);

module.exports = router;