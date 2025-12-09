import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const AccountContext = createContext();

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

export const AccountProvider = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [operatingAsUser, setOperatingAsUser] = useState(true); // Default to User mode
  const [loading, setLoading] = useState(true);

  // Fetch user sub profiles
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user?.id || !db) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const accountsQuery = query(
          collection(db, 'subProfiles'),
          where('userId', '==', user.id)
        );

        const querySnapshot = await getDocs(accountsQuery);
        const accountsList = [];
        let defaultAccount = null;
        
        querySnapshot.forEach((docSnap) => {
          const accountData = { id: docSnap.id, ...docSnap.data() };
          accountsList.push(accountData);
          
          if (accountData.isDefault) {
            defaultAccount = accountData;
          }
        });

        // Sort accounts: default first, then by creation date
        accountsList.sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        });

        setAccounts(accountsList);

        // Default to User mode - don't automatically set an active sub profile
        // Users can manually switch to a sub profile if needed
        setActiveAccount(null);
        setOperatingAsUser(true);

        console.log('✅ Sub profiles loaded:', accountsList.length, 'Defaulting to User mode');
      } catch (err) {
        console.error('Error fetching sub profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  // Switch active sub profile
  const switchAccount = (account) => {
    if (account && account.id) {
      setActiveAccount(account);
      setOperatingAsUser(false); // Switch to sub profile mode
      console.log('🔄 Switched to sub profile:', account.accountName);
    }
  };

  // Switch to user mode (operate as user, not account)
  const switchToUserMode = () => {
    setActiveAccount(null);
    setOperatingAsUser(true);
    console.log('👤 Switched to user mode:', user?.displayName || user?.email);
  };

  // Switch to sub profile mode with specific sub profile or default
  const switchToAccountMode = (account = null) => {
    if (account) {
      switchAccount(account);
    } else {
      // Switch to default or first sub profile
      const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];
      if (defaultAcc) {
        switchAccount(defaultAcc);
      }
    }
  };

  // Set sub profile as default
  const setAsDefault = async (accountId) => {
    try {
      // Unset all other defaults
      const updatePromises = accounts.map(account => 
        updateDoc(doc(db, 'subProfiles', account.id), { 
          isDefault: account.id === accountId 
        })
      );
      await Promise.all(updatePromises);

      // Update local state
      const updatedAccounts = accounts.map(a => ({
        ...a,
        isDefault: a.id === accountId
      }));
      setAccounts(updatedAccounts);

      // Set as active if it's being set as default
      const newDefault = updatedAccounts.find(a => a.id === accountId);
      if (newDefault) {
        setActiveAccount(newDefault);
      }

      console.log('✅ Default sub profile updated');
      return true;
    } catch (err) {
      console.error('Error setting default:', err);
      return false;
    }
  };

  // Refresh sub profiles (after add/delete)
  const refreshAccounts = async () => {
    if (!user?.id || !db) return;

    try {
      const accountsQuery = query(
        collection(db, 'subProfiles'),
        where('userId', '==', user.id)
      );

      const querySnapshot = await getDocs(accountsQuery);
      const accountsList = [];
      let defaultAccount = null;
      
      querySnapshot.forEach((docSnap) => {
        const accountData = { id: docSnap.id, ...docSnap.data() };
        accountsList.push(accountData);
        
        if (accountData.isDefault) {
          defaultAccount = accountData;
        }
      });

      accountsList.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });

      setAccounts(accountsList);

      // Update active account only if one was already active
      if (activeAccount) {
        const updatedActive = accountsList.find(a => a.id === activeAccount.id);
        if (updatedActive) {
          setActiveAccount(updatedActive);
        } else {
          // If active account was deleted, switch back to User mode
          setActiveAccount(null);
          setOperatingAsUser(true);
        }
      }
      // If no active account, keep User mode (don't auto-select)

      console.log('✅ Sub profiles refreshed');
    } catch (err) {
      console.error('Error refreshing sub profiles:', err);
    }
  };

  const value = {
    accounts,
    activeAccount,
    operatingAsUser,
    loading,
    switchAccount,
    switchToUserMode,
    switchToAccountMode,
    setAsDefault,
    refreshAccounts
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};
