// services/whatsAppService.js
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

class WhatsAppService {
    static async submitTemplate(template) {
        try {
            console.log('Template data received:', template);

            // Validate API configuration
            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
            const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

            if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Parse variables if stored as string
            const variableSamples = typeof template.variables === 'string' ?
                JSON.parse(template.variables) :
                (template.variables || {});

            // Convert named variables to numbered format for WhatsApp
            const { processedBody, variableMapping, orderedVariables } = this.convertVariablesForWhatsApp(
                template.bodyText,
                variableSamples
            );

            // Prepare components
            const components = [];

            if (template.headerType && template.headerContent) {
                let headerComponent = {
                    type: "HEADER",
                    format: template.headerType.toUpperCase()
                };

                switch (template.headerType) {
                    case 'text':
                        headerComponent.text = template.headerContent;
                        // Convert variables in header text if needed
                        if (template.headerContent.includes('{{')) {
                            headerComponent.text = this.replaceVariables(
                                template.headerContent,
                                variableMapping
                            );
                        }
                        break;
                    case 'image':
                        headerComponent.example = {
                            header_handle: [template.headerContent.split(':').pop()] // This should be the handle from the upload
                        };
                    case 'video':
                        // Use the media handle directly for image/video headers
                        headerComponent.example = {
                            header_handle: [template.headerContent] // This should be the handle from the upload
                        };
                        break;
                }
                components.push(headerComponent);
            }

            // Body component with variable examples
            const bodyComponent = {
                type: "BODY",
                text: processedBody
            };

            // Only add examples if we have variables
            if (Object.keys(orderedVariables).length > 0) {
                // Create example array in correct order
                const exampleValues = Object.values(orderedVariables);

                bodyComponent.example = {
                    body_text: [exampleValues] // Must be an array of arrays
                };
            }

            components.push(bodyComponent);

            // Footer component
            if (template.footerText) {
                components.push({
                    type: "FOOTER",
                    text: template.footerText
                });
            }

            // Buttons component
            if (template.buttons && template.buttons.length > 0) {
                const buttonsComponent = {
                    type: "BUTTONS",
                    buttons: template.buttons.map(button => {
                        // Common button properties
                        const buttonConfig = {
                            text: button.text
                        };

                        // Set type-specific properties
                        switch (button.type) {
                            case 'phone_number':
                                if (!button.text || !button.value) {
                                    throw new Error('Phone button must have both display text and phone number');
                                }
                                return {
                                    ...buttonConfig,
                                    type: 'PHONE_NUMBER',
                                    text: button.text, // Display text
                                    phone_number: button.value // Actual phone number
                                };

                            case 'url':
                                if (!button.value) throw new Error('URL button must have a URL');
                                return {
                                    ...buttonConfig,
                                    type: 'URL',
                                    text: button.text,
                                    url: button.value
                                };

                            case 'quick_reply':
                                return {
                                    ...buttonConfig,
                                    type: 'QUICK_REPLY',
                                    text: button.text,
                                };

                            default:
                                throw new Error(`Invalid button type: ${button.type}`);
                        }
                    })
                };
                components.push(buttonsComponent);
            }

            // Prepare payload
            const payload = {
                name: template.name,
                language: template.language,
                category: template.category.toUpperCase(),
                components
            };

            console.log('Submitting to WhatsApp API:', payload);
            console.log(components.toString);

            const response = await axios.post(
                `${whatsappApiUrl}/${businessId}/message_templates`,
                payload, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('WhatsApp API response:', response.data);
            return response.data;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response && error.response.data || error.message);
            throw new Error(error.response && error.response.data && error.response.data.error && error.response.data.error.message || 'WhatsApp API request failed');
        }
    }

    // Enhanced method to convert named variables to numbered format
    static convertVariablesForWhatsApp(bodyText, variableSamples = {}) {
        try {
            // Extract all variable names from body text using regex
            const variableRegex = /\{\{([^}]+)\}\}/g;
            let match;
            const allVariables = [];

            // Find all variables
            while ((match = variableRegex.exec(bodyText)) !== null) {
                allVariables.push(match[1]);
            }

            const uniqueVars = [...new Set(allVariables)];

            // Create a mapping of variables to numbered positions
            const variableMapping = {};
            let nextNumber = 1;

            // First process existing numeric variables to maintain their numbers
            uniqueVars.forEach(varName => {
                if (!isNaN(varName)) {
                    const num = parseInt(varName);
                    nextNumber = Math.max(nextNumber, num + 1);
                    variableMapping[varName] = varName; // Keep numeric variables as is
                }
            });

            // Then assign numbers to named variables
            uniqueVars.forEach(varName => {
                if (isNaN(varName) && !variableMapping[varName]) {
                    variableMapping[varName] = nextNumber.toString();
                    nextNumber++;
                }
            });

            // Replace all variables with numbered ones
            const processedBody = bodyText.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
                return `{{${variableMapping[varName]}}}`;
            });

            // Create ordered variables object with values mapped to their correct positions
            const orderedVariables = {};

            for (let i = 1; i < nextNumber; i++) {
                // Find the variable name that maps to this number
                const varName = Object.keys(variableMapping).find(key =>
                    variableMapping[key] === i.toString()
                );

                // Get the sample value for this variable
                if (varName) {
                    orderedVariables[i] = variableSamples[varName] || '';
                }
            }

            console.log('Variable mapping:', variableMapping);
            console.log('Original variables:', variableSamples);
            console.log('Ordered variables:', orderedVariables);

            return {
                processedBody,
                variableMapping,
                orderedVariables
            };
        } catch (error) {
            console.error('Error converting variables:', error);
            throw new Error('Failed to process template variables');
        }
    }

    // Helper method to replace variables in any text
    static replaceVariables(text, variableMapping = {}) {
        if (!text || typeof text !== 'string') return text;

        return text.replace(/{{(\w+)}}/g, (match, varName) => {
            return variableMapping[varName] ? `{{${variableMapping[varName]}}}` : match;
        });
    }

    static async checkTemplateStatus(templateName) {
        try {
            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
            const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

            if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            const response = await axios.get(
                `${whatsappApiUrl}/${businessId}/message_templates?name=${templateName}`, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            }

            return null;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response && error.response.data || error.message);
            throw new Error(error.response && error.response.data && error.response.data.error ? error.response.data.error.message : 'Failed to check template status');
        }
    }

    static async checkAndUpdateTemplateStatus(template) {
        try {
            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
            const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

            if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Check template status in WhatsApp
            const response = await axios.get(
                `${whatsappApiUrl}/${businessId}/message_templates?name=${template.name}`, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.data && response.data.data.length > 0) {
                const whatsappTemplate = response.data.data[0];
                const status = whatsappTemplate.status.toLowerCase();

                // Map WhatsApp status to our status
                let templateStatus;
                switch (status) {
                    case 'approved':
                        templateStatus = 'approved';
                        break;
                    case 'rejected':
                        templateStatus = 'rejected';
                        break;
                    case 'pending':
                        templateStatus = 'pending';
                        break;
                    case 'disabled':
                        templateStatus = 'rejected';
                        break;
                    default:
                        templateStatus = 'pending';
                }

                return {
                    status: templateStatus,
                    whatsappStatus: whatsappTemplate.status,
                    qualityScore: whatsappTemplate.quality_score,
                    rejectionReason: whatsappTemplate.rejection_reason
                };
            }

            return { status: 'pending' };
        } catch (error) {
            console.error('WhatsApp API Error:', error.response ? error.response.data : error.message);
            throw new Error('Failed to check template status');
        }
    }
    static async deleteTemplate(whatsappId, templateName) {
            try {
                const whatsappApiUrl = process.env.WHATSAPP_API_URL;
                const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
                const businessId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

                if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                    throw new Error('WhatsApp API configuration is missing');
                }

                const response = await axios.delete(
                    `${whatsappApiUrl}/${businessId}/message_templates`, {
                        params: {
                            hsm_id: whatsappId,
                            name: templateName
                        },
                        headers: {
                            'Authorization': `Bearer ${whatsappApiToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                return response.data;
            } catch (error) {
                console.error('WhatsApp API Error:', error.response ? error.response.data : error);
                throw new Error(
                    error.response && error.response.data && error.response.data.error ? error.response.data.error.message :
                    error.message ||
                    'Failed to delete template from WhatsApp');
            }
        }
        // Create a media upload session
        // In WhatsAppService.js
    static async createMediaUploadSession(fileType, fileSize) {
        try {
            const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
            const appId = process.env.FACEBOOK_APP_ID;

            console.log('Creating media upload session with:', { fileType, appId });

            if (!whatsappApiToken || !appId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Call the Facebook Graph API to create a session
            const response = await axios.post(
                `https://graph.facebook.com/v19.0/${appId}/uploads`, {
                    upload_phase: 'start',
                    file_length: fileSize,
                    file_type: fileType,
                    access_type: 'TEMPLATE'
                }, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('WhatsApp API response:', response.data);

            if (!response.data || !response.data.id) {
                throw new Error('Invalid response from WhatsApp API');
            }

            return response.data;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response ? error.response.data : error);
            throw new Error(
                error.response && error.response.data && error.response.data.error ? error.response.data.error.message :
                error.message ||
                'Failed to create upload session'
            );
        }
    }


    // Upload file to the created session
    static async uploadFileToSession(sessionId, file) {
            try {
                const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
                if (!whatsappApiToken) throw new Error('Missing WhatsApp API token');

                // Extract base session ID and signature
                const [baseSessionId, signature] = sessionId.split('?sig=');
                const uploadUrl = `https://graph.facebook.com/v19.0/${baseSessionId}${signature ? `?sig=${signature}` : ''}`;
    
            // Create form data with proper file metadata
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
                knownLength: file.size
            });
            formData.append('upload_phase', 'transfer');
    
            // Get exact content length
            const contentLength = await new Promise(resolve => {
                formData.getLength((err, length) => {
                    resolve(err ? null : length);
                });
            });
    
            if (!contentLength) throw new Error('Could not calculate content length');
    
            // Upload the file chunks
            const uploadResponse = await axios.post(uploadUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${whatsappApiToken}`,
                    'Content-Length': contentLength
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                onUploadProgress: progressEvent => {
                    if (progressEvent.lengthComputable) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`Upload progress: ${percent}%`);
                    }
                }
            });
    
            // Finalize the upload
            const finishResponse = await axios.post(uploadUrl, {
                upload_phase: 'finish',
                file_length: file.size
            }, {
                headers: {
                    'Authorization': `Bearer ${whatsappApiToken}`,
                    'Content-Type': 'application/json'
                }
            });
    
            // Extract handle from response (check multiple possible locations)
            const handle = finishResponse.data?.h || 
            finishResponse.data?.id?.split(':').pop(); // Extract last part
    
            if (!handle) {
                console.error('Upload finished but no handle received:', finishResponse.data);
                throw new Error('Upload completed but no media handle received');
            }
            
    
            return { success: true, h: handle };
    
        } catch (error) {
            console.error('Upload failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'File upload failed');
        }
    }
}

module.exports = WhatsAppService;