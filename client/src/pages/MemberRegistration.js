import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setUserRoleInDatabase } from '../services/roleService';
import { updateDoc, query, collection, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../components/Login.css';

const MemberRegistration = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      console.log('🔍 Validating invitation with token:', token);
      
      // Query invitations by token - first try 'active', then any status
      let q = query(
        collection(db, 'invitations'), 
        where('token', '==', token),
        where('status', '==', 'active')
      );
      
      let querySnapshot = await getDocs(q);
      console.log('✅ Found active invitations:', querySnapshot.docs.length);
      
      // If not found, try without status filter
      if (querySnapshot.empty) {
        console.log('⚠️ No active invitations, searching all...');
        q = query(
          collection(db, 'invitations'), 
          where('token', '==', token)
        );
        querySnapshot = await getDocs(q);
        console.log('✅ Found invitations (any status):', querySnapshot.docs.length);
      }
      
      if (querySnapshot.empty) {
        console.error('❌ No invitation found with token:', token);
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      const inviteDoc = querySnapshot.docs[0];
      const inviteData = { id: inviteDoc.id, ...inviteDoc.data() };
      console.log('📋 Invitation data:', {
        token: inviteData.token?.substring(0, 20),
        status: inviteData.status,
        organizationName: inviteData.organizationName,
        expiresAt: inviteData.expiresAt
      });
      
      // Check if invitation has expired
      if (inviteData.expiresAt) {
        const expiresAt = new Date(inviteData.expiresAt.seconds ? inviteData.expiresAt.seconds * 1000 : inviteData.expiresAt);
        if (expiresAt < new Date()) {
          console.warn('⏰ Invitation expired');
          setError('This invitation has expired. Please request a new invitation.');
          setLoading(false);
          return;
        }
      }

      console.log('✅ Invitation valid');
      setInvitation(inviteData);
      
    } catch (error) {
      console.error('❌ Error validating invitation:', error);
      setError('Error validating invitation: ' + error.message);
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

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.acceptTerms) {
      setError('You must accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setRegistering(true);
    try {
      // Register the user with their entered email
      const result = await register(formData.email, formData.password, formData.name);
      
      // Extract user ID from result (can be id or uid depending on service)
      const userId = result.user?.id || result.user?.uid;
      
      if (!userId) {
        throw new Error('Failed to get user ID after registration');
      }
      
      console.log('✅ User registered with ID:', userId);
      
      // Set the role from the invitation and add ownerUserId
      await setUserRoleInDatabase(
        userId, 
        formData.email, 
        invitation.role || 'member',
        {
          ownerUserId: invitation.accountOwnerId,
          organizationName: invitation.organizationName,
          invitedBy: invitation.accountOwnerId,
          invitedAt: new Date()
        }
      );

      // Record invitation usage
      const { recordInvitationUsage } = await import('../services/invitationService');
      await recordInvitationUsage(invitation.id, userId);

      // Update invitation status to accepted
      await updateDoc(doc(db, 'invitations', invitation.id), {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: userId
      });

      setSuccess('Registration successful! Welcome to the team.');
      
      // Redirect to homepage
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Validating invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="error-state">
            <h2>Invalid Invitation</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={() => navigate('/login')} className="auth-button">
                Go to Login
              </button>
              <p>
                Don't have an invitation? 
                <a href="/register/owner" className="toggle-link"> Register as Account Owner</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="app-name">Integrant</h1>
          <h2>Join {invitation?.organizationName}</h2>
          <p>Create your account to get started</p>
        </div>

        {invitation?.message && (
          <div className="invitation-message">
            <h4>Personal Message:</h4>
            <p>"{invitation.message}"</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              required
              disabled={registering}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={registering}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password (min 6 characters)"
                required
                disabled={registering}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={registering}
                aria-label="Toggle password visibility"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={registering}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={registering}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                disabled={registering}
              />
              <span className="checkmark"></span>
              I accept the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
            </label>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={registering}
          >
            {registering ? (
              <>
                <span className="loading-spinner"></span>
                Joining Team...
              </>
            ) : (
              'Join Team'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Already have an account? 
            <a href="/login" className="toggle-link"> Sign In</a>
          </p>
        </div>
      </div>

      <style jsx>{`
          .auth-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .auth-header h2 {
            color: #333;
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }
          
          .auth-header p {
            color: #666;
            font-size: 0.95rem;
            margin: 0.5rem 0;
          }
          
          .invitation-details {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            text-align: center;
          }
          
          .invitation-details p {
            margin: 0.5rem 0;
            font-size: 0.95rem;
          }
          
          .invitation-details strong {
            color: #fff;
            font-weight: 600;
          }
          
          .invitation-message {
            background: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 1rem;
            border-radius: 4px;
            margin: 1.5rem 0;
          }
          
          .invitation-message h4 {
            color: #0056b3;
            margin: 0 0 0.5rem 0;
            font-size: 0.95rem;
          }
          
          .invitation-message p {
            color: #495057;
            margin: 0;
            font-style: italic;
            font-size: 0.9rem;
          }
          
          .error-state {
            text-align: center;
            padding: 3rem 1.5rem;
          }
          
          .error-state h2 {
            color: #dc3545;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          
          .error-state p {
            color: #666;
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
          }
          
          .error-actions {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: center;
          }
          
          .error-actions button {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 4px;
            font-size: 0.95rem;
            cursor: pointer;
            transition: background 0.3s ease;
            width: 100%;
            max-width: 300px;
          }
          
          .error-actions button:hover {
            background: #0056b3;
          }
          
          .error-actions p {
            margin: 1rem 0 0 0;
          }
          
          .toggle-link {
            color: #007bff;
            text-decoration: none;
            font-weight: 600;
            margin-left: 0.25rem;
          }
          
          .toggle-link:hover {
            text-decoration: underline;
          }
          
          .loading-state {
            text-align: center;
            padding: 3rem 1.5rem;
          }
          
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem auto;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
    </div>
  );
};

export default MemberRegistration;