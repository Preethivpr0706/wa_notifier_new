// controllers/templateController.js
const Template = require('../models/templateModel');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsappConfigService = require('../services/WhatsappConfigService');
const UrlTrackingService = require('../services/UrlTrackingService');
const { pool } = require('../config/database');

class TemplateController {
    // Create a new template and submit for approval
    static async createTemplate(req, res) {
            try {
                const userId = req.user.id;
                const isProduction = process.env.NODE_ENV === 'production';

                const templateData = {
                    name: req.body.name,
                    category: req.body.category,
                    language: req.body.language,
                    headerType: req.body.headerType || 'text',
                    headerContent: req.body.headerText || req.body.headerContent,
                    bodyText: req.body.bodyText,
                    footerText: req.body.footerText,
                    buttons: req.body.buttons || [],
                    variables: JSON.stringify(req.body.variableSamples || {})
                };



                // Create template in database
                let template = await Template.create(templateData, userId, req.user.businessId);
                // Process buttons to replace URLs with tracking URLs
                if (templateData.buttons) {
                    for (const button of templateData.buttons) {
                        if (button.type === 'url') {
                            button.value = await UrlTrackingService.getOrCreateTrackingUrl(
                                template.id, // We don't have template ID yet
                                button.value,
                                isProduction
                            );
                        }
                    }
                }

                // Update tracking URLs with the actual template ID
                if (templateData.buttons) {
                    for (const button of templateData.buttons) {
                        if (button.type === 'url' && button.value.includes('/redirect/')) {
                            const trackingId = button.value.split('/redirect/')[1].split('?')[0];
                            await pool.execute(
                                `UPDATE tracked_urls 
                         SET template_id = ? 
                         WHERE id = ?`, [template.id, trackingId]
                            );
                        }
                    }
                }


                const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

                if (!businessConfig) {
                    throw new Error('Business configuration not found');
                }


                try {
                    // Submit to WhatsApp API
                    const whatsappResponse = await WhatsAppService.submitTemplate(template, businessConfig);

                    // Update our template with WhatsApp ID and status
                    template = await Template.updateStatus(
                        template.id,
                        'pending', // or 'approved' depending on WhatsApp response
                        {
                            whatsapp_id: whatsappResponse.id,
                            whatsapp_status: whatsappResponse.status
                        },
                        userId
                    );

                    res.status(201).json({
                        success: true,
                        message: 'Template submitted for approval',
                        data: {
                            template,
                            whatsappSubmissionId: whatsappResponse.id
                        }
                    });
                } catch (whatsappError) {
                    // Update template with failed status
                    await Template.updateStatus(template.id, 'failed', {
                        rejection_reason: whatsappError.message
                    }, userId);

                    res.status(201).json({
                        success: true,
                        message: 'Template saved but WhatsApp submission failed',
                        error: whatsappError.message,
                        data: { template }
                    });
                }
            } catch (error) {
                console.error('Error creating template:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create template',
                    error: error.message
                });
            }
        }
        // Save template as draft
    static async saveAsDraft(req, res) {
        try {
            const userId = req.user.id;
            const businessId = req.user.businessId;

            // Transform the request body
            const templateData = {
                name: req.body.name,
                category: req.body.category,
                language: req.body.language,
                headerType: req.body.headerType || 'text',
                headerContent: req.body.headerText || req.body.headerContent,
                bodyText: req.body.bodyText,
                footerText: req.body.footerText,
                buttons: req.body.buttons || [],
                id: req.body.id,
                variables: JSON.stringify(req.body.variableSamples || {}) // Include ID if updating existing draft
            };

            // Save as draft
            const template = await Template.saveAsDraft(templateData, userId, businessId);

            res.status(200).json({
                success: true,
                message: 'Template saved as draft',
                data: { template }
            });
        } catch (error) {
            console.error('Error saving draft:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save draft',
                error: error.message
            });
        }
    }

    // Get all templates
    static async getTemplates(req, res) {
        try {
            const defaultUserId = req.user.id;
            const { status, category } = req.query;
            const filters = {};
            if (status) filters.status = status;
            if (category) filters.category = category;

            let templates = await Template.getAllByUser(defaultUserId, filters);

            // Check and update status for pending templates
            templates = await Promise.all(templates.map(async(template) => {
                if (template.status === 'pending' && template.whatsapp_id) {
                    try {
                        const statusUpdate = await WhatsAppService.checkAndUpdateTemplateStatus(template, defaultUserId);
                        if (statusUpdate.status !== template.status) {
                            return await Template.updateStatus(template.id, statusUpdate.status, {
                                whatsapp_status: statusUpdate.whatsappStatus,
                                quality_score: statusUpdate.qualityScore || null,
                                rejection_reason: statusUpdate.rejectionReason || null
                            }, defaultUserId);
                        }
                    } catch (error) {
                        console.error(`Failed to update status for template ${template.id}:`, error);
                    }
                }
                return template;
            }));

            res.status(200).json({
                success: true,
                count: templates.length,
                data: { templates }
            });
        } catch (error) {
            console.error('Error getting templates:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get templates',
                error: error.message
            });
        }
    }

    // Get a template by ID
    static async getTemplateById(req, res) {
        try {
            const userId = req.user.id;
            const templateId = req.params.id;

            const template = await Template.getById(templateId, userId);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            res.status(200).json({
                success: true,
                data: { template }
            });
        } catch (error) {
            console.error('Error getting template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get template',
                error: error.message
            });
        }
    }

    // Update a template

    // In templateController.js - improved updateTemplate method 
    // Fixed updateTemplate method in templateController.js

    static async updateTemplate(req, res) {
        try {
            const userId = req.user.id;
            const templateId = req.params.id;
            const isProduction = process.env.NODE_ENV === 'production';


            // Ensure we have all required fields
            const templateData = {
                ...req.body,
                body_text: req.body.bodyText || req.body.body_text,
                footer_text: req.body.footerText || req.body.footer_text,
                header_content: req.body.headerContent || req.body.header_content,
                header_type: req.body.headerType || req.body.header_type
            };
            // Process buttons to replace URLs with tracking URLs
            if (templateData.buttons) {
                for (const button of templateData.buttons) {
                    if (button.type === 'url') {
                        button.value = await UrlTrackingService.getOrCreateTrackingUrl(
                            templateId,
                            button.value,
                            isProduction
                        );
                    }
                }
            }
            // Update tracking URLs with the actual template ID
            if (templateData.buttons) {
                for (const button of templateData.buttons) {
                    if (button.type === 'url' && button.value.includes('/redirect/')) {
                        const trackingId = button.value.split('/redirect/')[1].split('?')[0];
                        await pool.execute(
                            `UPDATE tracked_urls 
                         SET template_id = ? 
                         WHERE id = ?`, [templateId, trackingId]
                        );
                    }
                }
            }
            // 1. Get existing template
            const existingTemplate = await Template.getById(templateId, userId);
            if (!existingTemplate) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            // 2. Update in our database first
            const updatedTemplate = await Template.update(templateId, {
                ...templateData,
                user_id: userId,
                status: 'pending' // Reset status when updating
            });

            // 3. Handle WhatsApp submission if template exists in WhatsApp
            if (existingTemplate.whatsapp_id) {
                try {
                    console.log('Attempting to update WhatsApp template...');

                    const whatsappPayload = {
                        ...updatedTemplate,
                        bodyText: updatedTemplate.body_text,
                        footerText: updatedTemplate.footer_text,
                        headerContent: updatedTemplate.header_content,
                        headerType: updatedTemplate.header_type
                    };

                    // Pass the original template as the third parameter
                    const whatsappResponse = await WhatsAppService.updateTemplate(
                        existingTemplate.whatsapp_id,
                        whatsappPayload,
                        existingTemplate, // Pass original template for validation
                        userId
                    );

                    // Update the category in our database based on WhatsApp's response
                    if (whatsappResponse.category) {
                        await Template.update(templateId, {
                            category: whatsappResponse.category.toLowerCase(),
                            user_id: userId
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message: 'Template update submitted to WhatsApp',
                        data: {
                            template: updatedTemplate,
                            whatsappResponse
                        }
                    });
                } catch (whatsappError) {
                    return res.status(200).json({
                        success: true,
                        message: 'Template updated but WhatsApp submission failed',
                        warning: whatsappError.message,
                        data: { template: updatedTemplate }
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Template updated in database',
                data: { template: updatedTemplate }
            });

        } catch (error) {
            console.error('Error updating template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update template',
                error: error.message
            });
        }
    }

    static async deleteTemplate(req, res) {
        try {
            const userId = req.user.id;
            const templateId = req.params.id;

            // First get the template to check its WhatsApp status
            const template = await Template.getById(templateId, userId);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found or not authorized to delete'
                });
            }

            // Delete from WhatsApp API if it has a WhatsApp ID
            if (template.whatsapp_id) {
                try {
                    await WhatsAppService.deleteTemplate(
                        template.whatsapp_id,
                        template.name, // Pass the template name as second parameter
                        userId
                    );
                } catch (whatsappError) {
                    console.error('Failed to delete from WhatsApp API:', whatsappError);
                    // Continue with local deletion but track the WhatsApp failure
                    template.whatsappDeleteFailed = true;
                }
            }

            // Delete from our database
            const success = await Template.delete(templateId, userId);

            if (!success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete template from database'
                });
            }

            // Return appropriate message based on WhatsApp deletion status
            const response = {
                success: true,
                message: 'Template deleted successfully'
            };

            if (template.whatsappDeleteFailed) {
                response.message = 'Template deleted from database but failed to delete from WhatsApp';
                response.warning = 'Template might still exist in your WhatsApp Business Account';
            }

            res.status(200).json(response);
        } catch (error) {
            console.error('Error deleting template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete template',
                error: error.message
            });
        }
    }

    // Submit template for WhatsApp approval
    static async submitForApproval(req, res) {
        try {
            const userId = req.user.id;
            const templateId = req.params.id;

            // Get template details
            const template = await Template.getById(templateId, userId);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            // Update status in database
            await Template.submitForApproval(templateId, userId);
            const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }


            // Submit to WhatsApp API
            try {
                const whatsappResponse = await WhatsAppService.submitTemplate(template, businessConfig);
                res.status(200).json({
                    success: true,
                    message: 'Template submitted for approval',
                    data: {
                        template,
                        whatsappSubmissionId: whatsappResponse.id
                    }
                });
            } catch (whatsappError) {
                res.status(200).json({
                    success: true,
                    message: 'Template status updated but WhatsApp submission failed',
                    error: whatsappError.message,
                    data: { template }
                });
            }
        } catch (error) {
            console.error('Error submitting template for approval:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit template for approval',
                error: error.message
            });
        }
    }

    // Add this new method to TemplateController
    static async submitDraftTemplate(req, res) {
            try {
                const userId = req.user.id;
                const templateId = req.params.id;

                // 1. Get the draft template
                const template = await Template.getById(templateId, userId);
                if (!template) {
                    return res.status(404).json({
                        success: false,
                        message: 'Template not found'
                    });
                }

                if (template.status !== 'draft') {
                    return res.status(400).json({
                        success: false,
                        message: 'Only draft templates can be submitted'
                    });
                }
                // Transform the template data to camelCase
                const transformedTemplate = {
                    id: template.id,
                    name: template.name,
                    category: template.category,
                    language: template.language,
                    headerType: template.header_type,
                    headerContent: template.header_content,
                    bodyText: template.body_text,
                    footerText: template.footer_text,
                    status: template.status,
                    created_at: template.created_at,
                    updated_at: template.updated_at,
                    userId: template.user_id,
                    variables: template.variables,
                    whatsapp_id: template.whatsapp_id,
                    whatsapp_status: template.whatsapp_status,
                    quality_score: template.quality_score,
                    rejection_reason: template.rejection_reason,
                    buttons: template.buttons
                };

                const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

                if (!businessConfig) {
                    throw new Error('Business configuration not found');
                }

                // 2. Submit to WhatsApp
                const whatsappResponse = await WhatsAppService.submitTemplate(transformedTemplate, businessConfig);

                // 3. Update template status
                const updatedTemplate = await Template.updateStatus(
                    templateId,
                    'pending', {
                        whatsapp_id: whatsappResponse.id,
                        whatsapp_status: whatsappResponse.status,
                        user_id: userId
                    },
                    userId
                );

                res.status(200).json({
                    success: true,
                    message: 'Draft template submitted to WhatsApp',
                    data: {
                        template: updatedTemplate,
                        whatsappResponse
                    }
                });
            } catch (error) {
                console.error('Error submitting draft template:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to submit draft template',
                    error: error.message
                });
            }
        }
        // Add this new method
    static async updateDraftTemplate(req, res) {
        try {
            const userId = req.user.id;
            const templateId = req.params.id;
            const templateData = req.body;

            // Verify template exists and is a draft
            const existingTemplate = await Template.getById(templateId, userId);
            if (!existingTemplate || existingTemplate.status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: 'Only draft templates can be updated this way'
                });
            }

            // Update the draft
            const updatedTemplate = await Template.update(templateId, {
                ...templateData,
                user_id: userId,
                status: 'draft' // Maintain draft status
            });

            res.status(200).json({
                success: true,
                message: 'Draft template updated',
                data: { template: updatedTemplate }
            });
        } catch (error) {
            console.error('Error updating draft template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update draft template',
                error: error.message
            });
        }
    }

    static async checkTemplateStatus(req, res) {
            try {
                const userId = req.user.id;
                const templateId = req.params.id;

                // Get the template from our database
                const template = await Template.getById(templateId, userId);
                if (!template) {
                    return res.status(404).json({
                        success: false,
                        message: 'Template not found'
                    });
                }

                // Only check status for pending templates with WhatsApp ID
                if (template.status === 'pending' && template.whatsapp_id) {
                    const statusUpdate = await WhatsAppService.checkAndUpdateTemplateStatus(template, userId);

                    // Update our database with the new status
                    const updatedTemplate = await Template.updateStatus(
                        templateId,
                        statusUpdate.status, {
                            whatsapp_status: statusUpdate.whatsappStatus,
                            quality_score: statusUpdate.qualityScore,
                            rejection_reason: statusUpdate.rejectionReason,
                            user_id: userId
                        },
                        userId
                    );

                    return res.status(200).json({
                        success: true,
                        message: 'Template status checked and updated',
                        data: { template: updatedTemplate }
                    });
                }

                // For non-pending templates or those without WhatsApp ID
                return res.status(200).json({
                    success: true,
                    message: 'No status check needed',
                    data: { template }
                });
            } catch (error) {
                console.error('Error checking template status:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to check template status',
                    error: error.message
                });
            }
        }
        // controllers/TemplateController.js
    static async uploadMedia(req, res) {
        try {
            const { templateId, headerType } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            // Upload to WhatsApp and get the media ID
            const whatsappMediaId = await WhatsAppService.uploadMediaToWhatsApp(
                req.user.id,
                file.buffer,
                file.mimetype,
            );

            // You might want to store this media ID in your database
            // associated with the template for future use
            await Template.updateMediaId(templateId, whatsappMediaId);

            res.json({
                success: true,
                whatsappMediaId
            });
        } catch (error) {
            console.error('Media upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload media',
                error: error.message
            });
        }
    }
}

module.exports = TemplateController;