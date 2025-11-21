import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserOrganizations } from '../services/organizationService';
import { 
  createBill, 
  getOrganizationBills, 
  updateBillStatus,
  getBillPayments 
} from '../services/billingService';
import './BillingManagement.css';

const BillingManagement = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    billType: 'one-time', // 'one-time' or 'subscription'
    dueDate: '',
    subscriptionInterval: 'monthly', // 'monthly', 'quarterly', 'yearly'
    assignToAll: true,
    selectedMembers: []
  });

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getUserOrganizations(user.id);
        setOrganizations(result.organizations);
        
        if (result.organizations.length > 0 && !selectedOrg) {
          setSelectedOrg(result.organizations[0]);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setError('Failed to load organizations');
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
      }
    } catch (error) {
      console.error('Error loading bills:', error);
      setError('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim() || !formData.amount) {
      setError('Title and amount are required');
      return;
    }

    try {
      const billData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        billType: formData.billType,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        subscriptionInterval: formData.billType === 'subscription' ? formData.subscriptionInterval : null,
        organizationId: selectedOrg.id,
        organizationName: selectedOrg.name,
        ownerId: user.id,
        memberIds: formData.assignToAll ? null : formData.selectedMembers
      };

      await createBill(billData);
      setSuccess('✅ Bill created successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        amount: '',
        billType: 'one-time',
        dueDate: '',
        subscriptionInterval: 'monthly',
        assignToAll: true,
        selectedMembers: []
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
      setSuccess('✅ Bill status updated!');
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

  if (loading) {
    return <div className="billing-management"><p>Loading...</p></div>;
  }

  return (
    <div className="billing-management">
      <div className="billing-header">
        <div>
          <h2>💰 Billing Management</h2>
          <p>Create and manage bills for your organization members</p>
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

            <div className="form-row">
              <div className="form-group">
                <label>Amount (USD) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

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
            )}

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
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
        <h3>Bills ({bills.length})</h3>
        
        {bills.length === 0 ? (
          <div className="empty-state">
            <p>No bills created yet. Create your first bill to get started!</p>
          </div>
        ) : (
          <div className="bills-grid">
            {bills.map(bill => (
              <div key={bill.id} className="bill-card">
                <div className="bill-header">
                  <h4>{bill.title}</h4>
                  <span className={`bill-badge ${bill.billType}`}>
                    {bill.billType === 'subscription' ? '🔄 Subscription' : '💵 One-Time'}
                  </span>
                </div>
                
                <div className="bill-details">
                  <p className="bill-description">{bill.description}</p>
                  
                  <div className="bill-info">
                    <div className="info-item">
                      <span className="label">Amount:</span>
                      <span className="value">{formatCurrency(bill.amount)}</span>
                    </div>
                    
                    {bill.dueDate && (
                      <div className="info-item">
                        <span className="label">Due Date:</span>
                        <span className="value">{formatDate(bill.dueDate)}</span>
                      </div>
                    )}
                    
                    <div className="info-item">
                      <span className="label">Total Paid:</span>
                      <span className="value">{formatCurrency(bill.totalPaid || 0)}</span>
                    </div>
                    
                    <div className="info-item">
                      <span className="label">Status:</span>
                      <span className={`status-badge ${bill.status}`}>
                        {bill.status}
                      </span>
                    </div>
                    
                    <div className="info-item">
                      <span className="label">Payments:</span>
                      <span className="value">{bill.payments?.length || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bill-actions">
                  <button 
                    className="btn btn-small btn-secondary"
                    onClick={() => viewBillDetails(bill)}
                  >
                    View Details
                  </button>
                  
                  {bill.status === 'active' && (
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleStatusChange(bill.id, 'cancelled')}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
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
              </div>
              
              <h4>Payment History</h4>
              {selectedBill.payments && selectedBill.payments.length > 0 ? (
                <div className="payments-list">
                  {selectedBill.payments.map(payment => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-info">
                        <span className="payment-member">{payment.memberName || payment.memberEmail}</span>
                        <span className="payment-date">{formatDate(payment.paidAt)}</span>
                      </div>
                      <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No payments received yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingManagement;
