const { pool } = require('../config/database');
const Papa = require('papaparse');

class ContactController {
    // Create a new contact list
    static async createList(req, res) {
        try {
            const { name } = req.body;
            const userId = req.user.id;

            if (!name) {
                return res.status(400).json({ success: false, message: 'List name is required' });
            }

            const [result] = await pool.execute(
                'INSERT INTO contact_lists (name, user_id) VALUES (?, ?)', [name, userId]
            );

            res.status(201).json({
                success: true,
                message: 'Contact list created successfully',
                data: { id: result.insertId, name }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'A list with this name already exists' });
            }
            console.error('Error creating contact list:', error);
            res.status(500).json({ success: false, message: 'Failed to create contact list' });
        }
    }

    // Get all contact lists for user
    static async getLists(req, res) {
        try {
            const userId = req.user.id;

            const [lists] = await pool.execute(
                'SELECT id, name FROM contact_lists WHERE user_id = ? ORDER BY created_at DESC', [userId]
            );

            res.json({
                success: true,
                data: lists
            });
        } catch (error) {
            console.error('Error fetching contact lists:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch contact lists' });
        }
    }

    // Create a new contact
    static async createContact(req, res) {
        try {
            const { fname, lname, wanumber, email, listId, newListName } = req.body;
            const userId = req.user.id;

            // Validate required fields
            if (!wanumber) {
                return res.status(400).json({ success: false, message: 'WhatsApp number is required' });
            }

            let finalListId = listId;

            // Create new list if requested
            if (newListName) {
                const [listResult] = await pool.execute(
                    'INSERT INTO contact_lists (name, user_id) VALUES (?, ?)', [newListName, userId]
                );
                finalListId = listResult.insertId;
            } else if (!listId) {
                return res.status(400).json({ success: false, message: 'List ID or new list name is required' });
            }

            // Insert contact
            const [result] = await pool.execute(
                'INSERT INTO contacts (fname, lname, wanumber, email, list_id) VALUES (?, ?, ?, ?, ?)', [fname, lname, wanumber, email, finalListId]
            );

            res.status(201).json({
                success: true,
                message: 'Contact created successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'This WhatsApp number already exists in the selected list' });
            }
            console.error('Error creating contact:', error);
            res.status(500).json({ success: false, message: 'Failed to create contact' });
        }
    }

    // Import contacts from CSV
    static async importContacts(req, res) {
        try {
            const { listName } = req.body;
            const userId = req.user.id;

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'CSV file is required' });
            }

            if (!listName) {
                return res.status(400).json({ success: false, message: 'List name is required' });
            }

            const csvData = req.file.buffer.toString('utf8');
            const parsed = Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true
            });

            if (parsed.errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV parsing error',
                    errors: parsed.errors
                });
            }

            const validationResult = ContactController.validateCSVData(parsed.data);
            if (validationResult.errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV validation failed',
                    errors: validationResult.errors
                });
            }

            // Create the contact list and get its UUID
            const [listResult] = await pool.execute(
                'INSERT INTO contact_lists (name, user_id) VALUES (?, ?)', [listName, userId]
            );

            // Get the inserted list's UUID
            const [lists] = await pool.execute(
                'SELECT id FROM contact_lists WHERE name = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1', [listName, userId]
            );

            if (lists.length === 0) {
                throw new Error('Failed to retrieve created contact list');
            }

            const listId = lists[0].id;

            // Prepare batch insert
            const contacts = validationResult.validData.map(contact => [
                contact.fname,
                contact.lname,
                contact.wanumber,
                contact.email,
                listId // Use the actual UUID
            ]);

            // Batch insert contacts
            await pool.query(
                'INSERT INTO contacts (fname, lname, wanumber, email, list_id) VALUES ?', [contacts]
            );

            res.json({
                success: true,
                message: `Successfully imported ${contacts.length} contacts`,
                data: { listId, count: contacts.length }
            });
        } catch (error) {
            console.error('Error importing contacts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to import contacts',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // FIX: Proper static method definition
    static validateCSVData(data) {
        const errors = [];
        const validData = [];
        const seenNumbers = new Set();

        if (!data || data.length === 0) {
            errors.push('CSV file is empty or contains no valid data');
            return { errors, validData };
        }

        // Check if wanumber column exists
        if (!data[0].hasOwnProperty('wanumber')) {
            errors.push('CSV must contain a "wanumber" column');
            return { errors, validData };
        }

        data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 because header is row 1 and array is 0-based

            // Validate WhatsApp number
            const waNumber = row.wanumber ? row.wanumber.toString().trim() : null;
            if (!waNumber) {
                errors.push(`Row ${rowNumber}: WhatsApp number is required`);
                return;
            }

            // Validate number format (basic check)
            const isValidNumber = /^(\+|\d)[0-9]{7,15}$/.test(waNumber);
            if (!isValidNumber) {
                errors.push(`Row ${rowNumber}: Invalid WhatsApp number format`);
                return;
            }

            // Check for duplicates in this batch
            if (seenNumbers.has(waNumber)) {
                errors.push(`Row ${rowNumber}: Duplicate WhatsApp number found in CSV`);
                return;
            }
            seenNumbers.add(waNumber);

            // Prepare valid data
            validData.push({
                fname: row.fname || '',
                lname: row.lname || '',
                wanumber: waNumber,
                email: row.email || ''
            });
        });

        return { errors, validData };
    }

    // Get contacts with optional list filter
    static async getContacts(req, res) {
        try {
            const { listId } = req.query;
            const userId = req.user.id;

            let query = `
                SELECT c.id, c.fname, c.lname, c.wanumber, c.email, c.list_id, l.name as list_name
                FROM contacts c
                JOIN contact_lists l ON c.list_id = l.id
                WHERE l.user_id = ?
            `;
            const params = [userId];

            if (listId) {
                query += ' AND c.list_id = ?';
                params.push(listId);
            }

            query += ' ORDER BY c.created_at DESC';

            const [contacts] = await pool.execute(query, params);

            res.json({
                success: true,
                data: contacts
            });
        } catch (error) {
            console.error('Error fetching contacts:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
        }
    }

    // Get single contact by ID
    static async getContactById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const [contacts] = await pool.execute(
                `SELECT c.id, c.fname, c.lname, c.wanumber, c.email, c.list_id, l.name as list_name
                FROM contacts c
                JOIN contact_lists l ON c.list_id = l.id
                WHERE c.id = ? AND l.user_id = ?`, [id, userId]
            );

            if (contacts.length === 0) {
                return res.status(404).json({ success: false, message: 'Contact not found' });
            }

            res.json({
                success: true,
                data: contacts[0]
            });
        } catch (error) {
            console.error('Error fetching contact:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch contact' });
        }
    }

    // Update contact
    static async updateContact(req, res) {
        try {
            const { id } = req.params;
            const { fname, lname, wanumber, email, listId } = req.body;
            const userId = req.user.id;

            // First verify the contact exists and belongs to user
            const [existing] = await pool.execute(
                `SELECT c.id FROM contacts c
                JOIN contact_lists l ON c.list_id = l.id
                WHERE c.id = ? AND l.user_id = ?`, [id, userId]
            );

            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Contact not found' });
            }

            // Update contact
            await pool.execute(
                'UPDATE contacts SET fname = ?, lname = ?, wanumber = ?, email = ?, list_id = ? WHERE id = ?', [fname, lname, wanumber, email, listId, id]
            );

            res.json({
                success: true,
                message: 'Contact updated successfully'
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'This WhatsApp number already exists in the selected list' });
            }
            console.error('Error updating contact:', error);
            res.status(500).json({ success: false, message: 'Failed to update contact' });
        }
    }

    // Delete contact
    static async deleteContact(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // First verify the contact exists and belongs to user
            const [existing] = await pool.execute(
                `SELECT c.id FROM contacts c
                JOIN contact_lists l ON c.list_id = l.id
                WHERE c.id = ? AND l.user_id = ?`, [id, userId]
            );

            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Contact not found' });
            }

            await pool.execute('DELETE FROM contacts WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Contact deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting contact:', error);
            res.status(500).json({ success: false, message: 'Failed to delete contact' });
        }
    }
    static async getAllByUser(userId) {
        const [contacts] = await pool.execute(
            `SELECT 
                c.id, c.fname, c.lname, c.wanumber, c.email, 
                c.list_id as listId, l.name as list_name
            FROM contacts c
            JOIN contact_lists l ON c.list_id = l.id
            WHERE l.user_id = ?
            ORDER BY c.created_at DESC`, [userId]
        );
        return contacts;
    }
    static async getByList(listId, userId) {
        const [contacts] = await pool.execute(
            `SELECT c.id, c.fname, c.lname, c.wanumber, c.email
           FROM contacts c
           JOIN contact_lists l ON c.list_id = l.id
           WHERE l.id = ? AND l.user_id = ?
           ORDER BY c.created_at DESC`, [listId, userId]
        );
        return contacts;
    }
    static async getSendingLists(req, res) {
            try {
                const userId = req.user.id;

                const [lists] = await pool.execute(
                    `SELECT cl.id, cl.name, COUNT(c.id) as contactCount 
       FROM contact_lists cl
       LEFT JOIN contacts c ON cl.id = c.list_id
       WHERE cl.user_id = ?
       GROUP BY cl.id, cl.name
       ORDER BY cl.created_at DESC`, [userId]
                );

                res.json({
                    success: true,
                    data: lists
                });
            } catch (error) {
                console.error('Error fetching sending lists:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch contact lists for sending'
                });
            }
        }
        // Add this method to ContactController
    static async checkListNameAvailability(req, res) {
        console.log("list function called")
        try {
            const { listName } = req.query;
            const userId = req.user.id;

            if (!listName) {
                return res.status(400).json({
                    success: false,
                    message: 'List name is required'
                });
            }

            const [existing] = await pool.execute(
                'SELECT id FROM contact_lists WHERE name = ? AND user_id = ?', [listName.trim(), userId]
            );

            res.json({
                success: true,
                available: existing.length === 0,
                message: existing.length > 0 ? 'List name already exists' : 'List name is available'
            });
        } catch (error) {
            console.error('Error checking list name availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check list name availability'
            });
        }
    }

}


module.exports = ContactController;