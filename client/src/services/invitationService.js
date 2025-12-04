import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

// Generate a unique invitation link for account owner or sub-account owner
export const createInvitationLink = async (userId, email, organizationName, organizationId, subAccountOwnerId = null, subAccountName = null, role = 'member') => {
  try {
    console.log('🔗 Creating invitation link for:', { userId, email, organizationName, organizationId, subAccountOwnerId, subAccountName, role });
    
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Generate unique token - combine userId, timestamp, and multiple random values for strong uniqueness
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substr(2, 9);
    const random2 = Math.random().toString(36).substr(2, 9);
    const random3 = Math.random().toString(36).substr(2, 9);
    const token = `${userId}-${timestamp}-${random1}-${random2}-${random3}`;

    console.log('📝 Generated unique token:', token);
    console.log('📝 Token components:', { userId, timestamp, random1, random2, random3 });

    // Create invitation document (single-use)
    const invitationData = {
      accountOwnerId: userId,
      accountOwnerEmail: email,
      organizationName: organizationName,
      organizationId: organizationId,
      token: token,
      role: role === 'sub_account_owner' ? 'sub_account_owner' : 'member', // Support both member and sub_account_owner
      status: 'active',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry for single-use links
      usedCount: 0,
      maxUses: 1, // Single use only
      description: `Join ${organizationName}`
    };

    // Add sub-account owner info if provided
    if (subAccountOwnerId && subAccountName) {
      invitationData.subAccountOwnerId = subAccountOwnerId;
      invitationData.subAccountName = subAccountName;
      invitationData.description = `Join ${organizationName} - ${subAccountName}`;
    }

    const invitationRef = await addDoc(collection(db, 'invitations'), invitationData);

    console.log('✅ Invitation document created with ID:', invitationRef.id);

    const link = `${window.location.origin}/register/member?token=${token}`;
    console.log('🔗 Full invitation link:', link);

    return {
      success: true,
      token: token,
      invitationId: invitationRef.id,
      link: link
    };
  } catch (error) {
    console.error('❌ Error creating invitation link:', error);
    throw error;
  }
};

// Get account owner's invitation link for specific organization and role
export const getAccountOwnerInvitationLink = async (userId, organizationId, role = 'member') => {
  try {
    console.log('🔍 Fetching invitation for userId:', userId, 'organizationId:', organizationId, 'role:', role);
    
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Query invitations - simplified to avoid index requirement
    let q = query(
      collection(db, 'invitations'),
      where('accountOwnerId', '==', userId),
      where('status', '==', 'active')
    );

    let querySnapshot = await getDocs(q);
    console.log('📊 Active invitations found:', querySnapshot.docs.length);

    if (querySnapshot.empty) {
      console.warn('⚠️ No invitation found for userId:', userId);
      return null;
    }

    // Filter by organizationId and role in memory, get most recent
    const matchingDocs = querySnapshot.docs
      .filter(doc => {
        const data = doc.data();
        return data.organizationId === organizationId && data.role === role;
      })
      .sort((a, b) => {
        const aTime = a.data().createdAt?.toDate?.() || new Date(0);
        const bTime = b.data().createdAt?.toDate?.() || new Date(0);
        return bTime - aTime; // Most recent first
      });

    console.log('📊 Invitations matching organizationId and role:', matchingDocs.length);

    if (matchingDocs.length === 0) {
      console.warn('⚠️ No invitation found for organizationId:', organizationId, 'role:', role);
      return null;
    }

    // Use the most recent invitation
    const inviteDoc = matchingDocs[0];
    const inviteData = { id: inviteDoc.id, ...inviteDoc.data() };

    // Check if invitation has expired
    if (inviteData.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      console.warn('⚠️ Invitation has expired');
      return null;
    }

    console.log('✅ Found invitation:', {
      token: inviteData.token?.substring(0, 20) + '...',
      status: inviteData.status,
      role: inviteData.role,
      organizationName: inviteData.organizationName,
      organizationId: inviteData.organizationId,
      maxUses: inviteData.maxUses,
      usedCount: inviteData.usedCount
    });

    return {
      success: true,
      invitationId: inviteData.id,
      token: inviteData.token,
      link: `${window.location.origin}/register/member?token=${inviteData.token}`,
      organizationName: inviteData.organizationName,
      organizationId: inviteData.organizationId,
      role: inviteData.role,
      createdAt: inviteData.createdAt,
      usedCount: inviteData.usedCount || 0,
      maxUses: inviteData.maxUses || 1,
      description: inviteData.description
    };
  } catch (error) {
    console.error('❌ Error getting invitation link:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Return null instead of throwing to allow page to load
    return null;
  }
};

// Regenerate invitation link (deactivate old, create new)
export const regenerateInvitationLink = async (userId, organizationName, organizationId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Deactivate old invitation - simplified query
    const q = query(
      collection(db, 'invitations'),
      where('accountOwnerId', '==', userId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    
    // Filter by organizationId in memory and deactivate
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      if (data.organizationId === organizationId) {
        await updateDoc(doc(db, 'invitations', docSnapshot.id), {
          status: 'replaced'
        });
      }
    }

    // Create new invitation
    const newInvite = await createInvitationLink(userId, '', organizationName, organizationId);
    
    return newInvite;
  } catch (error) {
    console.error('Error regenerating invitation link:', error);
    throw error;
  }
};// Update invitation usage count when someone registers
export const recordInvitationUsage = async (invitationId, newUserId) => {
  try {
    if (!db || !invitationId) {
      throw new Error('Invalid parameters');
    }

    const inviteRef = doc(db, 'invitations', invitationId);
    const inviteDoc = await getDoc(inviteRef);

    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const currentCount = inviteDoc.data().usedCount || 0;

    await updateDoc(inviteRef, {
      usedCount: currentCount + 1,
      lastUsedAt: serverTimestamp(),
      lastUsedBy: newUserId
    });

    console.log('✅ Invitation usage recorded');
  } catch (error) {
    console.error('Error recording invitation usage:', error);
    throw error;
  }
};

// Get all users invited by account owner for specific organization
export const getInvitedUsers = async (accountOwnerId, organizationId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Query by ownerUserId only to avoid index requirement
    const q = query(
      collection(db, 'users'),
      where('ownerUserId', '==', accountOwnerId)
    );

    const querySnapshot = await getDocs(q);
    const users = [];

    // Filter by organizationId in memory
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.organizationId === organizationId) {
        users.push({
          id: doc.id,
          ...userData
        });
      }
    });

    console.log(`📊 Found ${users.length} invited users for org:`, organizationId);

    return {
      success: true,
      users: users,
      count: users.length
    };
  } catch (error) {
    console.error('❌ Error getting invited users:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Return empty list instead of throwing to allow page to load
    return {
      success: false,
      users: [],
      count: 0
    };
  }
};
