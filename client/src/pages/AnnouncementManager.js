import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getUserMemberOrganizations } from '../services/organizationService';
import './AnnouncementManager.css';

const AnnouncementManager = () => {
  const { user } = useAuth();
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [userOrganization, setUserOrganization] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    active: true
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchOrganizations = async () => {
      const userId = user?.id || user?.uid;
      if (!userId) {
        console.log('⚠️ No user ID available for fetching organization');
        return;
      }
      
      try {
        console.log('🔍 [AnnouncementManager] Fetching organizations for user:', userId);
        const result = await getUserMemberOrganizations(userId);
        console.log('📦 [AnnouncementManager] Organizations result:', result);
        
        if (result.organizations.length > 0) {
          setUserOrganizations(result.organizations);
          setUserOrganization(result.organizations[0]);
          console.log('✅ [AnnouncementManager] User organizations loaded:', result.organizations.length);
          console.log('✅ [AnnouncementManager] Selected organization:', result.organizations[0].name, 'ID:', result.organizations[0].id);
        } else {
          console.log('⚠️ [AnnouncementManager] No organizations found for user:', userId);
        }
      } catch (error) {
        console.error('❌ [AnnouncementManager] Error fetching user organizations:', error);
      }
    };
    
    fetchOrganizations();
  }, [user]);

  const handleOrganizationChange = (e) => {
    const selectedOrgId = e.target.value;
    const selectedOrg = userOrganizations.find(org => org.id === selectedOrgId);
    if (selectedOrg) {
      setUserOrganization(selectedOrg);
      console.log('🔄 [AnnouncementManager] Switched to organization:', selectedOrg.name, 'ID:', selectedOrg.id);
    }
  };

  useEffect(() => {
    if (userOrganization) {
      loadAnnouncements();
    }
  }, [userOrganization]);

  const loadAnnouncements = async () => {
    if (!userOrganization) {
      console.log('⚠️ Cannot load announcements - no organization set');
      return;
    }
    
    try {
      setLoading(true);
      setMessage(''); // Clear any previous messages
      
      console.log('📥 Loading announcements for organization:', userOrganization.id, userOrganization.name);
      
      const q = query(
        collection(db, 'messages'),
        where('organizationId', '==', userOrganization.id),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      console.log('📊 Query result: Found', snapshot.docs.length, 'announcements');
      
      const announcementsList = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Announcement:', doc.id, 'OrgID:', data.organizationId, 'Text:', data.text?.substring(0, 30));
        return {
          id: doc.id,
          ...data,
          title: data.text?.substring(0, 50) + (data.text?.length > 50 ? '...' : ''),
          content: data.text,
          author: data.userName,
          active: true // Messages are always active
        };
      });
      setAnnouncements(announcementsList);
      console.log('✅ Announcements loaded successfully');
    } catch (error) {
      console.error('❌ Error loading announcements:', error);
      
      // Check if it's an index error
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.error('Firestore index required. Using fallback query...');
        console.error('Index URL:', error.message);
      }
      
      // Try loading without orderBy as fallback
      try {
        console.log('Attempting to load without orderBy...');
        const fallbackQuery = query(
          collection(db, 'messages'),
          where('organizationId', '==', userOrganization.id)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        console.log('📊 [AnnouncementManager] Fallback query: Found', fallbackSnapshot.docs.length, 'announcements');
        
        const fallbackList = fallbackSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📄 [AnnouncementManager] Announcement:', doc.id, 'Priority:', data.priority, 'Text:', data.text?.substring(0, 30));
          return {
            id: doc.id,
            ...data,
            title: doc.data().text?.substring(0, 50) + (doc.data().text?.length > 50 ? '...' : ''),
            content: doc.data().text,
            author: doc.data().userName,
            priority: data.priority || 'normal',
            active: true
          };
        });
        
        // Sort client-side
        fallbackList.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        setAnnouncements(fallbackList);
        console.log('✅ [AnnouncementManager] Announcements loaded via fallback:', fallbackList.length);
      } catch (fallbackError) {
        console.error('❌ [AnnouncementManager] Fallback query also failed:', fallbackError);
        setMessage(`Error: ${fallbackError.message}`);
        setAnnouncements([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim() || !userOrganization) {
      setMessage('Please fill in the announcement text');
      return;
    }

    try {
      console.log('Submitting announcement...', formData);
      
      if (editingId) {
        // Update existing message
        await updateDoc(doc(db, 'messages', editingId), {
          text: formData.content,
          priority: formData.priority,
          updatedAt: serverTimestamp(),
          updatedBy: user.name || user.email
        });
        setMessage('Announcement updated successfully!');
      } else {
        // Create new message (announcement)
        console.log('📢 Creating announcement for organization:', userOrganization.id, userOrganization.name);
        const newAnnouncement = {
          text: formData.content,
          priority: formData.priority,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          userName: user.name || user.email.split('@')[0],
          userId: user.id || user.uid,
          userEmail: user.email,
          organizationId: userOrganization.id,
          reactions: {}
        };
        console.log('📝 Announcement data:', newAnnouncement);
        await addDoc(collection(db, 'messages'), newAnnouncement);
        console.log('✅ Announcement saved successfully!');
        setMessage('Announcement created successfully!');
      }

      // Reset form
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        active: true
      });
      setEditingId(null);
      loadAnnouncements();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving announcement:', error);
      setMessage(`Error saving announcement: ${error.message}`);
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title || '',
      content: announcement.content || announcement.text || '',
      priority: announcement.priority || 'normal',
      active: announcement.active !== false
    });
    setEditingId(announcement.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'messages', id));
      setMessage('Announcement deleted successfully!');
      loadAnnouncements();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setMessage('Error deleting announcement');
    }
  };

  const cancelEdit = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      active: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="announcement-manager">
      <div className="manager-header">
        <h1>📢 Announcement Manager</h1>
        <p>Create and manage announcements for your organization</p>
      </div>

      {userOrganizations.length > 1 && (
        <div className="organization-selector">
          <label htmlFor="org-select">
            <strong>Select Organization:</strong>
          </label>
          <select
            id="org-select"
            value={userOrganization?.id || ''}
            onChange={handleOrganizationChange}
            className="org-dropdown"
          >
            {userOrganizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <p className="org-info">
            Posting announcements to: <strong>{userOrganization?.name}</strong>
          </p>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {!showForm && (
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <button 
            onClick={() => setShowForm(true)}
            className="btn-primary"
            style={{ 
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ➕ Create New Announcement
          </button>
        </div>
      )}

      {showForm && (
        <div className="announcement-form-section">
        <h2>{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h2>
        <form onSubmit={handleSubmit} className="announcement-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter announcement title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content *</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter announcement content"
              rows="4"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span>Active (visible to users)</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? 'Update Announcement' : 'Create Announcement'}
            </button>
            <button type="button" onClick={cancelEdit} className="btn-secondary">
              {editingId ? 'Cancel' : 'Close Form'}
            </button>
          </div>
        </form>
      </div>
      )}

      <div className="announcements-list-section">
        <h2>All Announcements ({announcements.length})</h2>
        
        {loading ? (
          <p className="loading-text">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <p>No announcements yet. Create your first announcement above!</p>
          </div>
        ) : (
          <div className="announcements-table">
            {announcements.map((announcement) => (
              <div key={announcement.id} className={`announcement-item priority-${announcement.priority || 'normal'}`}>
                <div className="announcement-item-header">
                  <div className="announcement-title-section">
                    <h3>{announcement.title || 'Announcement'}</h3>
                    <span className={`priority-badge priority-${announcement.priority || 'normal'}`}>
                      {announcement.priority === 'urgent' ? '🔴 Urgent' : announcement.priority === 'high' ? '🟠 High Priority' : '🟢 Normal'}
                    </span>
                  </div>
                  <div className="announcement-actions">
                    <button onClick={() => handleEdit(announcement)} className="btn-edit" title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(announcement.id)} className="btn-delete" title="Delete">
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="announcement-content">{announcement.content}</p>
                <div className="announcement-meta">
                  <span>By: {announcement.author}</span>
                  <span>Created: {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementManager;
