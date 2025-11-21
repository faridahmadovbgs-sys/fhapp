import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserOrganizations } from '../services/organizationService';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './OrganizationMembers.css';

const OrganizationMembers = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const membersPerPage = 20;

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getUserOrganizations(user.id);
        setOrganizations(result.organizations);
        
        if (result.organizations.length > 0 && !selectedOrg) {
          setSelectedOrg(result.organizations[0]);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };
    
    fetchOrganizations();
  }, [user]);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers();
    }
  }, [selectedOrg]);

  const loadMembers = async () => {
    if (!selectedOrg) return;

    try {
      setLoading(true);
      const memberIds = selectedOrg.members || [];
      const membersList = [];

      for (const memberId of memberIds) {
        const usersQuery = query(
          collection(db, 'users'),
          where('uid', '==', memberId)
        );

        const snapshot = await getDocs(usersQuery);
        snapshot.forEach((doc) => {
          const userData = doc.data();
          membersList.push({
            id: doc.id,
            uid: userData.uid,
            email: userData.email,
            name: userData.name || userData.email?.split('@')[0] || 'User',
            photoURL: userData.photoURL || userData.profilePictureUrl || null,
            role: userData.uid === selectedOrg.ownerId ? 'Account Owner' : 'Member',
            joinedAt: userData.invitedAt,
            isOwner: userData.uid === selectedOrg.ownerId
          });
        });
      }

      // Sort: owner first, then alphabetically by name
      membersList.sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return a.name.localeCompare(b.name);
      });

      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter members by search term
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDeleteMember = async (member) => {
    if (!selectedOrg || !user) return;

    // Check if current user is the owner (check both uid and id)
    const isOwner = selectedOrg.ownerId === user.uid || selectedOrg.ownerId === user.id;
    if (!isOwner) {
      alert('Only the organization owner can remove members.');
      return;
    }

    // Prevent owner from deleting themselves
    if (member.uid === selectedOrg.ownerId) {
      alert('Organization owner cannot be removed.');
      return;
    }

    setDeleteConfirm(member);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !selectedOrg) return;

    try {
      setDeleting(true);

      // Remove member from organization's members array
      const orgRef = doc(db, 'organizations', selectedOrg.id);
      await updateDoc(orgRef, {
        members: arrayRemove(deleteConfirm.uid)
      });

      // Optionally: Delete user's document if they're not in any other organizations
      // For now, we'll just remove them from the organization

      setDeleteConfirm(null);
      
      // Reload members
      await loadMembers();
      
      // Update selectedOrg in state
      const updatedOrg = {
        ...selectedOrg,
        members: selectedOrg.members.filter(id => id !== deleteConfirm.uid)
      };
      setSelectedOrg(updatedOrg);

      alert(`${deleteConfirm.name} has been removed from ${selectedOrg.name}`);
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to remove member: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div className="org-members-container"><p>Loading members...</p></div>;
  }

  return (
    <div className="org-members-container">
      <div className="org-members-header">
        <div>
          <h2>👥 Organization Members</h2>
          <p className="subtitle">Manage and view all members in your organizations</p>
        </div>

        {/* Organization Selector */}
        {organizations.length > 0 && (
          <div className="org-selector-section">
            <label htmlFor="org-select">Organization:</label>
            <select
              id="org-select"
              value={selectedOrg?.id || ''}
              onChange={(e) => {
                const org = organizations.find(o => o.id === e.target.value);
                setSelectedOrg(org);
                setCurrentPage(1);
                setSearchTerm('');
              }}
              className="org-select"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search and Stats */}
      <div className="members-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
        <div className="members-stats">
          <span className="stat-badge">
            Total Members: <strong>{filteredMembers.length}</strong>
          </span>
        </div>
      </div>

      {/* Members Table */}
      {currentMembers.length === 0 ? (
        <div className="no-members">
          <p>No members found. {searchTerm ? 'Try a different search term.' : 'Invite members to get started!'}</p>
        </div>
      ) : (
        <>
          {/* Debug info - remove after testing */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{padding: '10px', background: '#f0f0f0', marginBottom: '10px', fontSize: '12px'}}>
              <strong>Debug:</strong> User UID: {user?.uid || 'null'} | Owner ID: {selectedOrg?.ownerId || 'null'} | 
              Match: {(selectedOrg?.ownerId === user?.uid) ? 'YES ✅' : 'NO ❌'} |
              User ID: {user?.id || 'null'}
            </div>
          )}
          
          <div className="table-container">
            <table className="members-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {(selectedOrg?.ownerId === user?.uid || selectedOrg?.ownerId === user?.id) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentMembers.map((member, index) => (
                  <tr key={member.id}>
                    <td className="number-cell">{indexOfFirstMember + index + 1}</td>
                    <td className="member-cell">
                      <div className="member-info-row">
                        <div className="member-avatar-small">
                          {member.photoURL ? (
                            <img src={member.photoURL} alt={member.name} />
                          ) : (
                            <span>{member.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <strong>{member.name}</strong>
                      </div>
                    </td>
                    <td className="email-cell">{member.email}</td>
                    <td className="org-cell">
                      <span className="org-badge">{selectedOrg?.name || 'N/A'}</span>
                    </td>
                    <td className="role-cell">
                      {member.isOwner ? (
                        <span className="role-badge owner">👑 Owner</span>
                      ) : (
                        <span className="role-badge member">👤 Member</span>
                      )}
                    </td>
                    <td className="date-cell">{formatDate(member.joinedAt)}</td>
                    {(selectedOrg?.ownerId === user?.uid || selectedOrg?.ownerId === user?.id) && (
                      <td className="actions-cell">
                        {!member.isOwner && (
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="delete-btn"
                            title="Remove member"
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="page-btn"
              >
                ← Previous
              </button>
              
              <div className="page-numbers">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`page-number ${currentPage === pageNumber ? 'active' : ''}`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                    return <span key={pageNumber} className="page-ellipsis">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="page-btn"
              >
                Next →
              </button>
            </div>
          )}

          <div className="pagination-info">
            Showing {indexOfFirstMember + 1} to {Math.min(indexOfLastMember, filteredMembers.length)} of {filteredMembers.length} members
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⚠️ Remove Member</h3>
            <p>
              Are you sure you want to remove <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email}) 
              from <strong>{selectedOrg?.name}</strong>?
            </p>
            <p className="warning-text">
              This action will remove their access to the organization.
            </p>
            <div className="modal-actions">
              <button
                onClick={cancelDelete}
                className="cancel-btn"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="confirm-delete-btn"
                disabled={deleting}
              >
                {deleting ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationMembers;
