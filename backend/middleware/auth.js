// middleware/auth.js
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

/**
 * Authentication middleware for Express
 */
exports.authenticate = async(req, res, next) => {
    // 1. Check for Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }

    // 2. Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Malformed token.',
            code: 'MALFORMED_TOKEN'
        });
    }

    try {
        // 3. Verify token and check expiry
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            ignoreExpiration: false // Explicitly check for expiry
        });

        // 4. Check if token was issued before password change (if you implement this feature)
        // This requires storing token issuance time in your users table
        // const tokenIssuedAt = new Date(decoded.iat * 1000);
        // if (user.passwordChangedAt && tokenIssuedAt < user.passwordChangedAt) {
        //   return res.status(401).json({
        //     success: false,
        //     message: 'Token invalidated by password change',
        //     code: 'PASSWORD_CHANGED'
        //   });
        // }

        // 5. Get user and business details
        const [users] = await pool.execute(
            `SELECT u.*, b.whatsapp_api_token, b.whatsapp_business_account_id,
      b.whatsapp_phone_number_id, b.facebook_app_id, b.webhook_verify_token
      FROM users u
      JOIN business_settings b ON u.business_id = b.id
      WHERE u.id = ?`, [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = users[0];

        // 6. Add user and business context to request
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            businessId: user.business_id
        };

        req.business = {
            whatsappApiToken: user.whatsapp_api_token,
            whatsappBusinessAccountId: user.whatsapp_business_account_id,
            whatsappPhoneNumberId: user.whatsapp_phone_number_id,
            facebookAppId: user.facebook_app_id,
            webhookVerifyToken: user.webhook_verify_token
        };

        // 7. Continue to the next middleware/route handler
        next();
    } catch (error) {
        let statusCode = 401;
        let message = 'Invalid token';
        let code = 'INVALID_TOKEN';

        if (error.name === 'TokenExpiredError') {
            message = 'Token expired';
            code = 'TOKEN_EXPIRED';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Malformed token';
            code = 'MALFORMED_TOKEN';
        } else {
            statusCode = 500;
            message = 'Authentication error';
            code = 'AUTH_ERROR';
            console.error('Authentication middleware error:', error);
        }

        return res.status(statusCode).json({
            success: false,
            message,
            code,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Role-based authorization middleware
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to perform this action',
                code: 'UNAUTHORIZED_ACTION'
            });
        }
        next();
    };
};

/**
 * Generate JWT token
 */
exports.generateToken = (userId) => {
    return jwt.sign({ id: userId },
        process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || '2h'
        }
    );
};

/**
 * Verify token without database lookup (for lightweight checks)
 */
exports.verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};