// controllers/dashboardController.js
const { pool } = require('../config/database');

class DashboardController {
    static async getStats(req, res) {
        const connection = await pool.getConnection();
        try {
            const userId = req.user.id;
            const businessId = req.user.businessId;

            // Get campaign stats (keep existing)
            const [campaignStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_campaigns,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_campaigns,
                SUM(recipient_count) as total_messages,
                SUM(delivered_count) as delivered_messages,
                SUM(failed_count) as failed_messages
            FROM campaigns 
            WHERE business_id = ?
        `, [businessId]);

            // Get template stats (keep existing)
            const [templateStats] = await connection.execute(`
            SELECT COUNT(*) as total_templates
            FROM templates 
            WHERE business_id = ?
        `, [businessId]);

            // Get message delivery stats for current period
            const [currentMessageStats] = await connection.execute(`
            SELECT 
                SUM(delivered_count) as delivered_messages,
                SUM(failed_count) as failed_messages
            FROM campaigns 
            WHERE business_id = ? 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [businessId]);

            // Get message delivery stats for previous period
            const [previousMessageStats] = await connection.execute(`
            SELECT 
                SUM(delivered_count) as delivered_messages,
                SUM(failed_count) as failed_messages
            FROM campaigns 
            WHERE business_id = ? 
            AND created_at BETWEEN DATE_SUB(NOW(), INTERVAL 60 DAY) AND DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [businessId]);

            // Keep existing growth calculation
            const [growth] = await connection.execute(`
            SELECT 
                (
                    SELECT COUNT(*) 
                    FROM campaigns 
                    WHERE business_id = ? 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ) as current_period_campaigns,
                (
                    SELECT COUNT(*) 
                    FROM campaigns 
                    WHERE business_id = ? 
                    AND created_at BETWEEN DATE_SUB(NOW(), INTERVAL 60 DAY) AND DATE_SUB(NOW(), INTERVAL 30 DAY)
                ) as previous_period_campaigns
        `, [businessId, businessId]);

            const stats = campaignStats[0];
            const templates = templateStats[0];
            const growthData = growth[0];
            const current = currentMessageStats[0];
            const previous = previousMessageStats[0];

            // Calculate existing growth rates
            const campaignGrowth = growthData.previous_period_campaigns > 0 ?
                ((growthData.current_period_campaigns - growthData.previous_period_campaigns) / growthData.previous_period_campaigns * 100).toFixed(1) :
                100;

            // Calculate success rate
            const successRate = stats.total_messages > 0 ?
                ((stats.delivered_messages / stats.total_messages) * 100).toFixed(1) :
                0;

            // Calculate delivery and failure rates
            const deliveryRate = stats.total_messages > 0 ?
                ((stats.delivered_messages / stats.total_messages) * 100).toFixed(1) :
                0;

            const failureRate = stats.total_messages > 0 ?
                ((stats.failed_messages / stats.total_messages) * 100).toFixed(1) :
                0;

            // Calculate growth rates for delivery and failure
            const calculateGrowth = (current, previous) => {
                if (!previous || previous === 0) return '+100%';
                const growth = ((current - previous) / previous) * 100;
                return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
            };

            res.json({
                success: true,
                data: {
                    // Existing stats
                    totalCampaigns: stats.total_campaigns || 0,
                    totalMessages: stats.total_messages || 0,
                    totalTemplates: templates.total_templates || 0,
                    successRate: successRate || 0,
                    campaignGrowth: `${campaignGrowth || 0}%`,
                    messageGrowth: '0%',
                    templateGrowth: '0%',
                    successRateChange: '0%',

                    // New delivery stats
                    deliveredMessages: stats.delivered_messages || 0,
                    deliveryRate: deliveryRate,
                    deliveryGrowth: calculateGrowth(current.delivered_messages, previous.delivered_messages),

                    // New failure stats
                    failedMessages: stats.failed_messages || 0,
                    failureRate: failureRate,
                    failureGrowth: calculateGrowth(current.failed_messages, previous.failed_messages)
                }
            });

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard statistics'
            });
        } finally {
            connection.release();
        }
    }


    static async getRecentCampaigns(req, res) {
        const connection = await pool.getConnection();
        try {
            const businessId = req.user.businessId;

            const [campaigns] = await connection.execute(`
                SELECT 
                    c.id,
                    c.name,
                    t.name as template,
                    c.recipient_count as recipients,
                    c.status,
                    CASE 
                        WHEN c.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN CONCAT(
                            HOUR(TIMEDIFF(NOW(), c.created_at)), ' hours ago'
                        )
                        ELSE DATE_FORMAT(c.created_at, '%d %b %Y')
                    END as date
                FROM campaigns c
                LEFT JOIN templates t ON c.template_id = t.id
                WHERE c.business_id = ?
                ORDER BY c.created_at DESC
                LIMIT 5
            `, [businessId]);

            res.json({
                success: true,
                data: campaigns
            });

        } catch (error) {
            console.error('Error fetching recent campaigns:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch recent campaigns'
            });
        } finally {
            connection.release();
        }
    }

    static async getTopTemplates(req, res) {
        const connection = await pool.getConnection();
        try {
            const businessId = req.user.businessId;

            const [templates] = await connection.execute(`
                SELECT 
                    t.id,
                    t.name,
                    t.category,
                    COUNT(m.id) as total_messages,
                    SUM(CASE WHEN m.status IN ('delivered', 'read') THEN 1 ELSE 0 END) as delivered_messages,
                    ROUND(
                        (SUM(CASE WHEN m.status IN ('delivered', 'read') THEN 1 ELSE 0 END) / COUNT(m.id)) * 100,
                        1
                    ) as delivery_rate
                FROM templates t
                LEFT JOIN campaigns c ON t.id = c.template_id
                LEFT JOIN messages m ON c.id = m.campaign_id
                WHERE t.business_id = ?
                GROUP BY t.id, t.name, t.category
                HAVING total_messages > 0
                ORDER BY delivery_rate DESC
                LIMIT 3
            `, [businessId]);

            res.json({
                success: true,
                data: templates.map(t => ({
                    name: t.name,
                    category: t.category,
                    deliveryRate: t.delivery_rate
                }))
            });

        } catch (error) {
            console.error('Error fetching top templates:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch top templates'
            });
        } finally {
            connection.release();
        }
    }

    static async getMessageStats(req, res) {
        const connection = await pool.getConnection();
        try {
            const businessId = req.user.businessId;
            const period = req.query.period || '30d';

            // Get overall message status counts - specify m.status
            const [statusCounts] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN m.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as messages_read,
                SUM(CASE WHEN m.status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN m.status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM messages m
            JOIN campaigns c ON m.campaign_id = c.id
            WHERE c.business_id = ?
            AND m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [businessId]);

            // Get daily message counts for timeline - specify m.status
            const [timeline] = await connection.execute(`
            SELECT 
                DATE(m.created_at) as date,
                COUNT(*) as sent,
                SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as messages_read
            FROM messages m
            JOIN campaigns c ON m.campaign_id = c.id
            WHERE c.business_id = ?
            AND m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(m.created_at)
            ORDER BY date
        `, [businessId]);

            // Rename the field back to 'read' in the response
            const responseData = {
                ...statusCounts[0],
                read: statusCounts[0].messages_read,
                replied: 0,
                timeline: timeline.map(day => ({
                    ...day,
                    read: day.messages_read
                }))
            };

            // Remove the messages_read property
            delete responseData.messages_read;
            timeline.forEach(day => delete day.messages_read);

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            console.error('Error fetching message stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch message statistics'
            });
        } finally {
            connection.release();
        }
    }


}

module.exports = DashboardController;