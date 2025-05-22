import { useState, useRef,  useEffect } from 'react';
import Papa from 'papaparse';
import './ImportContacts.css';
import AddContactModal from './AddContactModal';
import { contactService} from '../../api/contactService';

const ImportContacts = () => {
  // State management
  const [listName, setListName] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactLists, setContactLists] = useState([
    { id: '1', name: 'Default List' },
    { id: '2', name: 'Marketing' }
  ]);
  
  const fileInputRef = useRef(null);

  // Handle CSV file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setValidationErrors([]);
    setSuccessMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;
        
        if (errors.length > 0) {
          setValidationErrors(errors.map(err => err.message));
          return;
        }

        // Basic validation
        const validationResults = validateCSVData(data);
        if (validationResults.errors.length > 0) {
          setValidationErrors(validationResults.errors);
          return;
        }

        setCsvData(validationResults.validData);
      },
      error: (error) => {
        setValidationErrors([`Error parsing CSV: ${error.message}`]);
      }
    });
  };

  // Validate CSV data
  const validateCSVData = (data) => {
    const errors = [];
    const validData = [];
    const seenNumbers = new Set();

    if (!data || data.length === 0) {
      errors.push('CSV file is empty or contains no valid data');
      return { errors, validData };
    }

    // Check if wanumber column exists
    if (!data[0].hasOwnProperty('wanumber')) {
      errors.push('CSV must contain a "wanumber" column');
      return { errors, validData };
    }

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because header is row 1 and array is 0-based
      
      // Validate WhatsApp number
      const waNumber = row.wanumber?.toString().trim();
      if (!waNumber) {
        errors.push(`Row ${rowNumber}: WhatsApp number is required`);
        return;
      }

      // Validate number format (basic check)
      const isValidNumber = /^(\+|\d)[0-9]{7,15}$/.test(waNumber);
      if (!isValidNumber) {
        errors.push(`Row ${rowNumber}: Invalid WhatsApp number format`);
        return;
      }

      // Check for duplicates
      if (seenNumbers.has(waNumber)) {
        errors.push(`Row ${rowNumber}: Duplicate WhatsApp number found`);
        return;
      }
      seenNumbers.add(waNumber);

      // Prepare valid data
      validData.push({
        sno: index + 1,
        fname: row.fname || '',
        lname: row.lname || '',
        wanumber: waNumber,
        email: row.email || ''
      });
    });

    return { errors, validData };
  };

 /* // Handle import submission
  const handleImport = async () => {
    if (!listName.trim()) {
      setValidationErrors(['Contact list name is required']);
      return;
    }

    if (csvData.length === 0) {
      setValidationErrors(['No valid contacts to import']);
      return;
    }

    setIsLoading(true);
    try {
      // Here you would call your backend API
      // const response = await api.importContacts(listName, csvData);
      console.log('Importing:', { listName, contacts: csvData });
      
      setSuccessMessage(`Successfully imported ${csvData.length} contacts to "${listName}"`);
      setListName('');
      setCsvData([]);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setValidationErrors([`Import failed: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  }; */

  // Add useEffect to load contact lists on component mount
useEffect(() => {
    const fetchLists = async () => {
      try {
        const response = await contactService.getLists();
        setContactLists(response.data);
      } catch (error) {
        console.error('Failed to fetch contact lists:', error);
      }
    };
    fetchLists();
  }, []);

  const handleImport = async () => {
    if (!listName.trim()) {
      setValidationErrors(['Contact list name is required']);
      return;
    }
  
    if (!fileInputRef.current?.files?.[0]) {
      setValidationErrors(['Please select a CSV file first']);
      return;
    }
  
    setIsLoading(true);
    setValidationErrors([]);
    setSuccessMessage('');
  
    try {
      const formData = new FormData();
      formData.append('listName', listName);
      formData.append('csvFile', fileInputRef.current.files[0]);
  
      const response = await contactService.importContacts(formData);
      
      setSuccessMessage(`Successfully imported ${response.data.count} contacts to "${listName}"`);
      // Reset form
      setListName('');
      setCsvData([]);
      setFileName('');
      fileInputRef.current.value = '';
      
      // Refresh contact lists
      const listsResponse = await contactService.getLists();
      setContactLists(listsResponse.data);
    } catch (error) {
      console.error('Import error:', error);
      setValidationErrors([error.message || 'Import failed. Please check the file format and try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  // Download sample CSV
  const downloadSampleCSV = () => {
    const sampleData = [
      { sno: 1, fname: 'John', lname: 'Doe', wanumber: '919876543210', email: 'john@example.com' },
      { sno: 2, fname: 'Jane', lname: 'Smith', wanumber: '447700900123', email: 'jane@example.com' }
    ];
    
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_contacts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add this function to handle saving contacts
// In your parent component
const handleSaveContact = async (contactData) => {
    try {
      let listId = contactData.listId;
      
      // Create new list if needed
      if (contactData.newListName) {
        const response = await contactService.createList({ name: contactData.newListName });
        listId = response.data.id;
      }
      
      // Create the contact
      await contactService.createContact({
        fname: contactData.fname,
        lname: contactData.lname,
        wanumber: contactData.wanumber,
        email: contactData.email,
        listId
      });
      
      // Refresh data or show success message
      console.log('Contact saved successfully!');
     // Refresh contact lists
    const listsResponse = await contactService.getLists();
    setContactLists(listsResponse.data);
    
    // Show success message
    setSuccessMessage(
      `Contact ${contactData.fname || ''} ${contactData.lname || ''} added to ${
        contactData.newListName || 
        listsResponse.data.find(list => list.id === listId)?.name || 
        'list'
      }`
    );
    } catch (error) {
      console.error('Failed to save contact:', error);
      // Handle error (show error message, etc.)
    }
  };
  
  
  return (
    <div className="import-contacts-container">
      <div className="import-contacts-wrapper">
        <div className="import-card">
          {/* Header */}
          <div className="import-header">
            <div className="import-header-content">
              <h1>
                <span className="icon">📁</span>
                Import Contacts
              </h1>
              <p>Upload your CSV file to import contacts</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="add-contact-button"
              type="button"
            >
              <span className="icon">👤+</span>
              Add Contact
            </button>
          </div>
          
          <div className="import-body">
            {/* List Name Input */}
            <div className="input-group">
              <label htmlFor="listName">
                Contact List Name (Category)
              </label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., march_real_estate, event2025"
                required
              />
            </div>
            
            {/* CSV Upload Section */}
            <div className="input-group">
              <label>Upload CSV File</label>
              <div className="file-upload-container">
                <div className="file-upload-box">
                  <label className="file-upload-label">
                    <div className="file-upload-content">
                      <span className="icon">📤</span>
                      <span className="file-name">
                        {fileName || 'Click to browse or drag & drop CSV file'}
                      </span>
                      <span className="file-hint">Only .csv files (Max 5MB)</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                      />
                    </div>
                  </label>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  type="button"
                  className="sample-download-btn"
                >
                  Download Sample CSV
                </button>
              </div>
            </div>
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="error-box">
                <h3><span className="icon">⚠️</span> Validation Errors:</h3>
                <ul>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Success Message */}
            {successMessage && (
              <div className="success-box">
                <span className="icon">✓</span>
                <p>{successMessage}</p>
              </div>
            )}
            
            {/* Preview Table */}
            {csvData.length > 0 && (
              <div className="preview-container">
                <h3>Preview ({Math.min(csvData.length, 20)} of {csvData.length} contacts)</h3>
                <div className="table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>WhatsApp Number</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 20).map((contact, idx) => (
                        <tr key={contact.sno} className={idx % 2 === 0 ? 'even' : 'odd'}>
                          <td>{contact.sno}</td>
                          <td>{contact.fname}</td>
                          <td>{contact.lname}</td>
                          <td className="number-cell">{contact.wanumber}</td>
                          <td>{contact.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Import Button */}
            <div className="button-container">
              <button
                onClick={handleImport}
                disabled={!listName || csvData.length === 0 || isLoading}
                className={`import-button ${(!listName || csvData.length === 0 || isLoading) ? 'disabled' : ''}`}
              >
                {isLoading ? (
                  <span className="loading-spinner">
                    <svg className="spinner-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </span>
                ) : 'Import Contacts'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Instructions Panel */}
        <div className="instructions-panel">
          <h3><span className="icon">📌</span> CSV Upload Instructions:</h3>
          <div className="instructions-columns">
            <ul>
              <li>Only upload .csv files (UTF-8 encoded)</li>
              <li>Required: wanumber column (Ex: 919876543210)</li>
              <li>Optional: fname, lname, email columns</li>
              <li>Max 5MB file size</li>
            </ul>
            <ul>
              <li>Avoid '+' symbol in numbers</li>
              <li>Remove blank rows</li>
              <li>Avoid duplicates</li>
            </ul>
          </div>
        </div>
      </div>
      <AddContactModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        existingLists={contactLists}
      />
    </div>
  );
};

export default ImportContacts;