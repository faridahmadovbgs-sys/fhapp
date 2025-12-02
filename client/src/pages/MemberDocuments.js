import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';
import './PersonalDocuments.css';

const MemberDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [members, setMembers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [userRole, setUserRole] = useState(null);

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
    if (user?.id) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Get user role
      const userDoc = await import('firebase/firestore').then(mod => mod.getDoc(mod.doc(db, 'users', user.id)));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role);
      }

      // Get user organizations if account owner
      const { getUserMemberOrganizations } = await import('../services/organizationService');
      const orgsResult = await getUserMemberOrganizations(user.id);
      if (orgsResult.success && orgsResult.organizations.length > 0) {
        setOrganizations(orgsResult.organizations);
        setSelectedOrg(orgsResult.organizations[0]);
        console.log('✅ User organizations loaded:', orgsResult.organizations.length);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    if (selectedOrg) {
      fetchMemberDocuments();
    }
  }, [selectedOrg]);

  const handleOrgChange = (e) => {
    const orgId = e.target.value;
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setSelectedOrg(org);
      console.log('🔄 Switched to organization:', org.name);
    }
  };

  const markDocumentAsViewed = async (docId) => {
    try {
      const docRef = doc(db, 'documents', docId);
      await updateDoc(docRef, {
        viewedBy: arrayUnion(user.id)
      });
      console.log('Marked document as viewed:', docId);
    } catch (error) {
      console.error('Error marking document as viewed:', error);
    }
  };

  const fetchMemberDocuments = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching member documents for user:', user.id, 'Organization:', selectedOrg?.name);

      // Query documents where user is in sharedWith array
      const q = query(
        collection(db, 'documents'),
        where('sharedWith', 'array-contains', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      console.log('Documents shared with me:', querySnapshot.size);

      // Get list of member IDs from selected organization
      const orgMemberIds = selectedOrg?.members || [];
      console.log('Organization members:', orgMemberIds.length);

      const docs = [];
      const uniqueMembers = new Set();

      querySnapshot.forEach((doc) => {
        const docData = { id: doc.id, ...doc.data() };
        
        console.log('Shared document:', docData.title, 'By:', docData.userEmail, 'UserId:', docData.userId);
        
        // Only include documents that are:
        // 1. Not created by the current user
        // 2. Created by a member of the selected organization
        if (docData.userId !== user.id && orgMemberIds.includes(docData.userId)) {
          docs.push(docData);
          if (docData.userEmail) {
            uniqueMembers.add(JSON.stringify({ id: docData.userId, email: docData.userEmail }));
          }
          
          // Mark document as viewed by current user
          if (!docData.viewedBy?.includes(user.id)) {
            markDocumentAsViewed(doc.id);
          }
        }
      });

      console.log('Filtered member documents for organization:', docs.length);

      // Sort by member email first, then by createdAt within each member
      docs.sort((a, b) => {
        // First sort by member email
        const emailA = (a.userEmail || '').toLowerCase();
        const emailB = (b.userEmail || '').toLowerCase();
        
        if (emailA !== emailB) {
          return emailA.localeCompare(emailB);
        }
        
        // If same member, sort by date (newest first)
        const timeA = a.createdAt?.toDate?.() || new Date(0);
        const timeB = b.createdAt?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      setDocuments(docs);
      
      // Convert unique members set to array
      const membersArray = Array.from(uniqueMembers).map(m => JSON.parse(m));
      setMembers(membersArray);

    } catch (error) {
      console.error('Error fetching member documents:', error);
      setError(`Failed to load member documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : '📄';
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label.split(' ')[1] : category;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
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

  const handleDownload = (document) => {
    if (document.fileData) {
      const link = window.document.createElement('a');
      link.href = document.fileData;
      link.download = document.fileName || 'document';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesMember = filterMember === 'all' || doc.userId === filterMember;
    return matchesSearch && matchesCategory && matchesMember;
  });

  if (loading) {
    return (
      <div className="documents-container">
        <div className="loading-spinner">Loading member documents...</div>
      </div>
    );
  }

  return (
    <div className="documents-container">
      <div className="documents-header">
        <div className="header-content">
          <h1 className="page-title">📂 Member Documents</h1>
          <p className="page-subtitle">View documents shared by your team members</p>
        </div>
      </div>

      {userRole === 'account_owner' && organizations.length > 1 && selectedOrg && (
        <div className="org-selector" style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>
            🏛️ Select Organization:
          </label>
          <select 
            value={selectedOrg.id} 
            onChange={handleOrgChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666'}}>
            Viewing documents for: <strong style={{color: '#3b82f6'}}>{selectedOrg.name}</strong>
          </p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="documents-filters">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Category:</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Member:</label>
          <select 
            value={filterMember} 
            onChange={(e) => setFilterMember(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Members</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Member Documents</h3>
          <p>
            {searchTerm || filterCategory !== 'all' || filterMember !== 'all'
              ? 'No documents match your filters. Try adjusting your search criteria.'
              : 'Your team members haven\'t shared any documents yet.'}
          </p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="document-card">
              <div className="document-card-header">
                <div className="document-icon">
                  {getCategoryIcon(document.category)}
                </div>
                <div className="document-badge">
                  {getCategoryLabel(document.category)}
                </div>
              </div>

              <div className="document-card-body">
                <h3 className="document-title">{document.title}</h3>
                {document.description && (
                  <p className="document-description">{document.description}</p>
                )}
                
                <div className="document-meta">
                  <div className="meta-item">
                    <span className="meta-label">File:</span>
                    <span className="meta-value">{document.fileName}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Size:</span>
                    <span className="meta-value">{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Uploaded by:</span>
                    <span className="meta-value">{document.userEmail}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Date:</span>
                    <span className="meta-value">{formatDate(document.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="document-card-footer">
                <button
                  onClick={() => handleDownload(document)}
                  className="btn-download"
                  title="Download"
                >
                  <span className="btn-icon">⬇️</span>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberDocuments;
