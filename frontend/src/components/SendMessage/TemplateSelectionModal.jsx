// TemplateSelectionModal.jsx
export const TemplateSelectionModal = ({ templates, onClose, onSelect }) => {
  const getButtonTypes = (buttons) => {
    if (!buttons || buttons.length === 0) return '-';
    
    return buttons.map((button, index) => (
      <span key={index} className={`button-type ${button.type}`}>
        {button.type === 'url' ? 'URL' : 
         button.type === 'phone_number' ? 'Phone' : 
         button.type === 'quick_reply' ? 'Quick Reply' : button.type}
      </span>
    ));
  };

  return (
    <div className="template-selection-overlay">
      <div className="template-selection-modal">
        <div className="template-selection-header">
          <h2>Select Template</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-selection-content">
          <table className="template-selection-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Header</th>
                <th>Body</th>
                <th>Footer</th>
                <th>Buttons</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template, index) => (
                <tr key={template.id}>
                  <td>{index + 1}</td>
                  <td>{template.name}</td>
                  <td>
                    {template.header_type ? (
                      <div className="header-info">
                        <span className="header-type">{template.header_type}</span>
                        {template.header_type === 'text' && (
                          <span className="header-content">{template.header_content}</span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="template-body-content">
                      {template.body_text}
                    </div>
                  </td>
                  <td>
                    <div className="template-footer-content">
                      {template.footer_text || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="template-buttons">
                      {getButtonTypes(template.buttons)}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="select-template-btn"
                      onClick={() => onSelect(template)}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
