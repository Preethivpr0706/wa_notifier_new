// controllers/templateController.js
const Template = require('../models/templateModel');
const WhatsAppService = require('../services/WhatsAppService');

class TemplateController {
    // Create a new template and submit for approval
    static async createTemplate(req, res) {
            try {
                const userId = 1;

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

                // First create the template in our database
                let template = await Template.create(templateData, userId);

                try {
                    // Submit to WhatsApp API
                    const whatsappResponse = await WhatsAppService.submitTemplate(template);

                    // Update our template with WhatsApp ID and status
                    template = await Template.updateStatus(
                        template.id,
                        'pending', // or 'approved' depending on WhatsApp response
                        {
                            whatsapp_id: whatsappResponse.id,
                            whatsapp_status: whatsappResponse.status
                        }
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
                    });

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
            const template = await Template.saveAsDraft(templateData, userId);

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
            const defaultUserId = '1';
            const { status, category } = req.query;
            const filters = {};
            if (status) filters.status = status;
            if (category) filters.category = category;

            let templates = await Template.getAllByUser(defaultUserId, filters);

            // Check and update status for pending templates
            templates = await Promise.all(templates.map(async(template) => {
                if (template.status === 'pending' && template.whatsapp_id) {
                    try {
                        const statusUpdate = await WhatsAppService.checkAndUpdateTemplateStatus(template);
                        if (statusUpdate.status !== template.status) {
                            return await Template.updateStatus(template.id, statusUpdate.status, {
                                whatsapp_status: statusUpdate.whatsappStatus,
                                quality_score: statusUpdate.qualityScore,
                                rejection_reason: statusUpdate.rejectionReason
                            });
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
            const userId = 1;
            // const userId = req.user.id;
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
    static async updateTemplate(req, res) {
        try {
            const userId = 1; // Should come from auth
            const templateId = req.params.id;

            // Ensure we have all required fields
            const templateData = {
                ...req.body,
                body_text: req.body.bodyText || req.body.body_text,
                footer_text: req.body.footerText || req.body.footer_text,
                header_content: req.body.headerContent || req.body.header_content,
                header_type: req.body.headerType || req.body.header_type
            };

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

                    // Ensure we're passing the correct data structure
                    const whatsappPayload = {
                        ...updatedTemplate,
                        bodyText: updatedTemplate.body_text,
                        footerText: updatedTemplate.footer_text,
                        headerContent: updatedTemplate.header_content,
                        headerType: updatedTemplate.header_type
                    };

                    const whatsappResponse = await WhatsAppService.updateTemplate(
                        existingTemplate.whatsapp_id,
                        whatsappPayload
                    );

                    // 4. Update database with any changes from WhatsApp response
                    if (whatsappResponse.category) {
                        await Template.updateStatus(templateId, 'pending', {
                            category: whatsappResponse.category.toLowerCase(),
                            whatsapp_status: whatsappResponse.status || 'PENDING'
                        });
                    }

                    // Get the final updated template
                    const finalTemplate = await Template.getById(templateId, userId);

                    return res.status(200).json({
                        success: true,
                        message: 'Template updated in WhatsApp',
                        data: {
                            template: finalTemplate,
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
            const userId = 1; // Replace with actual user ID from auth
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
                        template.name // Pass the template name as second parameter
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
            const userId = 1;
            // const userId = req.user.id;
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

            // Submit to WhatsApp API
            try {
                const whatsappResponse = await WhatsAppService.submitTemplate(template);
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
}

module.exports = TemplateController;