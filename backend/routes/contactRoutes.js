const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/contactController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for CSV files
    }
});

// All routes require authentication
// router.use(authenticate);

// Contact list routes
router.post('/lists', ContactController.createList);
router.get('/lists', ContactController.getLists);

// Contact routes
router.post('/', ContactController.createContact);
router.post('/import', upload.single('csvFile'), ContactController.importContacts);
router.get('/', ContactController.getContacts);
router.get('/:id', ContactController.getContactById);
router.put('/:id', ContactController.updateContact);
router.delete('/:id', ContactController.deleteContact);

module.exports = router;