import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

// Generate a unique invitation link for account owner
export const createInvitationLink = async (userId, email, organizationName) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Generate unique token (simple UUID-like)
    const token = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create invitation document
    const invitationRef = await addDoc(collection(db, 'invitations'), {
      accountOwnerId: userId,
      accountOwnerEmail: email,
      organizationName: organizationName,
      token: token,
      status: 'active',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      usedCount: 0,
      description: `Join ${organizationName}`
    });

    console.log('✅ Invitation link created:', token);

    return {
      success: true,
      token: token,
      invitationId: invitationRef.id,
      link: `${window.location.origin}/register/member?token=${token}`
    };
  } catch (error) {
    console.error('Error creating invitation link:', error);
    throw error;
  }
};

// Get account owner's active invitation link
export const getAccountOwnerInvitationLink = async (userId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const q = query(
      collection(db, 'invitations'),
      where('accountOwnerId', '==', userId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const inviteDoc = querySnapshot.docs[0];
    const inviteData = { id: inviteDoc.id, ...inviteDoc.data() };

    return {
      success: true,
      invitationId: inviteData.id,
      token: inviteData.token,
      link: `${window.location.origin}/register/member?token=${inviteData.token}`,
      organizationName: inviteData.organizationName,
      createdAt: inviteData.createdAt,
      usedCount: inviteData.usedCount || 0,
      description: inviteData.description
    };
  } catch (error) {
    console.error('Error getting invitation link:', error);
    throw error;
  }
};

// Regenerate invitation link (deactivate old, create new)
export const regenerateInvitationLink = async (userId, organizationName) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Deactivate old invitation
    const q = query(
      collection(db, 'invitations'),
      where('accountOwnerId', '==', userId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const oldInviteDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'invitations', oldInviteDoc.id), {
        status: 'replaced'
      });
    }

    // Create new invitation
    const newInvite = await createInvitationLink(userId, '', organizationName);
    
    return newInvite;
  } catch (error) {
    console.error('Error regenerating invitation link:', error);
    throw error;
  }
};

// Update invitation usage count when someone registers
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

// Get all users invited by account owner
export const getInvitedUsers = async (accountOwnerId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const q = query(
      collection(db, 'users'),
      where('ownerUserId', '==', accountOwnerId)
    );

    const querySnapshot = await getDocs(q);
    const users = [];

    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      users: users,
      count: users.length
    };
  } catch (error) {
    console.error('Error getting invited users:', error);
    throw error;
  }
};
