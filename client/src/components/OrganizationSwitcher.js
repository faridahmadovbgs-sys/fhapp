import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import './OrganizationSwitcher.css';

const OrganizationSwitcher = () => {
  const { organizations, currentOrganization, currentOrgRole, switchOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || organizations.length === 0) {
    return null;
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'account_owner':
        return { icon: '👑', label: 'Owner', color: '#10b981' };
      case 'sub_account_owner':
        return { icon: '👤', label: 'Sub Owner', color: '#3b82f6' };
      case 'member':
        return { icon: '👥', label: 'Member', color: '#6b7280' };
      default:
        return { icon: '👤', label: 'Member', color: '#6b7280' };
    }
  };

  const currentRoleBadge = currentOrgRole ? getRoleBadge(currentOrgRole) : null;

  return (
    <div className="org-switcher" ref={dropdownRef}>
      <button
        className="org-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch Organization"
      >
        <div className="org-switcher-current">
          <span className="org-icon">🏢</span>
          <div className="org-info">
            <span className="org-name">{currentOrganization?.name || 'Select Org'}</span>
            {currentRoleBadge && (
              <span className="org-role-badge" style={{ backgroundColor: currentRoleBadge.color }}>
                {currentRoleBadge.icon} {currentRoleBadge.label}
              </span>
            )}
          </div>
        </div>
        <span className={`org-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="org-switcher-dropdown">
          <div className="org-dropdown-header">
            <span>Switch Organization</span>
            <span className="org-count">{organizations.length}</span>
          </div>
          <div className="org-dropdown-list">
            {organizations.map((org) => {
              const roleBadge = getRoleBadge(org.userRole);
              const isActive = currentOrganization?.id === org.id;

              return (
                <button
                  key={org.id}
                  className={`org-dropdown-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    switchOrganization(org);
                    setIsOpen(false);
                  }}
                >
                  <div className="org-item-content">
                    <div className="org-item-main">
                      <span className="org-item-icon">🏢</span>
                      <div className="org-item-info">
                        <span className="org-item-name">{org.name}</span>
                        {org.subAccountOwner && (
                          <span className="org-item-sub">
                            Under: {org.subAccountOwner}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="org-item-badge"
                      style={{ backgroundColor: roleBadge.color }}
                    >
                      {roleBadge.icon} {roleBadge.label}
                    </span>
                  </div>
                  {isActive && <span className="org-item-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSwitcher;
