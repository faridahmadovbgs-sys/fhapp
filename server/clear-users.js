// Clear all users from Firestore
// Run with: node clear-users.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Firebase config (same as client)
const firebaseConfig = {
  apiKey: "AIzaSyBYG7mANiuKWSHvZKOTuR-Jjgx0ZwTgcvE",
  authDomain: "fhapp-ca321.firebaseapp.com",
  projectId: "fhapp-ca321",
  storageBucket: "fhapp-ca321.firebasestorage.app",
  messagingSenderId: "321828975722",
  appId: "1:321828975722:web:b1c8e8ab6462f74eb8c613",
  measurementId: "G-C13GEDVMBF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearFirestoreUsers() {
  console.log('🗑️  Clearing all user documents from Firestore...');

  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    let deletedCount = 0;
    const deletePromises = [];

    querySnapshot.forEach((document) => {
      console.log(`Deleting user: ${document.id} (${document.data().email || 'no email'})`);
      const deletePromise = deleteDoc(doc(db, 'users', document.id));
      deletePromises.push(deletePromise);
      deletedCount++;
    });

    // Wait for all deletions to complete
    await Promise.all(deletePromises);

    console.log(`✅ Successfully deleted ${deletedCount} user documents from Firestore`);

  } catch (error) {
    console.error('❌ Error clearing users from Firestore:', error);
  }
}

async function main() {
  console.log('🚨 WARNING: This will delete ALL user data from Firestore!');
  console.log('🔥 Firebase Authentication users will NOT be deleted (requires Admin SDK)');
  console.log('📋 Only Firestore user profile documents will be removed\n');

  try {
    await clearFirestoreUsers();
    console.log('\n🎉 User data clearing completed!');
    console.log('\n📝 Note: Firebase Auth users still exist. To remove them completely:');
    console.log('   1. Go to Firebase Console → Authentication → Users');
    console.log('   2. Manually delete users, or');
    console.log('   3. Use Firebase Admin SDK for programmatic deletion');

  } catch (error) {
    console.error('❌ Error during user clearing:', error);
  }
}

// Run the clearing script
main();