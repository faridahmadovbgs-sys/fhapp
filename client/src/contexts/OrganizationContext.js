import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getAllUserOrganizations } from '../services/organizationService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [currentOrgRole, setCurrentOrgRole] = useState(null); // Role in current org
  const [loading, setLoading] = useState(true);

  // Fetch all user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id || !db) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 [OrgContext] Fetching organizations for user:', user.id);

        // Get all organizations (owned + member)
        const result = await getAllUserOrganizations(user.id);
        const orgs = result.organizations || [];

        // Get user data to determine roles
        const userDoc = await getDoc(doc(db, 'users', user.id));
        const userData = userDoc.exists() ? userDoc.data() : {};

        // Enhance each organization with role information
        const enhancedOrgs = orgs.map(org => {
          let role = 'member';
          let subAccountOwner = null;

          // Check if user is the organization owner (they're always account_owner for their own org)
          if (org.ownerId === user.id) {
            role = 'account_owner';
          } 
          // Check if user has an explicit organization role (from invitation)
          else if (userData.organizationRoles && userData.organizationRoles[org.id]) {
            role = userData.organizationRoles[org.id];
            // If they're a sub_account_owner and have sub-account info, get it
            if (role === 'sub_account_owner' && userData.subAccountOwners && userData.subAccountOwners[org.id]) {
              subAccountOwner = userData.subAccountOwners[org.id].ownerName;
            }
          }
          // Legacy: Check if user has a sub-account owner info (old logic)
          else if (userData.subAccountOwners && userData.subAccountOwners[org.id]) {
            role = 'member'; // They're under a sub-account owner but are themselves a member
            subAccountOwner = userData.subAccountOwners[org.id].ownerName;
          }

          return {
            ...org,
            userRole: role,
            subAccountOwner: subAccountOwner
          };
        });

        console.log('✅ [OrgContext] Loaded organizations:', enhancedOrgs.length);
        setOrganizations(enhancedOrgs);

        // Set first organization as current if none selected
        if (enhancedOrgs.length > 0 && !currentOrganization) {
          switchOrganization(enhancedOrgs[0]);
        }
      } catch (error) {
        console.error('❌ [OrgContext] Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]);

  // Switch to a different organization
  const switchOrganization = (org) => {
    if (!org) return;

    console.log('🔄 [OrgContext] Switching to organization:', org.name, 'Role:', org.userRole);
    setCurrentOrganization(org);
    setCurrentOrgRole(org.userRole);

    // Store in localStorage for persistence
    localStorage.setItem('currentOrganizationId', org.id);

    // Dispatch custom event for other contexts to listen to
    window.dispatchEvent(new CustomEvent('organizationRoleChanged', { 
      detail: { role: org.userRole, organizationId: org.id, organizationName: org.name } 
    }));
  };

  // Refresh organizations list
  const refreshOrganizations = async () => {
    if (!user?.id) return;

    try {
      const result = await getAllUserOrganizations(user.id);
      const orgs = result.organizations || [];

      // Get user data to determine roles
      const userDoc = await getDoc(doc(db, 'users', user.id));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const enhancedOrgs = orgs.map(org => {
        let role = 'member';
        let subAccountOwner = null;

        if (org.ownerId === user.id) {
          role = 'account_owner';
        } else if (userData.organizationRoles && userData.organizationRoles[org.id]) {
          role = userData.organizationRoles[org.id];
          if (role === 'sub_account_owner' && userData.subAccountOwners && userData.subAccountOwners[org.id]) {
            subAccountOwner = userData.subAccountOwners[org.id].ownerName;
          }
        } else if (userData.subAccountOwners && userData.subAccountOwners[org.id]) {
          role = 'member';
          subAccountOwner = userData.subAccountOwners[org.id].ownerName;
        }

        return {
          ...org,
          userRole: role,
          subAccountOwner: subAccountOwner
        };
      });

      setOrganizations(enhancedOrgs);

      // Update current org if it's still in the list
      if (currentOrganization) {
        const updatedCurrentOrg = enhancedOrgs.find(o => o.id === currentOrganization.id);
        if (updatedCurrentOrg) {
          setCurrentOrganization(updatedCurrentOrg);
          setCurrentOrgRole(updatedCurrentOrg.userRole);
        }
      }

      console.log('🔄 [OrgContext] Organizations refreshed');
    } catch (error) {
      console.error('❌ [OrgContext] Error refreshing organizations:', error);
    }
  };

  const value = {
    organizations,
    currentOrganization,
    currentOrgRole,
    loading,
    switchOrganization,
    refreshOrganizations
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
