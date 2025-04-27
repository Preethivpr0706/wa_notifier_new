// models/campaignModel.js
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Campaign {
  // Create a new campaign
  static async create(campaignData, userId) {
    const {
      name,
      templateId,
      status = 'draft',
      scheduledAt = null
    } = campaignData;
    
    const id = uuidv4();
    
    const [result] = await pool.execute(
      `INSERT INTO campaigns (
        id, name, template_id, status, scheduled_at, user_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, templateId, status, scheduledAt, userId]
    );
    
    return {
      id,
      name,
      templateId,
      status,
      scheduledAt,
      userId,
      recipientCount: 0,
      deliveredCount: 0,
      readCount: 0
    };
  }
  
  // Get all campaigns for a user
  static async getAllByUser(userId, filters = {}) {
    const queryParams = [userId];
    let filterQuery = '';
    
    if (filters.status) {
      filterQuery = ' AND status = ?';
      queryParams.push(filters.status);
    }
    
    if (filters.templateId) {
      filterQuery += ' AND template_id = ?';
      queryParams.push(filters.templateId);
    }
    
    const [campaigns] = await pool.execute(
      `SELECT c.*, t.name as template_name
       FROM campaigns c
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.user_id = ?${filterQuery}
       ORDER BY c.created_at DESC`,
      queryParams
    );
    
    return campaigns;
  }
  
  // Get campaign by ID
  static async getById(campaignId, userId) {
    const [campaigns] = await pool.execute(
      `SELECT c.*, t.name as template_name, t.body_text, t.header_type, t.header_content
       FROM campaigns c
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.id = ? AND c.user_id = ?`,
      [campaignId, userId]
    );
    
    if (campaigns.length === 0) {
      return null;
    }
    
    return campaigns[0];
  }
  
  // Update campaign
  static async update(campaignId, campaignData, userId) {
    const {
      name,
      templateId,
      status,
      scheduledAt
    } = campaignData;
    
    // Verify campaign exists and belongs to user
    const [campaigns] = await pool.execute(
      'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
      [campaignId, userId]
    );
    
    if (campaigns.length === 0) {
      throw new Error('Campaign not found or not authorized');
    }
    
    // Update campaign
    const [result] = await pool.execute(
      `UPDATE campaigns SET
        name = ?,
        template_id = ?,
        status = ?,
        scheduled_at = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, templateId, status, scheduledAt, campaignId]
    );
    
    return {
      id: campaignId,
      ...campaignData
    };
  }
  
  // Delete campaign
  static async delete(campaignId, userId) {
    // Verify campaign exists and belongs to user
    const [campaigns] = await pool.execute(
      'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
      [campaignId, userId]
    );
    
    if (campaigns.length === 0) {
      throw new Error('Campaign not found or not authorized');
    }
    
    const [result] = await pool.execute(
      'DELETE FROM campaigns WHERE id = ?',
      [campaignId]
    );
    
    return result.affectedRows > 0;
  }
  
  // Schedule campaign
  static async schedule(campaignId, scheduledAt, userId) {
    // Verify campaign exists and belongs to user
    const [campaigns] = await pool.execute(
      'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
      [campaignId, userId]
    );
    
    if (campaigns.length === 0) {
      throw new Error('Campaign not found or not authorized');
    }
    
    const [result] = await pool.execute(
      `UPDATE campaigns SET
        status = 'scheduled',
        scheduled_at = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [scheduledAt, campaignId]
    );
    
    return result.affectedRows > 0;
  }
  
  // Update campaign statistics
  static async updateStats(campaignId, stats) {
    const {
      recipientCount,
      deliveredCount,
      readCount
    } = stats;
    
    const [result] = await pool.execute(
      `UPDATE campaigns SET
        recipient_count = ?,
        delivered_count = ?,
        read_count = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [recipientCount, deliveredCount, readCount, campaignId]
    );
    
    return result.affectedRows > 0;
  }
}

module.exports = Campaign;