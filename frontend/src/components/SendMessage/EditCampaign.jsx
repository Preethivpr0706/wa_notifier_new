// src/pages/EditCampaign.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../../api/campaignService';
import { templateService } from '../../api/templateService';
import FieldMapper from './FieldMapper';
import './SendMessage.css';

function EditCampaign() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [campaign, setCampaign] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [formData, setFormData] = useState({
        templateId: '',
        sendNow: true,
        scheduledDate: '',
        scheduledTime: '',
        fieldMappings: {}
    });
    const [parsedContacts, setParsedContacts] = useState([]);

   useEffect(() => {
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [campaignRes, templatesRes] = await Promise.all([
                campaignService.getCampaignById(id),
                templateService.getTemplates({ status: 'approved' })
            ]);

            const campaignData = campaignRes.data;
            if (campaignData.status !== 'draft') {
                throw new Error('Only draft campaigns can be edited');
            }

            setCampaign(campaignData);
            setTemplates(templatesRes.data?.templates || []);

            // Parse the stored data
            try {
                const contacts = typeof campaignData.contacts === 'string' ?
                    JSON.parse(campaignData.contacts) :
                    campaignData.contacts;
                setParsedContacts(contacts);

                const fieldMappings = typeof campaignData.field_mappings === 'string' ?
                    JSON.parse(campaignData.field_mappings) :
                    campaignData.field_mappings;

                // Set initial form data
                setFormData({
                    templateId: campaignData.template_id,
                    sendNow: !campaignData.scheduled_at,
                    scheduledDate: campaignData.scheduled_at ? 
                        new Date(campaignData.scheduled_at).toISOString().split('T')[0] : '',
                    scheduledTime: campaignData.scheduled_at ? 
                        new Date(campaignData.scheduled_at).toTimeString().slice(0,5) : '',
                    fieldMappings: fieldMappings
                });
            } catch (parseError) {
                console.error('Error parsing JSON data:', parseError);
                throw new Error('Invalid campaign data format');
            }
        } catch (err) {
            setError(err.message || 'Failed to load campaign');
            console.error('Error loading campaign:', err);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
}, [id]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMappingChange = (mappings) => {
        setFormData(prev => ({
            ...prev,
            fieldMappings: mappings
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);

            const updateData = {
                templateId: formData.templateId,
                scheduledAt: formData.sendNow ? null : 
                    `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
                fieldMappings: formData.fieldMappings
            };

            await campaignService.updateCampaign(id, updateData);
            navigate('/campaigns', { 
                state: { success: 'Campaign updated successfully!' } 
            });
        } catch (err) {
            setError('Failed to update campaign: ' + (err.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="loading-state">Loading...</div>;
    if (error) return <div className="error-alert">{error}</div>;
    if (!campaign) return <div className="error-alert">Campaign not found</div>;

    const selectedTemplate = templates.find(t => t.id === formData.templateId);

    return (
        <div className="edit-campaign">
            <div className="page-header">
                <h2>Edit Draft Campaign</h2>
            </div>

            <form onSubmit={handleSubmit} className="edit-form card">
                <div className="form-field">
                    <label htmlFor="templateId">Message Template</label>
                    <select
                        id="templateId"
                        name="templateId"
                        value={formData.templateId}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">Select a template</option>
                        {templates.map(template => (
                            <option key={template.id} value={template.id}>
                                {template.name} ({template.category})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedTemplate && (
                    <div className="template-preview">
                        <h4>Template Preview</h4>
                        <div className="template-content">
                            <div className="template-body">
                                {selectedTemplate.body_text}
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-field checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            name="sendNow"
                            checked={formData.sendNow}
                            onChange={handleInputChange}
                        />
                        Send immediately
                    </label>
                </div>

                {!formData.sendNow && (
                    <div className="form-row">
                        <div className="form-field">
                            <label htmlFor="scheduledDate">Date</label>
                            <input
                                type="date"
                                id="scheduledDate"
                                name="scheduledDate"
                                value={formData.scheduledDate}
                                onChange={handleInputChange}
                                min={new Date().toISOString().split('T')[0]}
                                required={!formData.sendNow}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="scheduledTime">Time</label>
                            <input
                                type="time"
                                id="scheduledTime"
                                name="scheduledTime"
                                value={formData.scheduledTime}
                                onChange={handleInputChange}
                                required={!formData.sendNow}
                            />
                        </div>
                    </div>
                )}

               {selectedTemplate && (
    <div className="field-mapping-section">
        <h4>Variable Mapping</h4>
        <FieldMapper
            templateVariables={extractVariables(selectedTemplate.body_text)}
            contactFields={Object.keys(parsedContacts[0] || {})}
            initialMappings={formData.fieldMappings}
            onMappingChange={handleMappingChange}
        />
    </div>
)}

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/campaigns')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Helper function to extract variables from template text
function extractVariables(text) {
    if (!text) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    while (match = regex.exec(text)) {
        matches.push(match[1]);
    }
    return [...new Set(matches)];
}

export default EditCampaign;
