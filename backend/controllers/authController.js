// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

class AuthController {
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Get user from database
            const [users] = await pool.execute(
                'SELECT id, email, name, password, business_id FROM users WHERE email = ?', [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = users[0];

            // Verify password
            const validPassword = (password == user.password) ? true : false;
            // const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Create token with user data
            const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    businessId: user.business_id
                },
                process.env.JWT_SECRET, { expiresIn: '24h' }
            );

            // Remove password from user object
            delete user.password;

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        businessId: user.business_id
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    static async logout(req, res) {
        try {
            // You can add any cleanup needed here
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to logout'
            });
        }
    }
}

module.exports = AuthController;