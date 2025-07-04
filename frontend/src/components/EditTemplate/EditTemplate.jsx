import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, AlertCircle, FileText } from 'lucide-react';
import { templateService } from '../../api/templateService';
import { businessService } from '../../api/businessService';
import TemplateForm from './TemplateForm';
import './EditTemplate.css';

function EditTemplate() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { id } = useParams();
    const { state } = useLocation();
    const [template, setTemplate] = useState(state?.template || null);
    const [isLoading, setIsLoading] = useState(!state?.template);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [businessDetails, setBusinessDetails] = useState({
        name: 'Your Business',
        profileImage: null
    });
  
    useEffect(() => {
        if (!state?.template && id) {
            fetchTemplate();
        }
        fetchBusinessDetails();
    }, [id, state]);

    const fetchTemplate = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await templateService.getTemplateById(id);
            if (response.data?.template) {
                setTemplate(response.data.template);
            }
        } catch (err) {
            setError('Failed to load template: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBusinessDetails = async () => {
        try {
            const response = await businessService.getBusinessDetails();
            setBusinessDetails({
                name: response.data.business.name || 'Your Business',
                profileImage: response.data.business.profile_image_url || null
            });
        } catch (error) {
            console.error('Failed to fetch business details:', error);
        }
    };

    const handleSubmit = async (formData) => {
        console.log('HandleSubmit called with data:', formData);
        
        try {
            setIsSubmitting(true);
            setError(null);

            // Prepare the update data
            const updateData = {
                ...formData,
                headerContent: formData.headerType === 'text' ? formData.headerText : formData.headerContent,
            };

            console.log('Sending update request with data:', updateData);

            const response = await templateService.updateTemplate(id, updateData);
            
            console.log('Update response:', response);

            if (response.success) {
                navigate('/templates', {
                    state: {
                        successMessage: 'Template updated successfully!',
                        updatedTemplate: response.data.template
                    }
                });
            } else {
                console.error('Update failed:', response.message);
                setError(response.message || 'Failed to update template');
            }
        } catch (err) {
            console.error('Update error:', err);
            setError('Failed to update template: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsSubmitting(true);
            setError(null);
            
            const response = await templateService.deleteTemplate(id);
            
            if (response.success) {
                navigate('/templates', { 
                    state: { 
                        successMessage: 'Template deleted successfully!'
                    }
                });
            } else {
                setError(response.message || 'Failed to delete template');
            }
        } catch (err) {
            setError(err.message || 'Failed to delete template');
        } finally {
            setIsSubmitting(false);
            setDeleteConfirm(false);
        }
    };

    // Function to trigger form submission
    const triggerFormSubmit = () => {
        if (formRef.current) {
            formRef.current.submitForm();
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading template...</p>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="error-container">
                <AlertCircle size={48} />
                <h3>Template not found</h3>
                <p>The requested template could not be loaded.</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/templates')}
                >
                    Back to Templates
                </button>
            </div>
        );
    }

    return (
        <div className="edit-template-container">
            <div className="page-header">
                <button 
                    className="btn btn-secondary"
                    onClick={() => navigate('/templates')}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Templates</span>
                </button>
                
                <div className="header-actions">
                    <button
                        className="btn btn-danger"
                        onClick={() => setDeleteConfirm(true)}
                        disabled={isSubmitting}
                    >
                        <Trash2 size={16} />
                        <span>Delete Template</span>
                    </button>
                    
                    <button
                        className="btn btn-primary"
                        onClick={triggerFormSubmit}
                        disabled={isSubmitting}
                    >
                        <Save size={16} />
                        <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <TemplateForm 
                ref={formRef}
                initialData={template}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                businessDetails={businessDetails}
            />
            
            {deleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Delete Template?</h3>
                        <p>Are you sure you want to delete "{template.name}"? This action cannot be undone.</p>
                        
                        {template.whatsapp_id && (
                            <div className="warning-message">
                                <AlertCircle size={16} />
                                <span>This template is registered with WhatsApp (ID: {template.whatsapp_id})</span>
                            </div>
                        )}
                        
                        <div className="modal-actions">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setDeleteConfirm(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EditTemplate;