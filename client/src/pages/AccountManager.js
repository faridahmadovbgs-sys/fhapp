import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import './AccountManager.css';

const AccountManager = () => {
  const { user } = useAuth();
  const { 
    accounts, 
    activeAccount, 
    loading: loadingAccounts, 
    switchAccount,
    setAsDefault,
    refreshAccounts 
  } = useAccount();
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    accountType: 'personal',
    accountName: '',
    entityName: '',
    ein: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    isDefault: false
  });

  const accountTypes = [
    { value: 'personal', label: 'Personal', icon: '👤' },
    { value: 'llc', label: 'LLC', icon: '🏢' },
    { value: 'trust', label: 'Trust', icon: '🏛️' },
    { value: 'corporation', label: 'Corporation', icon: '🏭' },
    { value: 'partnership', label: 'Partnership', icon: '🤝' },
    { value: 'nonprofit', label: 'Non-Profit', icon: '❤️' },
    { value: 'other', label: 'Other', icon: '📋' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // If this is set as default, unset all other defaults
      if (formData.isDefault) {
        const updatePromises = accounts.map(account => 
          updateDoc(doc(db, 'userAccounts', account.id), { isDefault: false })
        );
        await Promise.all(updatePromises);
      }

      const newAccount = {
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0],
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'userAccounts'), newAccount);

      setSuccess('Account added successfully!');
      setShowAddForm(false);
      resetForm();
      await refreshAccounts();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding account:', err);
      setError('Failed to add account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAsDefault = async (accountId) => {
    try {
      setLoading(true);
      const success = await setAsDefault(accountId);
      if (success) {
        setSuccess('Default account updated!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to set default account');
      }
    } catch (err) {
      console.error('Error setting default:', err);
      setError('Failed to set default account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'userAccounts', accountId));
      
      setSuccess('Account deleted successfully!');
      await refreshAccounts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      accountType: 'personal',
      accountName: '',
      entityName: '',
      ein: '',
      taxId: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      isDefault: false
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getAccountIcon = (type) => {
    const account = accountTypes.find(a => a.value === type);
    return account ? account.icon : '📋';
  };

  if (loadingAccounts && accounts.length === 0) {
    return (
      <div className="account-manager-container">
        <div className="loading">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="account-manager-container">
      <div className="page-header">
        <div>
          <h1>My Accounts</h1>
          <p>Manage multiple accounts under one login (Personal, LLC, Trust, etc.)</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={loading}
        >
          {showAddForm ? 'Cancel' : '+ Add Account'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Active Account Summary */}
      {activeAccount && !showAddForm && (
        <div className="active-account-summary">
          <div className="active-badge">Currently Active</div>
          <div className="active-account-details">
            <span className="active-icon">{getAccountIcon(activeAccount.accountType)}</span>
            <div>
              <h3>{activeAccount.accountName}</h3>
              <p>{activeAccount.entityName || accountTypes.find(t => t.value === activeAccount.accountType)?.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Form */}
      {showAddForm && (
        <div className="account-form-card">
          <h3>Add New Account</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account Type *</label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
              >
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Account Name *</label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="e.g., Personal Account, My Business LLC"
                required
              />
            </div>

            <div className="form-group">
              <label>Entity/Business Name</label>
              <input
                type="text"
                name="entityName"
                value={formData.entityName}
                onChange={handleChange}
                placeholder="Official entity name (if applicable)"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>EIN</label>
                <input
                  type="text"
                  name="ein"
                  value={formData.ein}
                  onChange={handleChange}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g., CA"
                  maxLength="2"
                />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="account@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                />
                <span>Set as default account</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Account'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="accounts-section">
        <h2>Your Accounts ({accounts.length})</h2>
        
        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💼</div>
            <h3>No Accounts Yet</h3>
            <p>Click "Add Account" to create your first account.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Entity Name</th>
                  <th>EIN/Tax ID</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr 
                    key={account.id}
                    className={activeAccount?.id === account.id ? 'active-row' : ''}
                  >
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '1.2rem'}}>
                          {getAccountIcon(account.accountType)}
                        </span>
                        <strong>{account.accountName}</strong>
                      </div>
                    </td>
                    <td>
                      {accountTypes.find(t => t.value === account.accountType)?.label || account.accountType}
                    </td>
                    <td>{account.entityName || '-'}</td>
                    <td>{account.ein || account.taxId || '-'}</td>
                    <td>
                      <div style={{fontSize: '0.85rem'}}>
                        {account.phone && <div>📞 {account.phone}</div>}
                        {account.email && <div>✉️ {account.email}</div>}
                        {!account.phone && !account.email && '-'}
                      </div>
                    </td>
                    <td>
                      {account.isDefault ? (
                        <span className="badge badge-success">✓ Default</span>
                      ) : activeAccount?.id === account.id ? (
                        <span className="badge badge-info">Active</span>
                      ) : (
                        <span className="badge badge-secondary">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '8px'}}>
                        {!account.isDefault && (
                          <button
                            className="btn-small btn-primary"
                            onClick={() => handleSetAsDefault(account.id)}
                            title="Set as Default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          className="btn-small btn-danger"
                          onClick={() => deleteAccount(account.id)}
                          title="Delete Account"
                        >
                          Delete
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
    </div>
  );
};

export default AccountManager;
