import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';

// Create a new bill
export const createBill = async (billData) => {
  try {
    console.log('💰 Creating bill:', billData);
    
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const bill = {
      ...billData,
      status: 'active', // active, cancelled, completed
      createdAt: serverTimestamp(),
      totalPaid: 0,
      totalDue: billData.amount * (billData.memberIds?.length || 1),
      payments: []
    };

    const billRef = await addDoc(collection(db, 'bills'), bill);
    console.log('✅ Bill created:', billRef.id);

    return {
      success: true,
      billId: billRef.id,
      bill
    };
  } catch (error) {
    console.error('❌ Error creating bill:', error);
    throw error;
  }
};

// Get bills for organization (owner view)
export const getOrganizationBills = async (organizationId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const q = query(
      collection(db, 'bills'),
      where('organizationId', '==', organizationId)
    );

    const querySnapshot = await getDocs(q);
    const bills = [];

    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by createdAt in memory (newest first)
    bills.sort((a, b) => {
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    });

    // Fetch payments for each bill
    for (let bill of bills) {
      const paymentsResult = await getBillPayments(bill.id);
      bill.payments = paymentsResult.payments;
    }

    console.log(`✅ Found ${bills.length} bills for organization`);

    return {
      success: true,
      bills
    };
  } catch (error) {
    console.error('❌ Error fetching organization bills:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return {
      success: false,
      bills: []
    };
  }
};

// Get bills for member
export const getMemberBills = async (memberId, organizationId, userRole = null) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    // Get all bills for the organization
    const q = query(
      collection(db, 'bills'),
      where('organizationId', '==', organizationId)
    );

    const querySnapshot = await getDocs(q);
    const bills = [];

    querySnapshot.forEach((doc) => {
      const billData = doc.data();
      // Sub account owners can see all organization bills
      // Regular members only see bills assigned to them
      const isSubAccountOwner = userRole === 'sub_account_owner';
      const isAccountOwner = userRole === 'account_owner';
      
      if (isSubAccountOwner || isAccountOwner || !billData.memberIds || billData.memberIds.includes(memberId)) {
        bills.push({
          id: doc.id,
          ...billData
        });
      }
    });

    // Get payment status for each bill
    for (let bill of bills) {
      const paymentStatus = await getMemberPaymentStatus(bill.id, memberId);
      bill.paymentStatus = paymentStatus;
    }

    console.log(`✅ Found ${bills.length} bills for member (role: ${userRole || 'user'})`);

    return {
      success: true,
      bills
    };
  } catch (error) {
    console.error('❌ Error fetching member bills:', error);
    return {
      success: false,
      bills: []
    };
  }
};

// Record a payment
export const recordPayment = async (paymentData) => {
  try {
    console.log('💳 Recording payment:', paymentData);
    
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const payment = {
      ...paymentData,
      paidAt: serverTimestamp(),
      status: 'completed',
      paymentMethod: paymentData.paymentMethod || 'manual'
    };

    const paymentRef = await addDoc(collection(db, 'payments'), payment);
    console.log('✅ Payment recorded:', paymentRef.id);

    // Update bill with payment info
    const billRef = doc(db, 'bills', paymentData.billId);
    const billDoc = await getDoc(billRef);
    
    if (billDoc.exists()) {
      const billData = billDoc.data();
      const newTotalPaid = (billData.totalPaid || 0) + paymentData.amount;
      
      await updateDoc(billRef, {
        totalPaid: newTotalPaid,
        lastPaymentAt: serverTimestamp()
      });
      
      console.log('✅ Bill updated with payment');
    }

    return {
      success: true,
      paymentId: paymentRef.id,
      payment
    };
  } catch (error) {
    console.error('❌ Error recording payment:', error);
    throw error;
  }
};

// Get all payments for a bill
export const getBillPayments = async (billId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const q = query(
      collection(db, 'payments'),
      where('billId', '==', billId)
    );

    const querySnapshot = await getDocs(q);
    const payments = [];

    querySnapshot.forEach((doc) => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      payments
    };
  } catch (error) {
    console.error('❌ Error fetching bill payments:', error);
    return {
      success: false,
      payments: []
    };
  }
};

// Get payment status for member on specific bill
export const getMemberPaymentStatus = async (billId, memberId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const q = query(
      collection(db, 'payments'),
      where('billId', '==', billId),
      where('memberId', '==', memberId)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        paid: false,
        amount: 0,
        paidAt: null
      };
    }

    const paymentData = querySnapshot.docs[0].data();
    return {
      paid: true,
      amount: paymentData.amount,
      paidAt: paymentData.paidAt,
      paymentMethod: paymentData.paymentMethod
    };
  } catch (error) {
    console.error('❌ Error fetching payment status:', error);
    return {
      paid: false,
      amount: 0,
      paidAt: null
    };
  }
};

// Update bill status
export const updateBillStatus = async (billId, status) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const billRef = doc(db, 'bills', billId);
    await updateDoc(billRef, {
      status,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Bill status updated:', status);

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error updating bill status:', error);
    throw error;
  }
};

// Update bill member assignments
export const updateBillMembers = async (billId, memberIds) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const billRef = doc(db, 'bills', billId);
    
    // If memberIds is null or empty, it means "all members"
    const updateData = {
      memberIds: memberIds && memberIds.length > 0 ? memberIds : null,
      updatedAt: serverTimestamp()
    };

    await updateDoc(billRef, updateData);
    
    console.log('✅ Bill members updated:', memberIds);

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error updating bill members:', error);
    throw error;
  }
};

// Get payment history for member
export const getMemberPaymentHistory = async (memberId, organizationId) => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const q = query(
      collection(db, 'payments'),
      where('memberId', '==', memberId),
      where('organizationId', '==', organizationId)
    );

    const querySnapshot = await getDocs(q);
    const payments = [];

    querySnapshot.forEach((doc) => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by date (newest first)
    payments.sort((a, b) => {
      const dateA = a.paidAt?.toMillis() || 0;
      const dateB = b.paidAt?.toMillis() || 0;
      return dateB - dateA;
    });

    return {
      success: true,
      payments
    };
  } catch (error) {
    console.error('❌ Error fetching payment history:', error);
    return {
      success: false,
      payments: []
    };
  }
};

export default {
  createBill,
  getOrganizationBills,
  getMemberBills,
  recordPayment,
  getBillPayments,
  getMemberPaymentStatus,
  updateBillStatus,
  updateBillMembers,
  getMemberPaymentHistory
};
