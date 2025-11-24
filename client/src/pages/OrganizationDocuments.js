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
import { getUserOrganizations } from '../services/organizationService';
import './OrganizationDocuments.css';

const OrganizationDocuments = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isOwner, setIsOwner] = useState(false);

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
    { value: 'policy', label: '📋 Policy', icon: '📋' },
    { value: 'contract', label: '📝 Contract', icon: '📝' },
    { value: 'financial', label: '💰 Financial', icon: '💰' },
    { value: 'legal', label: '⚖️ Legal', icon: '⚖️' },
    { value: 'hr', label: '👥 HR/Personnel', icon: '👥' },
    { value: 'training', label: '📚 Training', icon: '📚' },
    { value: 'procedures', label: '🔧 Procedures', icon: '🔧' },
    { value: 'forms', label: '📑 Forms', icon: '📑' },
    { value: 'other', label: '📁 Other', icon: '📁' }
  ];

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getUserOrganizations(user.id);
        setOrganizations(result.organizations);
        
        if (result.organizations.length > 0 && !selectedOrg) {
          const org = result.organizations[0];
          setSelectedOrg(org);
          setIsOwner(org.ownerId === user.id);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setError('Failed to load organizations');
      }
    };
    
    fetchOrganizations();
  }, [user]);

  // Load documents when organization changes
  useEffect(() => {
    if (selectedOrg) {
      loadDocuments();
    }
  }, [selectedOrg]);

  const loadDocuments = async () => {
    if (!selectedOrg) return;

    try {
      setLoading(true);
      const docsQuery = query(
        collection(db, 'organizationDocuments'),
        where('organizationId', '==', selectedOrg.id)
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

  const handleOrgChange = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setSelectedOrg(org);
      setIsOwner(org.ownerId === user.id);
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

    if (!selectedOrg) {
      setError('Please select an organization');
      return;
    }

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
        organizationId: selectedOrg.id,
        organizationName: selectedOrg.name,
        uploadedBy: user.id,
        uploaderName: user.name || user.email,
        uploaderEmail: user.email,
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

      await addDoc(collection(db, 'organizationDocuments'), docData);

      setSuccess('✅ Document uploaded successfully and shared with organization!');
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

  const handleDelete = async (docId, docUploadedBy) => {
    // Only allow deletion by uploader or organization owner
    if (docUploadedBy !== user.id && !isOwner) {
      setError('Only the uploader or organization owner can delete this document');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'organizationDocuments', docId));
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

  if (loading && !selectedOrg) {
    return (
      <div className="organization-documents">
        <div className="loading">Loading organizations...</div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="organization-documents">
        <div className="empty-state">
          <p>📭 You are not part of any organization yet</p>
          <p>Join an organization to access shared documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="organization-documents">
      <div className="page-header">
        <div>
          <h1>🏢 Organization Documents</h1>
          <p>Shared documents for all organization members</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? '❌ Cancel' : '📤 Upload Document'}
        </button>
      </div>

      {/* Organization Selector */}
      {organizations.length > 1 && (
        <div className="org-selector">
          <label>Organization:</label>
          <select 
            value={selectedOrg?.id || ''} 
            onChange={(e) => handleOrgChange(e.target.value)}
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name} {org.ownerId === user.id ? '(Owner)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showUploadForm && (
        <div className="upload-form-card">
          <h3>Upload Organization Document</h3>
          <p className="upload-note">📢 This document will be visible to all members of {selectedOrg?.name}</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Document Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Company Policy, Safety Procedures, etc."
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
                {uploading ? 'Uploading...' : '📤 Upload & Share'}
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
          <span className="stat-label">Organization Documents</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {formatFileSize(documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0))}
          </span>
          <span className="stat-label">Total Storage</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{selectedOrg?.name}</span>
          <span className="stat-label">Current Organization</span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <p>📭 {searchTerm || filterCategory !== 'all' ? 'No documents match your search' : 'No documents uploaded yet'}</p>
          {!showUploadForm && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowUploadForm(true)}
            >
              📤 Upload First Document
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
                  <span className="meta-label">👤 Uploaded by:</span>
                  <span className="meta-value">{document.uploaderName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">📅 Date:</span>
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
                {(document.uploadedBy === user.id || isOwner) && (
                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDelete(document.id, document.uploadedBy)}
                    title="Delete"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizationDocuments;
