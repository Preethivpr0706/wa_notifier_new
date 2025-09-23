// src/pages/EditCampaign.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../../api/campaignService';
import { templateService } from '../../api/templateService';
import {contactService} from '../../api/contactService';
import FieldMapper from './FieldMapper';
import Papa from 'papaparse';
import './SendMessage.css';

function EditCampaign() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [campaign, setCampaign] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        templateId: '',
        sendNow: true,
        scheduledDate: '',
        scheduledTime: '',
        fieldMappings: {}
    });
    const [parsedContacts, setParsedContacts] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const [editingContacts, setEditingContacts] = useState(false);
    const [contactLists, setContactLists] = useState([]);
    const [contacts, setContacts] = useState([]);

   // Key fix: Enhanced audience type determination logic
useEffect(() => {
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [campaignRes, templatesRes, contactsRes, listsRes] = await Promise.all([
                campaignService.getCampaignById(id),
                templateService.getTemplates({ status: 'approved' }),
                contactService.getContacts(),
                contactService.getListsForSending()
            ]);

            const campaignData = campaignRes.data;
            if (campaignData.status !== 'draft') {
                throw new Error('Only draft campaigns can be edited');
            }

            setCampaign(campaignData);
            setTemplates(templatesRes.data?.templates || []);
            setContacts(contactsRes.data || []);
            setContactLists(listsRes.data || []);

            // Parse the stored campaign data
            try {
                const contacts = typeof campaignData.contacts === 'string' ?
                    JSON.parse(campaignData.contacts) :
                    campaignData.contacts;
                setParsedContacts(contacts);

                const fieldMappings = typeof campaignData.field_mappings === 'string' ?
                    JSON.parse(campaignData.field_mappings) :
                    campaignData.field_mappings;

                // ENHANCED AUDIENCE TYPE DETERMINATION LOGIC
                let audienceType = 'all'; // default
                let contactList = '';
                
                // Method 1: Check campaign metadata fields
                if (campaignData.is_custom === true || campaignData.is_custom === 1) {
                    audienceType = 'custom';
                    setCsvData(contacts);
                    setCsvFields(Object.keys(contacts[0] || {}));
                    setCsvListName(campaignData.csvListName || campaignData.list_name || '');
                } else if (campaignData.list_id && campaignData.list_id !== null) {
                    audienceType = 'list';
                    contactList = campaignData.list_id;
                } 
                // Method 2: Fallback - analyze the audience_type field if it exists
                else if (campaignData.audience_type) {
                    audienceType = campaignData.audience_type;
                    if (audienceType === 'list') {
                        contactList = campaignData.list_id || '';
                    } else if (audienceType === 'custom') {
                        setCsvData(contacts);
                        setCsvFields(Object.keys(contacts[0] || {}));
                        setCsvListName(campaignData.csvListName || campaignData.list_name || '');
                    }
                }
                // Method 3: Heuristic detection based on contact data
                else if (contacts && contacts.length > 0) {
                    // If contacts have a uniform list_id, it's likely a list selection
                    const listIds = [...new Set(contacts.map(c => c.list_id).filter(Boolean))];
                    if (listIds.length === 1) {
                        audienceType = 'list';
                        contactList = listIds[0];
                    } 
                    // If contacts don't match the total contact count, it's likely custom
                    else if (contactsRes.data && contacts.length !== contactsRes.data.length) {
                        audienceType = 'custom';
                        setCsvData(contacts);
                        setCsvFields(Object.keys(contacts[0] || {}));
                        setCsvListName(campaignData.csvListName || campaignData.list_name || `Custom List ${contacts.length} contacts`);
                    }
                    // Otherwise, it's likely all contacts
                }

                console.log('Detected audience type:', audienceType); // Debug log

                // Set initial form data - PRESERVE SCHEDULING INFO
                setFormData({
                    name: campaignData.name || '',
                    templateId: campaignData.template_id,
                    audienceType: audienceType,
                    contactList: contactList,
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        setError('Error parsing CSV file');
                        return;
                    }
                    setParsedContacts(results.data);
                    setEditingContacts(false);
                },
                error: (error) => {
                    setError('Failed to parse CSV file: ' + error.message);
                }
            });
        } else {
            setError('Please select a valid CSV file');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);

            const updateData = {
                name: formData.name,
                templateId: formData.templateId,
                scheduledAt: formData.sendNow ? null : 
                    `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
                fieldMappings: formData.fieldMappings,
                // Include contacts if they were modified
                ...(csvFile && { contacts: parsedContacts })
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
        <div className="edit-campaign send-message-component">
            <div className="send-message-container">
                <div className="send-message-header">
                    <h1 className="page-title">Edit Draft Campaign</h1>
                    <p className="page-description">
                        Modify your campaign details before sending
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="campaign-form">
                    {/* Campaign Name Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-info">
                                <div className="section-icon">
                                    📝
                                </div>
                                <div className="section-title">
                                    <h3>Campaign Details</h3>
                                    <p>Update campaign name and basic information</p>
                                </div>
                            </div>
                        </div>
                        <div className="section-content">
                            <div className="form-field">
                                <label htmlFor="name">Campaign Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter campaign name"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Template Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-info">
                                <div className="section-icon">
                                    📄
                                </div>
                                <div className="section-title">
                                    <h3>Message Template</h3>
                                    <p>Choose the template for your campaign</p>
                                </div>
                            </div>
                        </div>
                        <div className="section-content">
                            <div className="form-field">
                                <label htmlFor="templateId">Select Template</label>
                                <select
                                    id="templateId"
                                    name="templateId"
                                    value={formData.templateId}
                                    onChange={handleInputChange}
                                    className="select-field"
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
                                <div className="template-preview-card">
                                    <div className="template-preview-header">
                                        <h4>{selectedTemplate.name}</h4>
                                        <span className="template-category">
                                            {selectedTemplate.category}
                                        </span>
                                    </div>
                                    <div className="template-preview-content">
                                        <div className="template-body">
                                            {selectedTemplate.body_text}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contacts Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-info">
                                <div className="section-icon">
                                    👥
                                </div>
                                <div className="section-title">
                                    <h3>Recipients</h3>
                                    <p>Current contacts: {parsedContacts.length} recipients</p>
                                </div>
                            </div>
                            <div className="section-controls">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setEditingContacts(!editingContacts)}
                                >
                                    {editingContacts ? 'Cancel' : 'Update Contacts'}
                                </button>
                            </div>
                        </div>
                        
                        {editingContacts && (
                            <div className="section-content">
                                <div className="file-upload-area">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="file-input"
                                        id="csvFile"
                                    />
                                    <label htmlFor="csvFile" className="file-upload-content">
                                        <div className="upload-icon">📊</div>
                                        <p className="upload-text">
                                            {csvFile ? csvFile.name : 'Upload new CSV file'}
                                        </p>
                                        <p className="upload-hint">
                                            CSV files only. This will replace current contacts.
                                        </p>
                                    </label>
                                </div>
                            </div>
                        )}

                        {!editingContacts && parsedContacts.length > 0 && (
                            <div className="section-content">
                                <div className="info-card">
                                    <div>
                                        <h4>Current Contact List</h4>
                                        <p>
                                            {parsedContacts.length} contacts loaded
                                            {parsedContacts.length > 0 && 
                                                ` • Columns: ${Object.keys(parsedContacts[0]).join(', ')}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scheduling Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <div className="section-info">
                                <div className="section-icon">
                                    ⏰
                                </div>
                                <div className="section-title">
                                    <h3>Delivery Timing</h3>
                                    <p>Choose when to send your campaign</p>
                                </div>
                            </div>
                        </div>
                        <div className="section-content">
                            <div className="timing-option">
                                <input
                                    type="checkbox"
                                    name="sendNow"
                                    checked={formData.sendNow}
                                    onChange={handleInputChange}
                                    id="sendNow"
                                />
                                <div className="option-content">
                                    <label htmlFor="sendNow" className="option-title">
                                        Send Immediately
                                    </label>
                                    <p className="option-description">
                                        Campaign will be sent as soon as you save changes
                                    </p>
                                </div>
                            </div>

                            {!formData.sendNow && (
                                <div className="schedule-fields">
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label htmlFor="scheduledDate">Date</label>
                                            <input
                                                type="date"
                                                id="scheduledDate"
                                                name="scheduledDate"
                                                value={formData.scheduledDate}
                                                onChange={handleInputChange}
                                                className="input-field"
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
                                                className="input-field"
                                                required={!formData.sendNow}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Field Mapping Section */}
                    {selectedTemplate && parsedContacts.length > 0 && (
                        <div className="form-section">
                            <div className="section-header">
                                <div className="section-info">
                                    <div className="section-icon">
                                        🔗
                                    </div>
                                    <div className="section-title">
                                        <h3>Variable Mapping</h3>
                                        <p>Map template variables to contact data fields</p>
                                    </div>
                                </div>
                            </div>
                            <div className="section-content">
                                <FieldMapper
                                    templateVariables={extractVariables(selectedTemplate.body_text)}
                                    contactFields={Object.keys(parsedContacts[0] || {})}
                                    initialMappings={formData.fieldMappings}
                                    onMappingChange={handleMappingChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
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