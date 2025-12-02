import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const ProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user?.id || !db) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const profilesQuery = query(
          collection(db, 'userProfiles'),
          where('userId', '==', user.id)
        );

        const querySnapshot = await getDocs(profilesQuery);
        const profilesList = [];
        let defaultProfile = null;
        
        querySnapshot.forEach((docSnap) => {
          const profileData = { id: docSnap.id, ...docSnap.data() };
          profilesList.push(profileData);
          
          if (profileData.isDefault) {
            defaultProfile = profileData;
          }
        });

        // Sort profiles: default first, then by creation date
        profilesList.sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        });

        setProfiles(profilesList);

        // Set active profile to default or first available
        if (defaultProfile) {
          setActiveProfile(defaultProfile);
        } else if (profilesList.length > 0) {
          setActiveProfile(profilesList[0]);
        }

        console.log('✅ Profiles loaded:', profilesList.length, 'Active:', defaultProfile?.profileName || profilesList[0]?.profileName);
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user]);

  // Switch active profile
  const switchProfile = (profile) => {
    if (profile && profile.id) {
      setActiveProfile(profile);
      console.log('🔄 Switched to profile:', profile.profileName);
    }
  };

  // Set profile as default
  const setAsDefault = async (profileId) => {
    try {
      // Unset all other defaults
      const updatePromises = profiles.map(profile => 
        updateDoc(doc(db, 'userProfiles', profile.id), { 
          isDefault: profile.id === profileId 
        })
      );
      await Promise.all(updatePromises);

      // Update local state
      const updatedProfiles = profiles.map(p => ({
        ...p,
        isDefault: p.id === profileId
      }));
      setProfiles(updatedProfiles);

      // Set as active if it's being set as default
      const newDefault = updatedProfiles.find(p => p.id === profileId);
      if (newDefault) {
        setActiveProfile(newDefault);
      }

      console.log('✅ Default profile updated');
      return true;
    } catch (err) {
      console.error('Error setting default:', err);
      return false;
    }
  };

  // Refresh profiles (after add/delete)
  const refreshProfiles = async () => {
    if (!user?.id || !db) return;

    try {
      const profilesQuery = query(
        collection(db, 'userProfiles'),
        where('userId', '==', user.id)
      );

      const querySnapshot = await getDocs(profilesQuery);
      const profilesList = [];
      let defaultProfile = null;
      
      querySnapshot.forEach((docSnap) => {
        const profileData = { id: docSnap.id, ...docSnap.data() };
        profilesList.push(profileData);
        
        if (profileData.isDefault) {
          defaultProfile = profileData;
        }
      });

      profilesList.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });

      setProfiles(profilesList);

      // Update active profile if needed
      if (activeProfile) {
        const updatedActive = profilesList.find(p => p.id === activeProfile.id);
        if (updatedActive) {
          setActiveProfile(updatedActive);
        } else if (profilesList.length > 0) {
          setActiveProfile(defaultProfile || profilesList[0]);
        } else {
          setActiveProfile(null);
        }
      } else if (profilesList.length > 0) {
        setActiveProfile(defaultProfile || profilesList[0]);
      }

      console.log('✅ Profiles refreshed');
    } catch (err) {
      console.error('Error refreshing profiles:', err);
    }
  };

  const value = {
    profiles,
    activeProfile,
    loading,
    switchProfile,
    setAsDefault,
    refreshProfiles
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
