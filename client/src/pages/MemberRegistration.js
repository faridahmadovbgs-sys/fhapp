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
  const [formData, setFormData] = useState({
    name: '',
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
      
      // Query invitations by token
      const q = query(
        collection(db, 'invitations'), 
        where('token', '==', token),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      const inviteDoc = querySnapshot.docs[0];
      const inviteData = { id: inviteDoc.id, ...inviteDoc.data() };
      
      // Check if invitation has expired
      const expiresAt = new Date(inviteData.expiresAt.seconds * 1000);
      if (expiresAt < new Date()) {
        setError('This invitation has expired. Please request a new invitation.');
        setLoading(false);
        return;
      }

      setInvitation(inviteData);
      
    } catch (error) {
      console.error('Error validating invitation:', error);
      setError('Error validating invitation');
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
      // Register the user with the invitation email
      const userCredential = await register(invitation.email, formData.password, formData.name);
      
      // Set the role from the invitation
      await setUserRoleInDatabase(
        userCredential.user.uid, 
        invitation.email, 
        invitation.role
      );

      // Update invitation status to accepted
      await updateDoc(doc(db, 'invitations', invitation.id), {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: userCredential.user.uid
      });

      setSuccess('Registration successful! Welcome to the team.');
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-box">
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
      <div className="auth-container">
        <div className="auth-box">
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
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h2>Join {invitation?.organizationName}</h2>
          <p>You've been invited to join as a <strong>{invitation?.role}</strong></p>
          <div className="invitation-details">
            <p>Invited by: <strong>{invitation?.invitedByName}</strong></p>
            <p>Email: <strong>{invitation?.email}</strong></p>
          </div>
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={invitation?.email || ''}
              disabled
              className="disabled-input"
            />
            <small>This email was provided in your invitation</small>
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
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              required
              disabled={registering}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              disabled={registering}
            />
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

        <div className="auth-footer">
          <p>
            Already have an account? 
            <a href="/login" className="toggle-link"> Sign In</a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .invitation-details {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        
        .invitation-details p {
          margin: 5px 0;
          color: #495057;
        }
        
        .invitation-message {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #007bff;
          margin: 15px 0;
        }
        
        .invitation-message h4 {
          margin: 0 0 8px 0;
          color: #0056b3;
        }
        
        .invitation-message p {
          margin: 0;
          font-style: italic;
          color: #495057;
        }
        
        .disabled-input {
          background: #f8f9fa !important;
          cursor: not-allowed;
        }
        
        .error-state {
          text-align: center;
          padding: 40px 20px;
        }
        
        .error-state h2 {
          color: #dc3545;
          margin-bottom: 15px;
        }
        
        .error-actions {
          margin-top: 30px;
        }
        
        .loading-state {
          text-align: center;
          padding: 60px 20px;
        }
        
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
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