// services/UrlTrackingService.js
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const crypto = require('crypto');

class UrlTrackingService {
    /* static async getOrCreateTrackingUrl(templateId, originalUrl) {
         const connection = await pool.getConnection();
         try {
             await connection.beginTransaction();

             // Check if we already have this URL for this template
             const [existing] = await connection.execute(
                 `SELECT id FROM tracked_urls 
                  WHERE template_id = ? AND original_url = ?`, [templateId, originalUrl]
             );

             if (existing.length > 0) {
                 await connection.commit();
                 // Return URL with variable placeholder for campaign ID
                 return `${process.env.BASE_URL}/redirect/${existing[0].id}?campaign_id={{1}}`;
             }

             // Create new tracking URL
             const trackingId = uuidv4();
             await connection.execute(
                 `INSERT INTO tracked_urls 
                  (id, template_id, original_url) 
                  VALUES (?, ?, ?)`, [trackingId, templateId, originalUrl]
             );

             await connection.commit();
             // Return URL with variable placeholder for campaign ID
             return `${process.env.BASE_URL}/redirect/${trackingId}?campaign_id={{1}}`;
         } catch (error) {
             await connection.rollback();
             throw error;
         } finally {
             connection.release();
         }
     } */ //production


    //dev
    static getDevTrackingUrl(trackingId) {
        // Use a publicly accessible test URL or a service like ngrok
        if (process.env.NGROK_URL) {
            return `${process.env.NGROK_URL}/redirect/${trackingId}?campaign_id={{1}}`;
        }

        // Fallback to a test domain that points to your localhost
        return `${process.env.BASE_URL}/redirect/${trackingId}?campaign_id={{1}}`;
    }
    static async getOrCreateTrackingUrl(templateId, originalUrl, isProduction = false) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if we already have this URL for this template
            const [existing] = await connection.execute(
                `SELECT id FROM tracked_urls 
                 WHERE template_id = ? AND original_url = ?`, [templateId, originalUrl]
            );

            if (existing.length > 0) {
                await connection.commit();
                return isProduction ?
                    `${process.env.BASE_URL}/redirect/${existing[0].id}?campaign_id={{1}}` :
                    this.getDevTrackingUrl(existing[0].id);
            }

            // Create new tracking URL
            const trackingId = uuidv4();
            await connection.execute(
                `INSERT INTO tracked_urls 
                 (id, template_id, original_url) 
                 VALUES (?, ?, ?)`, [trackingId, templateId, originalUrl]
            );

            await connection.commit();
            return isProduction ?
                `${process.env.BASE_URL}/redirect/${trackingId}?campaign_id={{1}}` :
                this.getDevTrackingUrl(trackingId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }


    static async handleRedirect(trackingId, campaignId, res) {
        const connection = await pool.getConnection();
        try {
            // await connection.beginTransaction();
            console.log(trackingId)
                // Get the original URL
            const [urls] = await pool.execute(
                `SELECT * FROM tracked_urls 
                 WHERE id = ?`, [trackingId]
            );
            console.log(urls)

            if (urls.length < 1) {
                throw new Error('Tracking URL not found');
            }

            const originalUrl = urls[0].original_url;

            // Record the click
            await connection.execute(
                `INSERT INTO url_clicks 
                 (id, tracked_url_id, campaign_id) 
                 VALUES (?, ?, ?)`, [uuidv4(), trackingId, campaignId]
            );

            await connection.commit();
            console.log(await UrlTrackingService.getClickStats(urls[0].template_id, campaignId));
            // Redirect to the original URL
            res.redirect(originalUrl);
        } catch (error) {
            await connection.rollback();
            console.error('Redirect error:', error);
            res.status(404).send('URL not found');
        } finally {
            connection.release();
        }
    }

    static async getClickStats(templateId, campaignId = null) {
        const connection = await pool.getConnection();
        try {
            let query = `
                SELECT 
                    tu.original_url,
                    COUNT(uc.id) as click_count
                FROM tracked_urls tu
                LEFT JOIN url_clicks uc ON tu.id = uc.tracked_url_id
                WHERE tu.template_id = ?
            `;

            const params = [templateId];

            if (campaignId) {
                query += ' AND uc.campaign_id = ?';
                params.push(campaignId);
            }

            query += ' GROUP BY tu.original_url ORDER BY click_count DESC';

            const [results] = await connection.execute(query, params);
            return results;
        } finally {
            connection.release();
        }
    }

}

module.exports = UrlTrackingService;