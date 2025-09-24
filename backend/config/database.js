// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

// Reuse the pool across hot reloads / serverless invocations
if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'whatsapp_templates',
        waitForConnections: true,
        connectionLimit: 5, // <= match Clever Cloud’s max_user_connections
        queueLimit: 0
    });
}

pool = global._mysqlPool;

// Test the database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};