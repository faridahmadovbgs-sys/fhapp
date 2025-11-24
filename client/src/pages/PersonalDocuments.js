import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import './PersonalDocuments.css';

const PersonalDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    fileData: null,
    fileName: '',
    fileSize: 0,
    fileType: ''
  });

  const categories = [
    { value: 'general', label: '📄 General', icon: '📄' },
    { value: 'contract', label: '📝 Contract', icon: '📝' },
    { value: 'invoice', label: '🧾 Invoice', icon: '🧾' },
    { value: 'receipt', label: '🧾 Receipt', icon: '🧾' },
    { value: 'tax', label: '💰 Tax Document', icon: '💰' },
    { value: 'legal', label: '⚖️ Legal', icon: '⚖️' },
    { value: 'medical', label: '🏥 Medical', icon: '🏥' },
    { value: 'insurance', label: '🛡️ Insurance', icon: '🛡️' },
    { value: 'identification', label: '🪪 ID/License', icon: '🪪' },
    { value: 'other', label: '📋 Other', icon: '📋' }
  ];

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user?.id || !db) return;

    try {
      setLoading(true);
      const docsQuery = query(
        collection(db, 'personalDocuments'),
        where('userId', '==', user.id)
      );

      const querySnapshot = await getDocs(docsQuery);
      const docs = [];
      
      querySnapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by createdAt in memory (newest first)
      docs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setDocuments(docs);
      setError('');
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFormData(prev => ({
        ...prev,
        fileData: null,
        fileName: '',
        fileSize: 0,
        fileType: ''
      }));
      return;
    }

    // Validate file size (max 1MB for base64 storage)
    if (file.size > 1024 * 1024) {
      setError('File size must be less than 1MB');
      e.target.value = ''; // Reset file input
      return;
    }

    setError(''); // Clear any previous errors
    setUploading(true); // Show loading while reading file

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        fileData: event.target.result,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }));
      setUploading(false);
      setSuccess('✅ File loaded successfully!');
      setTimeout(() => setSuccess(''), 2000);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setUploading(false);
      e.target.value = ''; // Reset file input
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.fileData) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);

      const docData = {
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.email,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        fileName: formData.fileName,
        fileSize: formData.fileSize,
        fileType: formData.fileType,
        fileData: formData.fileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'personalDocuments'), docData);

      setSuccess('✅ Document uploaded successfully!');
      setShowUploadForm(false);
      setFormData({
        title: '',
        description: '',
        category: 'general',
        fileData: null,
        fileName: '',
        fileSize: 0,
        fileType: ''
      });

      // Reload documents
      await loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'personalDocuments', docId));
      setSuccess('✅ Document deleted successfully!');
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document: ' + error.message);
    }
  };

  const handleDownload = (doc) => {
    try {
      const link = document.createElement('a');
      link.href = doc.fileData;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : '📄';
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm.trim() || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="personal-documents">
        <div className="loading">Loading your documents...</div>
      </div>
    );
  }

  return (
    <div className="personal-documents">
      <div className="page-header">
        <div>
          <h1>📁 My Personal Documents</h1>
          <p>Securely store and manage your personal documents</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? '❌ Cancel' : '📤 Upload Document'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showUploadForm && (
        <div className="upload-form-card">
          <h3>Upload New Document</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Document Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Tax Return 2025, Medical Record, etc."
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add notes or details about this document..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>File * (Max 1MB)</label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                required
              />
              {formData.fileName && (
                <div className="file-info">
                  📎 {formData.fileName} ({formatFileSize(formData.fileSize)})
                </div>
              )}
              <small className="helper-text">
                Supported: PDF, Word, Images, Text (Max 1MB)
              </small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? 'Uploading...' : '📤 Upload Document'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="documents-filters">
        <input
          type="text"
          placeholder="🔍 Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="category-filter"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="documents-stats">
        <div className="stat-card">
          <span className="stat-value">{documents.length}</span>
          <span className="stat-label">Total Documents</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {formatFileSize(documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0))}
          </span>
          <span className="stat-label">Total Storage Used</span>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <p>📭 {searchTerm || filterCategory !== 'all' ? 'No documents match your search' : 'No documents uploaded yet'}</p>
          {!showUploadForm && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowUploadForm(true)}
            >
              📤 Upload Your First Document
            </button>
          )}
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map(document => (
            <div key={document.id} className="document-card">
              <div className="document-header">
                <span className="document-icon">{getCategoryIcon(document.category)}</span>
                <span className="document-category-badge">
                  {getCategoryLabel(document.category)}
                </span>
              </div>
              
              <h3 className="document-title">{document.title}</h3>
              
              {document.description && (
                <p className="document-description">{document.description}</p>
              )}
              
              <div className="document-meta">
                <div className="meta-item">
                  <span className="meta-label">📎 File:</span>
                  <span className="meta-value">{document.fileName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">📊 Size:</span>
                  <span className="meta-value">{formatFileSize(document.fileSize)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">📅 Uploaded:</span>
                  <span className="meta-value">{formatDate(document.createdAt)}</span>
                </div>
              </div>

              <div className="document-actions">
                <button
                  className="btn-action btn-download"
                  onClick={() => handleDownload(document)}
                  title="Download"
                >
                  ⬇️ Download
                </button>
                <button
                  className="btn-action btn-delete"
                  onClick={() => handleDelete(document.id)}
                  title="Delete"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonalDocuments;
