import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
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
  const { accounts, activeAccount, operatingAsUser } = useAccount();
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState('user');

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

  useEffect(() => {
    loadUserOrganizations();
  }, [user, uploadingProfile]);

  const loadUserOrganizations = async () => {
    if (!user?.id) return;

    try {
      // Determine which profile to get organizations for
      const profileId = uploadingProfile === 'user' ? user.id : uploadingProfile;
      
      const { getUserMemberOrganizations } = await import('../services/organizationService');
      const result = await getUserMemberOrganizations(profileId);
      
      if (result.success) {
        setUserOrganizations(result.organizations);
        console.log(`📋 Loaded ${result.organizations.length} organizations for profile:`, profileId);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setUserOrganizations([]);
    }
  };

  const loadDocuments = async () => {
    if (!user?.id || !db) return;

    try {
      setLoading(true);
      const docsQuery = query(
        collection(db, 'documents'),
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

      // Determine which profile is uploading
      const uploaderId = uploadingProfile === 'user' ? user.id : uploadingProfile;
      const uploaderName = uploadingProfile === 'user' 
        ? (user.name || user.displayName || user.email)
        : accounts.find(acc => acc.id === uploadingProfile)?.accountName || 'Sub Profile';

      // Prepare document data
      const docData = {
        userId: uploaderId,
        userEmail: user.email,
        userName: uploaderName,
        uploadedBy: uploadingProfile === 'user' ? 'primary' : 'subprofile',
        subProfileId: uploadingProfile === 'user' ? null : uploadingProfile,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        fileName: formData.fileName,
        fileSize: formData.fileSize,
        fileType: formData.fileType,
        fileData: formData.fileData,
        sharedWith: [],
        organizationId: selectedOrganization || null,
        organizationShared: !!selectedOrganization,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // If shared with organization, add all organization members to sharedWith
      if (selectedOrganization) {
        try {
          const orgDoc = await getDoc(doc(db, 'organizations', selectedOrganization));
          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            docData.sharedWith = orgData.members || [];
            docData.organizationName = orgData.name;
          }
        } catch (orgError) {
          console.error('Error fetching organization:', orgError);
        }
      }

      await addDoc(collection(db, 'documents'), docData);

      if (selectedOrganization) {
        const orgName = userOrganizations.find(org => org.id === selectedOrganization)?.name || 'organization';
        setSuccess(`✅ Document uploaded by ${uploaderName} and shared with ${orgName}!`);
      } else {
        setSuccess(`✅ Document uploaded successfully by ${uploaderName}!`);
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'general',
        fileData: null,
        fileName: '',
        fileSize: 0,
        fileType: ''
      });
      setSelectedOrganization('');
      setUploadingProfile('user');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

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
      await deleteDoc(doc(db, 'documents', docId));
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

  return (
    <div className="personal-documents">
      <div className="page-header">
        <div>
          <h1>📁 My Personal Documents</h1>
          <p>Securely store and manage your personal documents</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

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
        
        <button 
          type="button"
          className="btn btn-primary"
          onClick={(e) => {
            e.preventDefault();
            setShowUploadForm(!showUploadForm);
          }}
          style={{ 
            cursor: 'pointer',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: showUploadForm ? '#dc3545' : '#4CAF50',
            color: 'white',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            e.currentTarget.style.backgroundColor = showUploadForm ? '#c82333' : '#45a049';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            e.currentTarget.style.backgroundColor = showUploadForm ? '#dc3545' : '#4CAF50';
          }}
        >
          {showUploadForm ? '❌ Close Form' : '📤 Upload Document'}
        </button>
      </div>

      {showUploadForm && (
        <div className="upload-form-card">
          <h3>Upload New Document</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Upload From Profile *</label>
              <select
                value={uploadingProfile}
                onChange={(e) => {
                  setUploadingProfile(e.target.value);
                  setSelectedOrganization(''); // Clear organization when profile changes
                }}
                className="profile-selector"
              >
                <option value="user">
                  👤 {user?.name || user?.displayName || user?.email || 'You'} (Primary)
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountType === 'llc' && '🏢'}
                    {account.accountType === 'trust' && '🏛️'}
                    {account.accountType === 'corporation' && '🏭'}
                    {account.accountType === 'partnership' && '🤝'}
                    {account.accountType === 'nonprofit' && '❤️'}
                    {account.accountType === 'personal' && '👤'}
                    {account.accountType === 'other' && '📋'}
                    {' '}{account.accountName}
                  </option>
                ))}
              </select>
              <small className="helper-text">
                Choose which profile is uploading this document
              </small>
            </div>

            <div className="form-group">
              <label>Share With Organization (Optional)</label>
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="org-selector"
              >
                <option value="">-- Keep Private --</option>
                {userOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    🏢 {org.name}
                  </option>
                ))}
              </select>
              <small className="helper-text">
                Choose an organization to share this document with, or keep it private
              </small>
            </div>

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
                ref={fileInputRef}
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
                ✅ Done
              </button>
            </div>
            {documents.length > 0 && (
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                💡 You can upload multiple documents. Click "Done" when finished.
              </p>
            )}
          </form>
        </div>
      )}

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

      {loading ? (
        <div className="loading">Loading your documents...</div>
      ) : filteredDocuments.length === 0 ? (
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
        <div className="documents-table-container">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>File</th>
                <th>Size</th>
                <th>Shared With</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(document => (
                <tr key={document.id}>
                  <td>
                    <span className="table-category-badge">
                      {getCategoryIcon(document.category)} {getCategoryLabel(document.category)}
                    </span>
                  </td>
                  <td>
                    <div className="table-title">
                      <strong>{document.title}</strong>
                      {document.description && (
                        <small className="table-description">{document.description}</small>
                      )}
                    </div>
                  </td>
                  <td className="table-filename">{document.fileName}</td>
                  <td>{formatFileSize(document.fileSize)}</td>
                  <td>
                    {document.organizationShared && document.organizationName ? (
                      <span className="shared-badge shared-org">
                        🏢 {document.organizationName}
                      </span>
                    ) : (
                      <span className="shared-badge shared-private">
                        🔒 Private
                      </span>
                    )}
                  </td>
                  <td>{formatDate(document.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-table-action btn-download"
                        onClick={() => handleDownload(document)}
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        className="btn-table-action btn-delete"
                        onClick={() => handleDelete(document.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PersonalDocuments;
