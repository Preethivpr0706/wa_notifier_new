const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/ContactController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for CSV files
    }
});

// Contact list routes
router.post('/lists', ContactController.createList);
router.get('/lists', ContactController.getLists);
router.get('/sendLists', ContactController.getSendingLists);

// IMPORTANT: Put specific routes BEFORE parameterized routes
router.get('/check-list-name', ContactController.checkListNameAvailability);
router.post('/import', upload.single('csvFile'), ContactController.importContacts);
router.get('/user-contacts', async(req, res) => {
    try {
        const contacts = await ContactController.getAllByUser(1); //userid
        res.json({
            success: true,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user contacts'
        });
    }
});

// Contact routes - PUT PARAMETERIZED ROUTES LAST
router.post('/', ContactController.createContact);
router.get('/', ContactController.getContacts);
router.get('/:id', ContactController.getContactById); // This should be AFTER specific routes
router.put('/:id', ContactController.updateContact);
router.delete('/:id', ContactController.deleteContact);

module.exports = router;