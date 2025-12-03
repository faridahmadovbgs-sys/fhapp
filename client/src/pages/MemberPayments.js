import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { getUserMemberOrganizations } from '../services/organizationService';
import { 
  getMemberBills, 
  recordPayment, 
  getMemberPaymentHistory 
} from '../services/billingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './MemberPayments.css';
import './PersonalDocuments.css';

const MemberPayments = () => {
  const { user, loading: authLoading } = useAuth();
  const { activeAccount, operatingAsUser } = useAccount();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [bills, setBills] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [markPaidBill, setMarkPaidBill] = useState(null);
  const [manualPaymentAmount, setManualPaymentAmount] = useState('');
  const [manualPaymentNotes, setManualPaymentNotes] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'credit_card',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch user role
        if (user?.id && db) {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'user');
            console.log('✅ User role fetched:', userData.role);
          }
        }
        
        const result = await getUserMemberOrganizations(user.id);
        setOrganizations(result.organizations);
        
        if (result.organizations.length > 0 && !selectedOrg) {
          setSelectedOrg(result.organizations[0]);
        } else if (result.organizations.length === 0) {
          // No organizations, stop loading
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setError('Failed to load organizations');
        setLoading(false);
      }
    };
    
    fetchOrganizations();
  }, [user]);

  // Fetch bills and payment history when organization changes
  useEffect(() => {
    if (selectedOrg) {
      loadData();
    }
  }, [selectedOrg, user]);

  const loadData = async () => {
    if (!selectedOrg || !user) return;
    
    try {
      setLoading(true);
      
      // Load bills with user role
      const billsResult = await getMemberBills(user.id, selectedOrg.id, userRole);
      if (billsResult.success) {
        setBills(billsResult.bills);
      }
      
      // Load payment history
      const historyResult = await getMemberPaymentHistory(user.id, selectedOrg.id);
      if (historyResult.success) {
        setPaymentHistory(historyResult.payments);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFormChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const initiatePayment = (bill) => {
    // Show confirmation with operating mode
    let payingAs;
    if (operatingAsUser) {
      payingAs = `yourself (${user?.displayName || user?.email})`;
    } else if (activeAccount) {
      payingAs = `${activeAccount.accountName}${activeAccount.entityName ? ' (' + activeAccount.entityName + ')' : ''}`;
    } else {
      payingAs = 'yourself (no account selected)';
    }

    const confirmed = window.confirm(
      `You are about to make a payment:\n\n` +
      `Bill: ${bill.title}\n` +
      `Amount: $${bill.amount.toFixed(2)}\n\n` +
      `Paying as: ${payingAs}\n\n` +
      `Is this correct?`
    );

    if (confirmed) {
      setSelectedBill(bill);
      setShowPaymentForm(true);
      setError('');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedBill) return;

    // Validate form
    if (!paymentForm.cardNumber || !paymentForm.cardName || !paymentForm.expiryDate || !paymentForm.cvv) {
      setError('Please fill in all payment details');
      return;
    }

    try {
      // In production, you would integrate with Stripe, PayPal, etc.
      // For now, we'll simulate a successful payment
      
      const paymentData = {
        billId: selectedBill.id,
        memberId: user.id,
        memberName: user.name || user.email.split('@')[0],
        memberEmail: user.email,
        amount: selectedBill.amount,
        organizationId: selectedOrg.id,
        organizationName: selectedOrg.name,
        paymentMethod: paymentForm.paymentMethod,
        billTitle: selectedBill.title,
        billType: selectedBill.billType,
        // Capture active account information
        paidWithAccountId: activeAccount?.id || null,
        paidWithAccountName: activeAccount?.accountName || null,
        paidWithAccountType: activeAccount?.accountType || null,
        paidWithEntityName: activeAccount?.entityName || null
      };

      await recordPayment(paymentData);
      
      setSuccess('Payment processed successfully!');
      setShowPaymentForm(false);
      setSelectedBill(null);
      setPaymentForm({
        paymentMethod: 'credit_card',
        cardNumber: '',
        cardName: '',
        expiryDate: '',
        cvv: ''
      });
      
      // Reload data
      await loadData();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Payment failed: ' + error.message);
    }
  };

  const openMarkPaidModal = (bill) => {
    // Show confirmation with operating mode
    let payingAs;
    if (operatingAsUser) {
      payingAs = `yourself (${user?.displayName || user?.email})`;
    } else if (activeAccount) {
      payingAs = `${activeAccount.accountName}${activeAccount.entityName ? ' (' + activeAccount.entityName + ')' : ''}`;
    } else {
      payingAs = 'yourself (no account selected)';
    }

    const confirmed = window.confirm(
      `You are about to mark this bill as paid:\n\n` +
      `Bill: ${bill.title}\n` +
      `Amount: $${bill.amount.toFixed(2)}\n\n` +
      `Recording payment as: ${payingAs}\n\n` +
      `Is this correct?`
    );

    if (confirmed) {
      setMarkPaidBill(bill);
      setManualPaymentAmount(bill.amount.toString());
      setManualPaymentNotes('');
      setManualPaymentMethod('cash');
      setShowMarkPaidModal(true);
    }
  };

  const closeMarkPaidModal = () => {
    setShowMarkPaidModal(false);
    setMarkPaidBill(null);
    setManualPaymentAmount('');
    setManualPaymentNotes('');
    setManualPaymentMethod('cash');
  };

  const markAsPaidByMember = async () => {
    if (!markPaidBill) return;
    
    try {
      setError('');
      setSuccess('');

      const amount = parseFloat(manualPaymentAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid payment amount');
        return;
      }

      const paymentData = {
        billId: markPaidBill.id,
        billTitle: markPaidBill.title,
        memberId: user.id,
        memberName: user.displayName || user.email,
        memberEmail: user.email,
        organizationId: selectedOrg.id,
        organizationName: selectedOrg.name,
        amount: amount,
        paymentMethod: manualPaymentMethod,
        notes: manualPaymentNotes || 'Manually marked as paid by member',
        recordedBy: user.id,
        recordedByName: user.displayName || user.email,
        // Capture active account information
        paidWithAccountId: activeAccount?.id || null,
        paidWithAccountName: activeAccount?.accountName || null,
        paidWithAccountType: activeAccount?.accountType || null,
        paidWithEntityName: activeAccount?.entityName || null
      };

      await recordPayment(paymentData);
      
      setSuccess('Payment marked as paid!');
      closeMarkPaidModal();
      
      // Reload data
      await loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking payment:', error);
      setError('Failed to record payment: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatPaymentMethod = (method) => {
    const methods = {
      'cash': 'Cash',
      'check': 'Check',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'paypal': 'PayPal',
      'venmo': 'Venmo',
      'zelle': 'Zelle',
      'manual': 'Manual',
      'other': 'Other'
    };
    return methods[method] || method;
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      'cash': '💵',
      'check': '📝',
      'bank_transfer': '🏦',
      'credit_card': '💳',
      'debit_card': '💳',
      'paypal': '🅿️',
      'venmo': '📱',
      'zelle': '⚡',
      'manual': '✍️',
      'other': '📋'
    };
    return icons[method] || '💰';
  };

  const pendingBills = bills.filter(bill => 
    !bill.paymentStatus?.paid && bill.status === 'active'
  );

  const paidBills = bills.filter(bill => 
    bill.paymentStatus?.paid
  );

  if (authLoading || loading) {
    return <div className="member-payments"><p>Loading...</p></div>;
  }

  if (!user) {
    return <div className="member-payments"><p>Please log in to view your payments.</p></div>;
  }

  if (organizations.length === 0) {
    return (
      <div className="member-payments">
        <div className="payments-header">
          <div>
            <h2>💳 My Payments</h2>
            <p>View and pay your bills</p>
          </div>
        </div>
        <div className="empty-state">
          <p>You are not a member of any organization yet.</p>
          <p>Contact your organization administrator to be added as a member.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="member-payments">
      <div className="payments-header">
        <div>
          <h2>💳 My Payments</h2>
          <p>View and pay your bills</p>
        </div>
        
        {/* Organization Selector */}
        {organizations.length > 0 && (
          <div className="org-selector">
            <label>Organization:</label>
            <select
              value={selectedOrg?.id || ''}
              onChange={(e) => {
                const org = organizations.find(o => o.id === e.target.value);
                setSelectedOrg(org);
              }}
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card pending">
          <div className="summary-info">
            <h3>{pendingBills.length}</h3>
            <p>Pending Bills</p>
          </div>
        </div>
        
        <div className="summary-card paid">
          <div className="summary-info">
            <h3>{paidBills.length}</h3>
            <p>Paid Bills</p>
          </div>
        </div>
        
        <div className="summary-card total">
          <div className="summary-info">
            <h3>{formatCurrency(paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0))}</h3>
            <p>Total Paid</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Bills ({pendingBills.length})
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Payment History ({paymentHistory.length})
        </button>
      </div>

      {/* Pending Bills */}
      {activeTab === 'pending' && (
        <div className="bills-section">
          {pendingBills.length === 0 ? (
            <div className="empty-state">
              <p>🎉 No pending bills! You're all caught up.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Interval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBills.map((bill, index) => (
                    <tr key={bill.id}>
                      <td style={{textAlign: 'center', fontWeight: '600', color: '#2CA01C', fontSize: '12px'}}>{index + 1}</td>
                      <td>
                        <div style={{fontWeight: '600', fontSize: '13px', color: '#333'}}>{bill.title}</div>
                        {bill.description && (
                          <div style={{fontSize: '11px', color: '#999', marginTop: '2px'}}>{bill.description.substring(0, 40)}{bill.description.length > 40 ? '...' : ''}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${bill.billType === 'subscription' ? 'badge-info' : 'badge-secondary'}`}>
                          {bill.billType === 'subscription' ? 'Subscription' : 'One-Time'}
                        </span>
                      </td>
                      <td style={{fontSize: '14px', fontWeight: '700', color: '#2CA01C'}}>{formatCurrency(bill.amount)}</td>
                      <td style={{fontSize: '12px', color: '#666'}}>
                        {bill.dueDate ? formatDate(bill.dueDate) : 'N/A'}
                      </td>
                      <td style={{fontSize: '11px', color: '#666'}}>
                        {bill.billType === 'subscription' ? bill.subscriptionInterval : 'One-time'}
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '4px'}}>
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={() => initiatePayment(bill)}
                          >
                            Pay Now
                          </button>
                          <button 
                            className="btn btn-success btn-small"
                            onClick={() => openMarkPaidModal(bill)}
                          >
                            Mark Paid
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {activeTab === 'history' && (
        <div className="history-section">
          {paymentHistory.length === 0 ? (
            <div className="empty-state">
              <p>No payment history yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bill</th>
                    <th>Amount</th>
                    <th>Paid Date</th>
                    <th>Method</th>
                    <th>Account</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, index) => (
                    <tr key={payment.id}>
                      <td style={{textAlign: 'center', fontWeight: '600', color: '#2CA01C', fontSize: '12px'}}>{index + 1}</td>
                      <td>
                        <div style={{fontWeight: '600', fontSize: '13px', color: '#333'}}>{payment.billTitle}</div>
                      </td>
                      <td style={{fontSize: '14px', fontWeight: '700', color: '#2CA01C'}}>{formatCurrency(payment.amount)}</td>
                      <td style={{fontSize: '12px', color: '#666'}}>
                        {formatDate(payment.paidAt)}
                      </td>
                      <td style={{fontSize: '11px'}}>
                        {payment.paymentMethod ? (
                          <span>
                            {getPaymentMethodIcon(payment.paymentMethod)} {formatPaymentMethod(payment.paymentMethod)}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td style={{fontSize: '11px', color: '#666'}}>
                        {(payment.paidWithAccountName || payment.paidWithEntityName) ? (
                          <span className="badge badge-info">
                            {payment.paidWithAccountType === 'personal' && '👤'}
                            {payment.paidWithAccountType === 'llc' && '🏢'}
                            {payment.paidWithAccountType === 'trust' && '🏛️'}
                            {payment.paidWithAccountType === 'corporation' && '🏭'}
                            {payment.paidWithAccountType === 'partnership' && '🤝'}
                            {payment.paidWithAccountType === 'nonprofit' && '❤️'}
                            {payment.paidWithAccountType === 'other' && '📋'}
                            {' '}
                            {payment.paidWithEntityName || payment.paidWithAccountName}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td style={{fontSize: '11px', color: '#999', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {payment.notes || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedBill && (
        <div className="modal-overlay" onClick={() => setShowPaymentForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Make Payment</h3>
              <button className="close-btn" onClick={() => setShowPaymentForm(false)}>✖</button>
            </div>
            
            <div className="modal-body">
              <div className="payment-summary">
                <h4>Bill Details</h4>
                <div className="summary-row">
                  <span>Title:</span>
                  <span>{selectedBill.title}</span>
                </div>
                <div className="summary-row">
                  <span>Amount:</span>
                  <strong>{formatCurrency(selectedBill.amount)}</strong>
                </div>
                {selectedBill.dueDate && (
                  <div className="summary-row">
                    <span>Due Date:</span>
                    <span>{formatDate(selectedBill.dueDate)}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handlePaymentSubmit} className="payment-form">
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={paymentForm.paymentMethod}
                    onChange={handlePaymentFormChange}
                  >
                    <option value="credit_card">💳 Credit Card</option>
                    <option value="debit_card">💳 Debit Card</option>
                    <option value="paypal">🅿️ PayPal</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                  </select>
                </div>

                {(paymentForm.paymentMethod === 'credit_card' || paymentForm.paymentMethod === 'debit_card') && (
                  <>
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        name="cardName"
                        value={paymentForm.cardName}
                        onChange={handlePaymentFormChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={paymentForm.cardNumber}
                        onChange={handlePaymentFormChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={paymentForm.expiryDate}
                          onChange={handlePaymentFormChange}
                          placeholder="MM/YY"
                          maxLength="5"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          name="cvv"
                          value={paymentForm.cvv}
                          onChange={handlePaymentFormChange}
                          placeholder="123"
                          maxLength="4"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="form-note">
                  <p>🔒 Your payment information is secure and encrypted.</p>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary btn-large">
                    Pay {formatCurrency(selectedBill.amount)}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && markPaidBill && (
        <div className="modal-overlay" onClick={closeMarkPaidModal}>
          <div className="modal-content mark-paid-modal-member" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mark Payment - {markPaidBill.title}</h3>
              <button className="close-btn" onClick={closeMarkPaidModal}>✖</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Record that you have paid this bill through another method (cash, check, bank transfer, etc.).
              </p>

              <div className="form-group">
                <label>Payment Amount</label>
                <input
                  type="number"
                  value={manualPaymentAmount}
                  onChange={(e) => setManualPaymentAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  className="form-input"
                />
                <span className="helper-text">Bill amount: {formatCurrency(markPaidBill.amount)}</span>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={manualPaymentMethod}
                  onChange={(e) => setManualPaymentMethod(e.target.value)}
                  className="form-input"
                >
                  <option value="cash">Cash</option>
                  <option value="check">📝 Check</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="credit_card">💳 Credit Card</option>
                  <option value="debit_card">💳 Debit Card</option>
                  <option value="paypal">🅿️ PayPal</option>
                  <option value="venmo">📱 Venmo</option>
                  <option value="zelle">⚡ Zelle</option>
                  <option value="other">📋 Other</option>
                </select>
                <span className="helper-text">How did you pay this bill?</span>
              </div>

              <div className="form-group">
                <label>Payment Notes (optional)</label>
                <textarea
                  value={manualPaymentNotes}
                  onChange={(e) => setManualPaymentNotes(e.target.value)}
                  placeholder="Add details about how you paid (e.g., 'Paid via cash', 'Check #1234', 'Bank transfer on 11/20')..."
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-danger"
                  onClick={closeMarkPaidModal}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-success"
                  onClick={markAsPaidByMember}
                  disabled={!manualPaymentAmount}
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPayments;
