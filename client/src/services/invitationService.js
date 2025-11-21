import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

// Generate a unique invitation link for account owner
export const createInvitationLink = async (userId, email, organizationName, organizationId) => {
  try {
    console.log('🔗 Creating invitation link for:', { userId, email, organizationName, organizationId });
    
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

    // Create invitation document
    const invitationRef = await addDoc(collection(db, 'invitations'), {
      accountOwnerId: userId,
      accountOwnerEmail: email,
      organizationName: organizationName,
      organizationId: organizationId,
      token: token,
      status: 'active',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      usedCount: 0,
      description: `Join ${organizationName}`
    });

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

// Get account owner's invitation link for specific organization
export const getAccountOwnerInvitationLink = async (userId, organizationId) => {
  try {
    console.log('🔍 Fetching invitation for userId:', userId, 'organizationId:', organizationId);
    
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

    // Filter by organizationId in memory
    const matchingDocs = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.organizationId === organizationId;
    });

    console.log('📊 Invitations matching organizationId:', matchingDocs.length);

    if (matchingDocs.length === 0) {
      console.warn('⚠️ No invitation found for organizationId:', organizationId);
      return null;
    }

    const inviteDoc = matchingDocs[0];
    const inviteData = { id: inviteDoc.id, ...inviteDoc.data() };

    console.log('✅ Found invitation:', {
      token: inviteData.token?.substring(0, 20) + '...',
      status: inviteData.status,
      organizationName: inviteData.organizationName,
      organizationId: inviteData.organizationId
    });

    return {
      success: true,
      invitationId: inviteData.id,
      token: inviteData.token,
      link: `${window.location.origin}/register/member?token=${inviteData.token}`,
      organizationName: inviteData.organizationName,
      organizationId: inviteData.organizationId,
      createdAt: inviteData.createdAt,
      usedCount: inviteData.usedCount || 0,
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
