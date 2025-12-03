import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { getUserOrganizations, getUserMemberOrganizations, getOrganizationMembers } from '../services/organizationService';
import { 
  createBill, 
  getOrganizationBills, 
  updateBillStatus,
  getBillPayments,
  updateBillMembers,
  recordPayment
} from '../services/billingService';
import { doc as firestoreDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import OrganizationNotificationBadge from '../components/OrganizationNotificationBadge';
import '../components/OrganizationNotificationBadge.css';
import './BillingManagement.css';
import './PersonalDocuments.css';

const BillingManagement = () => {
  const { user } = useAuth();
  const { activeAccount, operatingAsUser } = useAccount();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billMembers, setBillMembers] = useState({});
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [managingBill, setManagingBill] = useState(null);
  const [allOrgMembers, setAllOrgMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [markPaidBill, setMarkPaidBill] = useState(null);
  const [selectedPayerIds, setSelectedPayerIds] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    billType: 'one-time', // 'one-time' or 'subscription'
    dueDate: '',
    subscriptionInterval: 'monthly', // 'monthly', 'quarterly', 'yearly'
    recurringDayOfMonth: '', // Day of month for recurring bills (1-31)
    assignToAll: true,
    selectedMembers: [],
    lineItems: [{ description: '', amount: '' }]
  });

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;
      
      try {
        // Fetch both owned and member organizations
        const ownerResult = await getUserOrganizations(user.id);
        const memberResult = await getUserMemberOrganizations(user.id);
        
        // Combine and deduplicate organizations
        const allOrgs = [...ownerResult.organizations];
        memberResult.organizations.forEach(memberOrg => {
          if (!allOrgs.find(org => org.id === memberOrg.id)) {
            allOrgs.push(memberOrg);
          }
        });
        
        console.log('Fetched organizations for billing:', allOrgs);
        setOrganizations(allOrgs);
        
        if (allOrgs.length > 0 && !selectedOrg) {
          setSelectedOrg(allOrgs[0]);
        } else if (allOrgs.length === 0) {
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

  // Fetch bills when organization changes
  useEffect(() => {
    if (selectedOrg) {
      loadBills();
    }
  }, [selectedOrg]);

  const loadBills = async () => {
    if (!selectedOrg) return;
    
    try {
      setLoading(true);
      const result = await getOrganizationBills(selectedOrg.id);
      if (result.success) {
        setBills(result.bills);
        
        // Load members for each bill
        await loadBillMembers(result.bills);
        
        // Mark recent payments as viewed
        result.bills.forEach(bill => {
          if (bill.payments) {
            bill.payments.forEach(payment => {
              if (!payment.viewedBy?.includes(user.id)) {
                markPaymentAsViewed(payment.id);
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error loading bills:', error);
      setError('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const markPaymentAsViewed = async (paymentId) => {
    try {
      const paymentRef = firestoreDoc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        viewedBy: arrayUnion(user.id)
      });
      console.log('Marked payment as viewed:', paymentId);
    } catch (error) {
      console.error('Error marking payment as viewed:', error);
    }
  };

  const loadBillMembers = async (billsList) => {
    if (!selectedOrg) return;
    
    try {
      // Get all organization members
      const membersResult = await getOrganizationMembers(selectedOrg.id);
      const allMembers = membersResult.members || [];
      
      // Store all members for later use
      setAllOrgMembers(allMembers);
      
      // Create a map of bill IDs to their assigned members
      const membersMap = {};
      
      for (const bill of billsList) {
        if (bill.memberIds && Array.isArray(bill.memberIds)) {
          // Specific members assigned
          membersMap[bill.id] = allMembers.filter(member => 
            bill.memberIds.includes(member.uid)
          );
        } else {
          // Assigned to all members
          membersMap[bill.id] = allMembers;
        }
      }
      
      setBillMembers(membersMap);
    } catch (error) {
      console.error('Error loading bill members:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.lineItems];
    newLineItems[index][field] = value;
    setFormData(prev => ({
      ...prev,
      lineItems: newLineItems
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', amount: '' }]
    }));
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length > 1) {
      const newLineItems = formData.lineItems.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        lineItems: newLineItems
      }));
    }
  };

  const calculateTotalAmount = () => {
    return formData.lineItems.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    // Validate line items
    const validLineItems = formData.lineItems.filter(item => 
      item.description.trim() && item.amount && parseFloat(item.amount) > 0
    );

    if (validLineItems.length === 0) {
      setError('At least one line item with description and amount is required');
      return;
    }

    const totalAmount = validLineItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Show confirmation with operating mode
    let creatingAs;
    if (operatingAsUser) {
      creatingAs = `yourself (${user?.displayName || user?.email})`;
    } else if (activeAccount) {
      creatingAs = `${activeAccount.accountName}${activeAccount.entityName ? ' (' + activeAccount.entityName + ')' : ''}`;
    } else {
      creatingAs = 'yourself (no account selected)';
    }

    const confirmed = window.confirm(
      `You are about to create a bill:\n\n` +
      `Title: ${formData.title}\n` +
      `Amount: $${totalAmount.toFixed(2)}\n` +
      `Organization: ${selectedOrg.name}\n\n` +
      `Creating as: ${creatingAs}\n\n` +
      `Is this correct?`
    );

    if (!confirmed) return;

    try {
      const billData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: totalAmount,
        lineItems: validLineItems.map(item => ({
          description: item.description.trim(),
          amount: parseFloat(item.amount)
        })),
        billType: formData.billType,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        subscriptionInterval: formData.billType === 'subscription' ? formData.subscriptionInterval : null,
        recurringDayOfMonth: formData.billType === 'subscription' && formData.recurringDayOfMonth 
          ? parseInt(formData.recurringDayOfMonth) 
          : null,
        organizationId: selectedOrg.id,
        organizationName: selectedOrg.name,
        ownerId: user.id,
        memberIds: formData.assignToAll ? null : formData.selectedMembers,
        // Capture active account information
        createdByAccountId: activeAccount?.id || null,
        createdByAccountName: activeAccount?.accountName || null,
        createdByAccountType: activeAccount?.accountType || null,
        createdByEntityName: activeAccount?.entityName || null
      };

      await createBill(billData);
      setSuccess('Bill created successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        amount: '',
        billType: 'one-time',
        dueDate: '',
        subscriptionInterval: 'monthly',
        recurringDayOfMonth: '',
        assignToAll: true,
        selectedMembers: [],
        lineItems: [{ description: '', amount: '' }]
      });
      
      // Reload bills
      await loadBills();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating bill:', error);
      setError('Failed to create bill: ' + error.message);
    }
  };

  const handleStatusChange = async (billId, newStatus) => {
    try {
      await updateBillStatus(billId, newStatus);
      setSuccess('Bill status updated!');
      await loadBills();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating bill status:', error);
      setError('Failed to update bill status');
    }
  };

  const viewBillDetails = (bill) => {
    setSelectedBill(bill);
  };

  const openManageMembersModal = (bill) => {
    setManagingBill(bill);
    
    // Set current member selection
    if (bill.memberIds && Array.isArray(bill.memberIds)) {
      setSelectedMemberIds(bill.memberIds);
    } else {
      // All members selected
      setSelectedMemberIds(allOrgMembers.map(m => m.uid));
    }
    
    setShowManageMembersModal(true);
  };

  const closeManageMembersModal = () => {
    setShowManageMembersModal(false);
    setManagingBill(null);
    setSelectedMemberIds([]);
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(allOrgMembers.map(m => m.uid));
  };

  const deselectAllMembers = () => {
    setSelectedMemberIds([]);
  };

  const saveMemberAssignments = async () => {
    if (!managingBill) return;
    
    try {
      setError('');
      setSuccess('');
      
      // If all members selected, pass null (means "all members")
      const memberIds = selectedMemberIds.length === allOrgMembers.length 
        ? null 
        : selectedMemberIds;
      
      await updateBillMembers(managingBill.id, memberIds);
      
      setSuccess('Member assignments updated!');
      closeManageMembersModal();
      
      // Reload bills to reflect changes
      await loadBills();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating member assignments:', error);
      setError('Failed to update member assignments');
    }
  };

  const openMarkPaidModal = (bill) => {
    setMarkPaidBill(bill);
    setSelectedPayerIds([]);
    setPaymentAmount(bill.amount.toString());
    setPaymentNotes('');
    setPaymentMethod('cash');
    setShowMarkPaidModal(true);
  };

  const closeMarkPaidModal = () => {
    setShowMarkPaidModal(false);
    setMarkPaidBill(null);
    setSelectedPayerIds([]);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentMethod('cash');
  };

  const togglePayerSelection = (memberId) => {
    setSelectedPayerIds(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const selectAllPayers = () => {
    const billMembersList = billMembers[markPaidBill?.id] || [];
    setSelectedPayerIds(billMembersList.map(m => m.uid));
  };

  const deselectAllPayers = () => {
    setSelectedPayerIds([]);
  };

  const markAsPaid = async () => {
    if (!markPaidBill) return;
    
    try {
      setError('');
      setSuccess('');

      if (selectedPayerIds.length === 0) {
        setError('Please select at least one member who paid');
        return;
      }

      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid payment amount');
        return;
      }

      // Show confirmation with operating mode
      let recordingAs;
      if (operatingAsUser) {
        recordingAs = `yourself (${user?.displayName || user?.email})`;
      } else if (activeAccount) {
        recordingAs = `${activeAccount.accountName}${activeAccount.entityName ? ' (' + activeAccount.entityName + ')' : ''}`;
      } else {
        recordingAs = 'yourself (no account selected)';
      }

      const confirmed = window.confirm(
        `You are about to record a payment:\n\n` +
        `Bill: ${markPaidBill.title}\n` +
        `Amount: $${amount.toFixed(2)}\n` +
        `Members: ${selectedPayerIds.length}\n\n` +
        `Recording payment as: ${recordingAs}\n\n` +
        `Is this correct?`
      );

      if (!confirmed) return;

      // Record payment for each selected member
      for (const memberId of selectedPayerIds) {
        const member = allOrgMembers.find(m => m.uid === memberId);
        
        const paymentData = {
          billId: markPaidBill.id,
          billTitle: markPaidBill.title,
          memberId: memberId,
          memberName: member?.name || member?.email || 'Unknown',
          memberEmail: member?.email || '',
          organizationId: selectedOrg.id,
          organizationName: selectedOrg.name,
          amount: amount,
          paymentMethod: paymentMethod,
          notes: paymentNotes || 'Manually marked as paid',
          recordedBy: user.id,
          recordedByName: user.displayName || user.email,
          // Capture active account information
          paidWithAccountId: activeAccount?.id || null,
          paidWithAccountName: activeAccount?.accountName || null,
          paidWithAccountType: activeAccount?.accountType || null,
          paidWithEntityName: activeAccount?.entityName || null
        };

        await recordPayment(paymentData);
      }

      setSuccess(`Payment recorded for ${selectedPayerIds.length} member(s)!`);
      closeMarkPaidModal();
      
      // Reload bills to reflect changes
      await loadBills();
      
      // If viewing bill details, refresh it
      if (selectedBill && selectedBill.id === markPaidBill.id) {
        const updatedBills = await getOrganizationBills(selectedOrg.id);
        const updatedBill = updatedBills.bills.find(b => b.id === markPaidBill.id);
        if (updatedBill) {
          setSelectedBill(updatedBill);
        }
      }
      
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

  // Filter bills based on search term
  const filteredBills = bills.filter(bill => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    const title = bill.title?.toLowerCase() || '';
    const description = bill.description?.toLowerCase() || '';
    const amount = bill.amount?.toString() || '';
    const status = bill.status?.toLowerCase() || '';
    const totalPaid = bill.totalPaid?.toString() || '';
    
    return title.includes(search) || 
           description.includes(search) || 
           amount.includes(search) ||
           status.includes(search) ||
           totalPaid.includes(search);
  });

  if (loading) {
    return <div className="billing-management"><p>Loading...</p></div>;
  }

  return (
    <div className="billing-management">
      <div className="billing-header">
        <div>
          <h2>Billing Management</h2>
          <p>Create and manage bills for your organization members</p>
        </div>
        
        {/* Organization Selector */}
        {organizations.length > 0 && (
          <div className="org-selector">
            <label>Organization:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              {selectedOrg && (
                <OrganizationNotificationBadge 
                  organizationId={selectedOrg.id} 
                  userId={user?.id || user?.uid}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="billing-actions">
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✖ Cancel' : '➕ Create New Bill'}
        </button>
      </div>

      {/* Create Bill Form */}
      {showCreateForm && (
        <div className="bill-form-card">
          <h3>Create New Bill</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Bill Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Monthly Membership Fee"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details about this bill"
                rows="3"
              />
            </div>

            {/* Line Items Section */}
            <div className="form-group">
              <label>Line Items *</label>
              <div className="line-items-container">
                {formData.lineItems.map((item, index) => (
                  <div key={index} className="line-item-row">
                    <input
                      type="text"
                      placeholder="Item description (e.g., Membership, Operational Expenses)"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      className="line-item-description"
                    />
                    <input
                      type="number"
                      placeholder="$0.00"
                      value={item.amount}
                      onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                      step="0.01"
                      min="0"
                      className="line-item-amount"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="btn-remove-line-item"
                      disabled={formData.lineItems.length === 1}
                      title="Remove line item"
                    >
                      ✖
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLineItem}
                  className="btn-add-line-item"
                >
                  ➕ Add Line Item
                </button>
                <div className="total-amount">
                  <strong>Total Amount:</strong> ${calculateTotalAmount().toFixed(2)}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bill Type</label>
                <select
                  name="billType"
                  value={formData.billType}
                  onChange={handleChange}
                >
                  <option value="one-time">One-Time Payment</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
            </div>

            {formData.billType === 'subscription' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Billing Interval</label>
                    <select
                      name="subscriptionInterval"
                      value={formData.subscriptionInterval}
                      onChange={handleChange}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Recurring Day of Month (1-28)</label>
                    <input
                      type="number"
                      name="recurringDayOfMonth"
                      value={formData.recurringDayOfMonth}
                      onChange={handleChange}
                      placeholder="e.g., 10 for 10th of each month"
                      min="1"
                      max="28"
                    />
                    <small className="helper-text">
                      Bill will be due on this day each billing period
                    </small>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label>
                {formData.billType === 'one-time' ? 'Due Date' : 'First Due Date (optional)'}
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
              {formData.billType === 'subscription' && (
                <small className="helper-text">
                  Leave empty to use the recurring day of month starting from bill creation
                </small>
              )}
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="assignToAll"
                  checked={formData.assignToAll}
                  onChange={handleChange}
                />
                Assign to all members
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Bill
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bills List */}
      <div className="bills-section">
        <div className="bills-header-row">
          <h3>Bills ({filteredBills.length}{searchTerm && ` of ${bills.length}`})</h3>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search bills by title, description, amount, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ✖
              </button>
            )}
          </div>
        </div>
        
        {filteredBills.length === 0 && searchTerm ? (
          <div className="empty-state">
            <p>No bills found matching "{searchTerm}"</p>
            <button className="btn btn-secondary" onClick={() => setSearchTerm('')}>
              Clear Search
            </button>
          </div>
        ) : bills.length === 0 ? (
          <div className="empty-state">
            <p>No bills created yet. Create your first bill to get started!</p>
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
                  <th>Paid</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill, index) => (
                  <tr key={bill.id}>
                    <td style={{textAlign: 'center', fontWeight: '600', color: '#2CA01C', fontSize: '12px'}}>{index + 1}</td>
                    <td>
                      <div style={{fontWeight: '600', fontSize: '13px', color: '#333'}}>{bill.title}</div>
                      {bill.description && (
                        <div style={{fontSize: '11px', color: '#999', marginTop: '2px'}}>{bill.description.substring(0, 50)}{bill.description.length > 50 ? '...' : ''}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${bill.billType === 'subscription' ? 'badge-info' : 'badge-secondary'}`}>
                        {bill.billType === 'subscription' ? 'Subscription' : 'One-Time'}
                      </span>
                    </td>
                    <td style={{fontSize: '13px', fontWeight: '600', color: '#333'}}>{formatCurrency(bill.amount)}</td>
                    <td style={{fontSize: '13px', color: '#2CA01C', fontWeight: '600'}}>{formatCurrency(bill.totalPaid || 0)}</td>
                    <td style={{fontSize: '12px', color: '#666'}}>
                      {bill.dueDate ? formatDate(bill.dueDate) : 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${
                        bill.status === 'active' ? 'badge-success' : 
                        bill.status === 'completed' ? 'badge-info' : 
                        bill.status === 'overdue' ? 'badge-warning' : 
                        'badge-secondary'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td style={{textAlign: 'center', fontSize: '13px', color: '#666'}}>
                      {billMembers[bill.id]?.length || 0}
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
                        <button 
                          className="btn-action btn-action-view"
                          onClick={() => viewBillDetails(bill)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button 
                          className="btn-action btn-action-manage"
                          onClick={() => openManageMembersModal(bill)}
                          title="Manage Members"
                        >
                          👥
                        </button>
                        <button 
                          className="btn-action btn-action-paid"
                          onClick={() => openMarkPaidModal(bill)}
                          title="Mark as Paid"
                        >
                          💰
                        </button>
                        {bill.status === 'active' && (
                          <button 
                            className="btn-action btn-action-cancel"
                            onClick={() => handleStatusChange(bill.id, 'cancelled')}
                            title="Cancel Bill"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedBill.title}</h3>
              <button className="close-btn" onClick={() => setSelectedBill(null)}>✖</button>
            </div>
            
            <div className="modal-body">
              <p className="bill-description">{selectedBill.description}</p>
              
              {/* Account Information if available */}
              {(selectedBill.createdByAccountName || selectedBill.createdByEntityName) && (
                <div className="bill-profile-info">
                  <span className="profile-label">Created with account:</span>
                  <span className="profile-value">
                    {selectedBill.createdByAccountType === 'personal' && '👤'}
                    {selectedBill.createdByAccountType === 'llc' && '🏢'}
                    {selectedBill.createdByAccountType === 'trust' && '🏛️'}
                    {selectedBill.createdByAccountType === 'corporation' && '🏭'}
                    {selectedBill.createdByAccountType === 'partnership' && '🤝'}
                    {selectedBill.createdByAccountType === 'nonprofit' && '❤️'}
                    {selectedBill.createdByAccountType === 'other' && '📋'}
                    {' '}
                    {selectedBill.createdByEntityName || selectedBill.createdByAccountName}
                  </span>
                </div>
              )}
              
              <div className="bill-stats">
                <div className="stat">
                  <span className="stat-label">Amount</span>
                  <span className="stat-value">{formatCurrency(selectedBill.amount)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Paid</span>
                  <span className="stat-value">{formatCurrency(selectedBill.totalPaid || 0)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Payments</span>
                  <span className="stat-value">{selectedBill.payments?.length || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Members</span>
                  <span className="stat-value">{billMembers[selectedBill.id]?.length || 0}</span>
                </div>
              </div>

              {/* Line Items */}
              {selectedBill.lineItems && selectedBill.lineItems.length > 0 && (
                <>
                  <h4>Line Items</h4>
                  <div className="line-items-detail">
                    {selectedBill.lineItems.map((item, index) => (
                      <div key={index} className="line-item-detail">
                        <span className="item-desc">{item.description}</span>
                        <span className="item-amt">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Assigned Members */}
              <h4>Assigned Members ({billMembers[selectedBill.id]?.length || 0})</h4>
              {billMembers[selectedBill.id] && billMembers[selectedBill.id].length > 0 ? (
                <div className="members-list">
                  {billMembers[selectedBill.id].map(member => (
                    <div key={member.uid} className="member-item">
                      <div className="member-info">
                        <span className="member-name">{member.name || member.email}</span>
                        <span className="member-email">{member.email}</span>
                      </div>
                      <span className={`member-status ${
                        selectedBill.payments?.some(p => p.memberId === member.uid) ? 'paid' : 'pending'
                      }`}>
                        {selectedBill.payments?.some(p => p.memberId === member.uid) ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No members assigned</p>
              )}
              
              <h4>Payment History</h4>
              {selectedBill.payments && selectedBill.payments.length > 0 ? (
                <div className="payments-list">
                  {selectedBill.payments.map(payment => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-info">
                        <span className="payment-member">{payment.memberName || payment.memberEmail}</span>
                        <span className="payment-date">{formatDate(payment.paidAt)}</span>
                        {payment.paymentMethod && (
                          <span className="payment-method-badge">
                            {getPaymentMethodIcon(payment.paymentMethod)} {formatPaymentMethod(payment.paymentMethod)}
                          </span>
                        )}
                        {(payment.paidWithAccountName || payment.paidWithEntityName) && (
                          <span className="payment-profile-badge">
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
                        )}
                        {payment.notes && (
                          <span className="payment-notes">{payment.notes}</span>
                        )}
                      </div>
                      <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No payments received yet</p>
              )}

              <div className="modal-actions">
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    setSelectedBill(null);
                    openMarkPaidModal(selectedBill);
                  }}
                >
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showManageMembersModal && managingBill && (
        <div className="modal-overlay" onClick={closeManageMembersModal}>
          <div className="modal-content manage-members-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Members - {managingBill.title}</h3>
              <button className="close-btn" onClick={closeManageMembersModal}>✖</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Select which members should be assigned to this bill. Selected members will be able to see and pay this bill.
              </p>

              <div className="member-selection-actions">
                <button 
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={selectAllMembers}
                >
                  Select All
                </button>
                <button 
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={deselectAllMembers}
                >
                  Deselect All
                </button>
                <span className="selection-count">
                  {selectedMemberIds.length} of {allOrgMembers.length} selected
                </span>
              </div>

              <div className="members-selection-list">
                {allOrgMembers.length > 0 ? (
                  allOrgMembers.map(member => (
                    <div key={member.uid} className="member-selection-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.uid)}
                          onChange={() => toggleMemberSelection(member.uid)}
                        />
                        <div className="member-selection-info">
                          <span className="member-selection-name">{member.name || member.email}</span>
                          <span className="member-selection-email">{member.email}</span>
                        </div>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No members found in this organization</p>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={closeManageMembersModal}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={saveMemberAssignments}
                  disabled={selectedMemberIds.length === 0}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && markPaidBill && (
        <div className="modal-overlay" onClick={closeMarkPaidModal}>
          <div className="modal-content mark-paid-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mark Payment - {markPaidBill.title}</h3>
              <button className="close-btn" onClick={closeMarkPaidModal}>✖</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Record a manual payment for this bill. Select which members have paid and enter the payment details.
              </p>

              <div className="form-group">
                <label>Payment Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
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
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
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
                <span className="helper-text">How was this payment received?</span>
              </div>

              <div className="form-group">
                <label>Payment Notes (optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Select Members Who Paid</label>
                <div className="member-selection-actions">
                  <button 
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={selectAllPayers}
                  >
                    Select All
                  </button>
                  <button 
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={deselectAllPayers}
                  >
                    Deselect All
                  </button>
                  <span className="selection-count">
                    {selectedPayerIds.length} selected
                  </span>
                </div>

                <div className="members-selection-list">
                  {billMembers[markPaidBill.id] && billMembers[markPaidBill.id].length > 0 ? (
                    billMembers[markPaidBill.id].map(member => {
                      const hasPaid = markPaidBill.payments?.some(p => p.memberId === member.uid);
                      
                      return (
                        <div key={member.uid} className="member-selection-item">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedPayerIds.includes(member.uid)}
                              onChange={() => togglePayerSelection(member.uid)}
                            />
                            <div className="member-selection-info">
                              <span className="member-selection-name">
                                {member.name || member.email}
                                {hasPaid && <span className="paid-badge">Already Paid</span>}
                              </span>
                              <span className="member-selection-email">{member.email}</span>
                            </div>
                          </label>
                        </div>
                      );
                    })
                  ) : (
                    <p className="empty-state">No members assigned to this bill</p>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={closeMarkPaidModal}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-success"
                  onClick={markAsPaid}
                  disabled={selectedPayerIds.length === 0 || !paymentAmount}
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

export default BillingManagement;
