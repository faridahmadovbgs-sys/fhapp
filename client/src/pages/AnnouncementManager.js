import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import './AnnouncementManager.css';

const AnnouncementManager = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const announcementsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnnouncements(announcementsList);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setMessage('Error loading announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      console.log('Submitting announcement...', formData);
      console.log('User:', user);
      console.log('DB:', db);
      
      if (editingId) {
        // Update existing announcement
        await updateDoc(doc(db, 'announcements', editingId), {
          ...formData,
          updatedAt: Timestamp.now(),
          updatedBy: user.name || user.email
        });
        setMessage('Announcement updated successfully!');
      } else {
        // Create new announcement
        const docRef = await addDoc(collection(db, 'announcements'), {
          ...formData,
          createdAt: Timestamp.now(),
          author: user.name || user.email,
          authorId: user.id || user.uid
        });
        console.log('Announcement created with ID:', docRef.id);
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
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setMessage(`Error saving announcement: ${error.message}`);
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority || 'normal',
      active: announcement.active !== false
    });
    setEditingId(announcement.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'announcements', id));
      setMessage('Announcement deleted successfully!');
      loadAnnouncements();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setMessage('Error deleting announcement');
    }
  };

  const handleToggleActive = async (announcement) => {
    try {
      await updateDoc(doc(db, 'announcements', announcement.id), {
        active: !announcement.active,
        updatedAt: Timestamp.now(),
        updatedBy: user.name || user.email
      });
      loadAnnouncements();
      setMessage(`Announcement ${!announcement.active ? 'activated' : 'deactivated'}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling announcement:', error);
      setMessage('Error updating announcement');
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
  };

  return (
    <div className="announcement-manager">
      <div className="manager-header">
        <h1>📢 Announcement Manager</h1>
        <p>Create and manage announcements for your organization</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

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
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

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
              <div key={announcement.id} className={`announcement-item ${!announcement.active ? 'inactive' : ''}`}>
                <div className="announcement-item-header">
                  <div className="announcement-title-section">
                    <h3>{announcement.title}</h3>
                    <span className={`priority-badge ${announcement.priority || 'normal'}`}>
                      {announcement.priority || 'normal'}
                    </span>
                    <span className={`status-badge ${announcement.active ? 'active' : 'inactive'}`}>
                      {announcement.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="announcement-actions">
                    <button onClick={() => handleToggleActive(announcement)} className="btn-toggle" title={announcement.active ? 'Deactivate' : 'Activate'}>
                      {announcement.active ? '👁️' : '👁️‍🗨️'}
                    </button>
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
                  {announcement.updatedAt && (
                    <span>Updated: {announcement.updatedAt?.toDate?.()?.toLocaleDateString()}</span>
                  )}
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
