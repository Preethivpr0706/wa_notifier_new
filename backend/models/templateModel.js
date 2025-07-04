// models/templateModel.js
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Template {
    // Create a new template
    static async create(templateData, userId, businessId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const validHeaderTypes = ['text', 'image', 'video', 'document'];
            if (!validHeaderTypes.includes(templateData.headerType)) {
                throw new Error('Invalid header type');
            }
            console.log(businessId);
            const templateId = uuidv4();
            const {
                name,
                category,
                language,
                headerType,
                headerContent,
                bodyText,
                footerText,
                buttons = [],
                status = 'pending'
            } = templateData;
            // Insert template
            await connection.execute(
                `INSERT INTO templates (
                id, name, category, language, header_type, header_content, 
                body_text, footer_text, status, user_id, variables, business_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`, [
                    templateId, name, category, language, headerType, headerContent,
                    bodyText, footerText, status, userId, templateData.variables, businessId
                ]
            );

            // Insert buttons if any
            if (buttons && buttons.length > 0) {
                for (let i = 0; i < buttons.length; i++) {
                    const button = buttons[i];
                    await connection.execute(
                        `INSERT INTO template_buttons (
              id, template_id, type, text, value, button_order
            ) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), templateId, button.type, button.text, button.value, i]
                    );
                }
            }

            await connection.commit();
            return { id: templateId, ...templateData };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get template by ID
    static async getById(templateId, userId) {
        const [templates] = await pool.execute(
            `SELECT * FROM templates WHERE id = ? AND user_id = ?`, [templateId, userId]
        );

        if (templates.length === 0) {
            return null;
        }

        const template = templates[0];

        // Parse variables JSON if exists
        let variables = {};
        try {
            variables = template.variables ? JSON.parse(template.variables) : {};
        } catch (e) {
            console.error('Error parsing variables:', e);
        }

        // Get buttons
        const [buttons] = await pool.execute(
            `SELECT id, type, text, value, button_order 
       FROM template_buttons 
       WHERE template_id = ? 
       ORDER BY button_order ASC`, [templateId]
        );

        return {
            ...template,
            variables,
            buttons: buttons.map(button => ({
                id: button.id,
                type: button.type,
                text: button.text,
                value: button.value,
                order: button.button_order
            }))
        };
    }

    // Get all templates for a user
    static async getAllByUser(userId, filters = {}) {
        const queryParams = [userId];
        let filterQuery = '';

        if (filters.status) {
            filterQuery = ' AND t.status = ?';
            queryParams.push(filters.status);
        }

        if (filters.category) {
            filterQuery += ' AND t.category = ?';
            queryParams.push(filters.category);
        }

        const [templates] = await pool.execute(
            `SELECT t.*, 
         GROUP_CONCAT(
             JSON_OBJECT(
                 'id', tb.id,
                 'type', tb.type,
                 'text', tb.text,
                 'value', tb.value,
                 'button_order', tb.button_order
             )
         ) as buttons
         FROM templates t
         LEFT JOIN template_buttons tb ON t.id = tb.template_id
         WHERE t.user_id = ?${filterQuery}
         GROUP BY t.id
         ORDER BY t.created_at DESC`,
            queryParams
        );

        // Parse the buttons string into JSON for each template
        return templates.map(template => ({
            ...template,
            buttons: template.buttons ?
                JSON.parse(`[${template.buttons}]`.replace(/\}\,\{/g, '},{')) : []
        }));
    }


    // Update a template
    static async update(templateId, templateData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Update main template data
            const updateQuery = `
                UPDATE templates 
                SET name = ?, 
                    category = ?, 
                    language = ?, 
                    header_type = ?, 
                    header_content = ?, 
                    body_text = ?, 
                    footer_text = ?,
                    variables = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `;

            await connection.execute(updateQuery, [
                templateData.name,
                templateData.category,
                templateData.language,
                templateData.headerType || 'none',
                templateData.headerContent,
                templateData.bodyText,
                templateData.footerText,
                JSON.stringify(templateData.variableSamples || {}),
                templateId,
                templateData.user_id
            ]);

            // Update buttons
            if (templateData.buttons) {
                // Delete existing buttons
                await connection.execute(
                    'DELETE FROM template_buttons WHERE template_id = ?', [templateId]
                );
                // Insert new buttons
                for (let i = 0; i < templateData.buttons.length; i++) {
                    const button = templateData.buttons[i];
                    console.log(templateId, button.type, button.text, button.value, i);
                    await connection.execute(
                        `INSERT INTO template_buttons (
              id, template_id, type, text, value, button_order
            ) VALUES (?, ?, ?, ?, ?, ?)`, [uuidv4(), templateId, button.type, button.text, button.value, i]
                    );
                }
            }

            await connection.commit();

            // Return updated template
            return await this.getById(templateId, templateData.user_id);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Delete a template
    static async delete(templateId, userId) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Check if template exists and belongs to user
                const [templates] = await connection.execute(
                    'SELECT id FROM templates WHERE id = ? AND user_id = ?', [templateId, userId]
                );

                if (templates.length === 0) {
                    throw new Error('Template not found or not authorized');
                }

                // Delete buttons first
                await connection.execute(
                    'DELETE FROM template_buttons WHERE template_id = ?', [templateId]
                );

                // Delete template
                const [result] = await connection.execute(
                    'DELETE FROM templates WHERE id = ?', [templateId]
                );

                await connection.commit();
                return result.affectedRows > 0;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        // Submit template for approval
    static async submitForApproval(templateId, userId) {
        const [result] = await pool.execute(
            `UPDATE templates SET status = 'pending', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`, [templateId, userId]
        );

        return result.affectedRows > 0;
    }

    // Save template as draft
    static async saveAsDraft(templateData, userId, businessId) {
        const templateWithStatus = {
            ...templateData,
            status: 'draft'
        };

        if (templateData.id) {
            // Update existing draft
            return await this.update(templateData.id, templateWithStatus, userId);
        } else {
            // Create new draft
            return await this.create(templateWithStatus, userId, businessId);
        }
    }

    static async updateStatus(templateId, status, additionalData = {}, userId) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                // Ensure all values are defined, replace undefined with null
                const updateData = {
                    status,
                    ...Object.fromEntries(
                        Object.entries(additionalData).map(([key, value]) => [key, value !== undefined ? value : null])
                    )
                };

                const columns = Object.keys(updateData);
                const values = Object.values(updateData);

                const query = `
                UPDATE templates 
                SET ${columns.map(col => `${col} = ?`).join(', ')},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
    
            await connection.execute(query, [...values, templateId]);
            await connection.commit();
            
            // Return the updated template
            return await this.getById(templateId, additionalData.user_id || userId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
      // Add method to get templates that need status update
      static async getPendingTemplates(userId) {
        const [templates] = await pool.execute(
          `SELECT * FROM templates 
           WHERE user_id = ? AND status = 'pending'
           ORDER BY created_at DESC`,
          [userId]
        );
        return templates;
      }
    // In the updateStatus method, ensure it handles the whatsapp_id update
static async updateStatus(templateId, status, additionalData = {},userId) {
    console.log(templateId, status, additionalData);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      const updateData = {
        status,
        ...additionalData
      };
  
      // Handle whatsapp_id specifically
      if (additionalData.whatsapp_id) {
        updateData.whatsapp_id = additionalData.whatsapp_id;
      }
  
      const columns = Object.keys(updateData);
      const values = Object.values(updateData);
  
      const query = `
        UPDATE templates 
        SET ${columns.map(col => `${col} = ?`).join(', ')},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
  
      await connection.execute(query, [...values, templateId]);
      await connection.commit();
      
      return await this.getById(templateId, additionalData.user_id || userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  // In models/templateModel.js
  static async getByIdForSending(templateId, userId) {
    // First get the basic template data using the existing method
    const template = await this.getById(templateId, userId);
    if (!template) return null;

    // Handle variables - they might be a string or already an object
    let variables = {};
    if (template.variables) {
        try {
            variables = typeof template.variables === 'string' 
                ? JSON.parse(template.variables) 
                : template.variables;
        } catch (e) {
            console.error('Error parsing template variables:', e);
            variables = {};
        }
    }

    // Build the components array that WhatsApp expects
    const components = [];
    
    // Header component
    if (template.header_type && template.header_content) {
        components.push({
            type: 'HEADER',
            format: template.header_type.toUpperCase(),
            text: template.header_type === 'text' ? template.header_content : undefined,
            example: template.header_type !== 'text' ? {
                header_handle: [template.header_content]
            } : undefined
        });
    }
    
    // Body component
    if (template.body_text) {
        components.push({
            type: 'BODY',
            text: template.body_text,
            example: Object.keys(variables).length > 0 ? {
                body_text: [Object.values(variables)]
            } : undefined
        });
    }
    
    // Footer component
    if (template.footer_text) {
        components.push({
            type: 'FOOTER',
            text: template.footer_text
        });
    }
    
    // Buttons component
    if (template.buttons && template.buttons.length > 0) {
        components.push({
            type: 'BUTTONS',
            buttons: template.buttons.map(button => ({
                type: button.type.toUpperCase(),
                text: button.text,
                ...(button.type === 'phone_number' && { phone_number: button.value }),
                ...(button.type === 'url' && { url: button.value })
            }))
        });
    }

    return {
        ...template,
        components,
        whatsapp_id: template.whatsapp_id || template.whatsappId,
        variables
    };
}
// In templateModel.js
// models/templateModel.js
static async updateMediaId(templateId, mediaId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `UPDATE templates 
             SET header_content = ?, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [mediaId, templateId]
        );

        await connection.commit();
        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
}

module.exports = Template;