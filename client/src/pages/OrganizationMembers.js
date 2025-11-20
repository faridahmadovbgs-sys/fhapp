import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserOrganizations } from '../services/organizationService';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

      {/* Members Grid */}
      {currentMembers.length === 0 ? (
        <div className="no-members">
          <p>No members found. {searchTerm ? 'Try a different search term.' : 'Invite members to get started!'}</p>
        </div>
      ) : (
        <>
          <div className="members-grid">
            {currentMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-avatar">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {member.name}
                    {member.isOwner && <span className="owner-badge">Owner</span>}
                  </div>
                  <div className="member-email">{member.email}</div>
                  <div className="member-role">{member.role}</div>
                  {member.joinedAt && (
                    <div className="member-joined">Joined: {formatDate(member.joinedAt)}</div>
                  )}
                </div>
              </div>
            ))}
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
    </div>
  );
};

export default OrganizationMembers;
