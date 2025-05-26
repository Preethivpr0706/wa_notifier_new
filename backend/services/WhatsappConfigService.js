// services/whatsappConfigService.js
const { pool } = require('../config/database');

class WhatsappConfigService {
    static async getConfigForBusiness(businessId) {
        const [settings] = await pool.execute(
            'SELECT * FROM business_settings WHERE business_id = ?', [businessId]
        );
        return settings[0];
    }

    static async getConfigForUser(userId) {
        const [settings] = await pool.execute(
            `SELECT bs.* 
             FROM business_settings bs
             JOIN users u ON u.business_id = bs.business_id
             WHERE u.id = ?`, [userId]
        );
        return settings[0];
    }
}

module.exports = WhatsappConfigService;