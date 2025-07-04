import { useState, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

function MediaUploadModal({ isOpen, onClose, onUpload, fileType, progress }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;
    
    // Validate file type
    if (fileType === 'image' && !selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG)');
      return;
    }
    
    if (fileType === 'video' && !selectedFile.type.startsWith('video/')) {
      setError('Please select a video file (MP4, 3GPP)');
      return;
    }

    if (fileType === 'document' && !selectedFile.type.match(/(pdf|application\/pdf|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)/)) {
      setError('Please select a document file (PDF, Excel)');
      return;
    }
    
    // Validate file size
    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      video: 16 * 1024 * 1024, // 16MB
      document: 100 * 1024 * 1024 // 100MB
    };
    
    if (selectedFile.size > maxSizes[fileType]) {
      setError(`File size must be less than ${maxSizes[fileType] / (1024 * 1024)}MB`);
      return;
    }
    
    setError('');
    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload {fileType === 'image' ? 'Image' : 'Video'}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div 
          className={`drop-zone ${file ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current.click()}
        >
         <input
  type="file"
  ref={fileInputRef}
  onChange={handleFileChange}
  accept={
    fileType === 'image' ? 'image/*' : 
    fileType === 'video' ? 'video/*' : 
    '.pdf,.xlsx,.xls,.csv,.doc,.docx'
  }
  style={{ display: 'none' }}
/>


          
          {file ? (
            <div className="file-info">
              {fileType === 'image' ? (
                <ImageIcon size={48} />
              ) : (
                <VideoIcon size={48} />
              )}
              <span>{file.name}</span>
              <span className="file-size">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          ) : (
            <div className="upload-prompt">
              <UploadCloud size={48} />
            
<p>Drag & drop your {fileType === 'image' ? 'image' : fileType === 'video' ? 'video' : 'document'} here or click to browse</p>
<p className="hint">
  Max file size: {fileType === 'image' ? '5MB' : fileType === 'video' ? '16MB' : '100MB'}
</p>
            </div>
          )}
        </div>
        
        {progress > 0 && progress < 100 && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
            <span>{progress}%</span>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleUpload}
            disabled={!file || progress > 0}
          >
            {progress > 0 ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MediaUploadModal;