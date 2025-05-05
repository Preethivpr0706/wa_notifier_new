// src/components/FieldMapper.jsx
import { useState } from 'react';

function FieldMapper({ templateVariables, contactFields, onMappingChange }) {
  const [mappings, setMappings] = useState({});

  const handleMappingChange = (varName, fieldName) => {
    const newMappings = {
      ...mappings,
      [varName]: fieldName
    };
    setMappings(newMappings);
    onMappingChange(newMappings);
  };

  return (
    <div className="field-mapper">
      <h3>Map Template Variables to Contact Fields</h3>
      <div className="mapping-table">
        <div className="mapping-header">
          <div>Template Variable</div>
          <div>Contact Field</div>
        </div>
        {templateVariables.map((varName) => (
          <div key={varName} className="mapping-row">
            <div className="template-var">
              <span className="var-badge">{varName}</span>
            </div>
            <div className="contact-field-select">
              <select
                value={mappings[varName] || ''}
                onChange={(e) => handleMappingChange(varName, e.target.value)}
              >
                <option value="">Select a field</option>
                {contactFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FieldMapper;