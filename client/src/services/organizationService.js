import { db } from '../config/firebase';
import { 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc 
} from 'firebase/firestore';

// Create a new organization
export const createOrganization = async (ownerId, ownerEmail, organizationName, ein = null) => {
  try {
    console.log('🏢 Creating organization:', { ownerId, organizationName, ein });
    
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Generate unique organization ID
    const orgId = `org-${ownerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create organization document
    const orgData = {
      id: orgId,
      name: organizationName,
      ein: ein,
      ownerId: ownerId,
      ownerEmail: ownerEmail,
      members: [ownerId], // Owner is automatically a member
      createdAt: serverTimestamp(),
      status: 'active'
    };

    await setDoc(doc(db, 'organizations', orgId), orgData);

    console.log('✅ Organization created:', orgId);

    return {
      success: true,
      organizationId: orgId,
      organization: orgData
    };
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    throw error;
  }
};

// Get all organizations owned by a user
export const getUserOrganizations = async (userId) => {
  try {
    if (!db || !userId) {
      throw new Error('Invalid parameters');
    }

    console.log('🔍 Fetching organizations for user:', userId);

    const q = query(
      collection(db, 'organizations'),
      where('ownerId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const organizations = [];

    querySnapshot.forEach((doc) => {
      organizations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Found ${organizations.length} organizations`);

    return {
      success: true,
      organizations: organizations
    };
  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    throw error;
  }
};

// Get organization that a user is a member of
export const getUserMemberOrganizations = async (userId) => {
  try {
    if (!db || !userId) {
      throw new Error('Invalid parameters');
    }

    console.log('🔍 Fetching member organizations for user:', userId);
    console.log('🔍 User ID type:', typeof userId, 'Value:', userId);

    const q = query(
      collection(db, 'organizations'),
      where('members', 'array-contains', userId)
    );

    const querySnapshot = await getDocs(q);
    const organizations = [];

    querySnapshot.forEach((doc) => {
      const orgData = doc.data();
      console.log('📦 Found organization:', doc.id, 'Name:', orgData.name, 'Members:', orgData.members);
      organizations.push({
        id: doc.id,
        ...orgData
      });
    });

    console.log(`✅ Found ${organizations.length} member organizations for user:`, userId);

    return {
      success: true,
      organizations: organizations
    };
  } catch (error) {
    console.error('❌ Error fetching member organizations:', error);
    throw error;
  }
};

// Get ALL organizations for a user (owned + member of)
export const getAllUserOrganizations = async (userId) => {
  try {
    if (!db || !userId) {
      throw new Error('Invalid parameters');
    }

    console.log('🔍 Fetching all organizations for user:', userId);

    // Get organizations owned by user
    const ownedOrgs = await getUserOrganizations(userId);
    
    // Get organizations user is a member of
    const memberOrgs = await getUserMemberOrganizations(userId);

    // Combine and deduplicate
    const allOrgsMap = new Map();
    
    // Add owned organizations
    if (ownedOrgs.success && ownedOrgs.organizations) {
      ownedOrgs.organizations.forEach(org => {
        allOrgsMap.set(org.id, { ...org, isOwner: true });
      });
    }
    
    // Add member organizations (don't override if already owned)
    if (memberOrgs.success && memberOrgs.organizations) {
      memberOrgs.organizations.forEach(org => {
        if (!allOrgsMap.has(org.id)) {
          allOrgsMap.set(org.id, { ...org, isOwner: false });
        }
      });
    }

    const organizations = Array.from(allOrgsMap.values());
    console.log(`✅ Found total ${organizations.length} organizations for user (owned + member)`);

    return {
      success: true,
      organizations: organizations
    };
  } catch (error) {
    console.error('❌ Error fetching all user organizations:', error);
    return {
      success: false,
      organizations: []
    };
  }
};

// Add member to organization
export const addMemberToOrganization = async (organizationId, userId) => {
  try {
    if (!db || !organizationId || !userId) {
      throw new Error('Invalid parameters');
    }

    console.log('➕ Adding member to organization:', { organizationId, userId });

    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      throw new Error('Organization not found');
    }

    const orgData = orgDoc.data();
    const members = orgData.members || [];

    if (members.includes(userId)) {
      console.log('ℹ️ User already a member');
      return { success: true, alreadyMember: true };
    }

    members.push(userId);

    await updateDoc(orgRef, {
      members: members,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Member added successfully');

    return { success: true };
  } catch (error) {
    console.error('❌ Error adding member:', error);
    throw error;
  }
};

// Get organization details
export const getOrganization = async (organizationId) => {
  try {
    if (!db || !organizationId) {
      throw new Error('Invalid parameters');
    }

    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      throw new Error('Organization not found');
    }

    return {
      success: true,
      organization: {
        id: orgDoc.id,
        ...orgDoc.data()
      }
    };
  } catch (error) {
    console.error('❌ Error fetching organization:', error);
    throw error;
  }
};

// Get organization members with their details
export const getOrganizationMembers = async (organizationId) => {
  try {
    if (!db || !organizationId) {
      throw new Error('Invalid parameters');
    }

    const orgResult = await getOrganization(organizationId);
    const memberIds = orgResult.organization.members || [];

    const members = [];
    for (const memberId of memberIds) {
      const userRef = doc(db, 'users', memberId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        members.push({
          id: userDoc.id,
          ...userDoc.data()
        });
      }
    }

    return {
      success: true,
      members: members
    };
  } catch (error) {
    console.error('❌ Error fetching organization members:', error);
    throw error;
  }
};

// Update organization information
export const updateOrganization = async (organizationId, updateData) => {
  try {
    if (!db || !organizationId) {
      throw new Error('Invalid parameters');
    }

    console.log('🔄 Updating organization:', organizationId, updateData);

    const orgRef = doc(db, 'organizations', organizationId);
    await updateDoc(orgRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Organization updated successfully');

    return {
      success: true,
      message: 'Organization updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating organization:', error);
    throw error;
  }
};

const organizationService = {
  createOrganization,
  getUserOrganizations,
  getUserMemberOrganizations,
  addMemberToOrganization,
  getOrganization,
  getOrganizationMembers,
  updateOrganization
};

export default organizationService;
