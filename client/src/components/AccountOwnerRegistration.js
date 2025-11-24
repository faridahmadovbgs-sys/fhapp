import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setUserRoleInDatabase } from '../services/roleService';
import { createInvitationLink } from '../services/invitationService';
import './Login.css';

const AccountOwnerRegistration = () => {
  console.log('🔍 AccountOwnerRegistration component loading...');
  
  const { register, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    ein: '',
    acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Add error boundary logging
  React.useEffect(() => {
    console.log('✅ AccountOwnerRegistration mounted successfully');
    return () => {
      console.log('🔄 AccountOwnerRegistration unmounting');
    };
  }, []);

  // Check Firebase connection on component mount
  React.useEffect(() => {
    const checkFirebase = async () => {
      try {
        const { auth, db } = await import('../config/firebase');
        console.log('Firebase auth:', auth);
        console.log('Firebase db:', db);
        
        if (auth && db) {
          setFirebaseReady(true);
          console.log('✅ Firebase connection established successfully');
        } else {
          console.log('❌ Firebase not ready:', { auth: !!auth, db: !!db });
          setFirebaseReady(true); // Allow to proceed anyway for testing
        }
      } catch (error) {
        console.error('Firebase import error:', error);
        setFirebaseReady(true); // Allow to proceed anyway for testing
      }
    };
    
    checkFirebase();
  }, []);

  // Show loading state while auth or Firebase is loading
  if (authLoading || !firebaseReady) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="loading">
            <p>Initializing registration system...</p>
          </div>
        </div>
      </div>
    );
  }

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
    if (!formData.organizationName.trim()) {
      setError('Organization name is required');
      return false;
    }
    if (!formData.ein.trim()) {
      setError('EIN (Employer Identification Number) is required');
      return false;
    }
    // Validate EIN format (XX-XXXXXXX)
    const einPattern = /^\d{2}-?\d{7}$/;
    if (!einPattern.test(formData.ein.replace(/-/g, ''))) {
      setError('EIN must be in format XX-XXXXXXX (9 digits)');
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

    setLoading(true);
    try {
      console.log('🚀 Starting Account Owner registration for:', formData.email);
      
      // Test Firebase availability with detailed logging
      const { auth, db } = await import('../config/firebase');
      console.log('📊 Firebase status check:', { 
        authExists: !!auth, 
        dbExists: !!db,
        authType: typeof auth,
        dbType: typeof db
      });
      
      if (!auth) {
        throw new Error('Firebase Authentication is not available. This could be due to:\n• Network connectivity issues\n• Browser blocking Firebase\n• Firewall restrictions\n\nPlease check your internet connection and try again.');
      }
      
      if (!db) {
        throw new Error('Firebase Firestore is not available. This could be due to:\n• Network connectivity issues\n• Browser blocking Firebase\n• Firewall restrictions\n\nPlease check your internet connection and try again.');
      }

      console.log('✅ Firebase is available, proceeding with registration...');

      // Register the user
      const registrationResult = await register(formData.email, formData.password, formData.name);
      console.log('🔍 User registration result:', registrationResult);
      
      // Extract user ID from the registration result
      const userId = registrationResult?.user?.id;
      console.log('🔍 Extracted userId:', userId);
      
      if (!userId) {
        console.error('❌ Registration result structure:', registrationResult);
        throw new Error('Registration succeeded but user ID not found. Please try logging in.');
      }
      
      // Set account owner role in database and store organization metadata
      const metadata = {
        organizationName: formData.organizationName,
        ein: formData.ein,
        isAccountOwner: true,
        accountCreatedAt: new Date(),
        subscriptionStatus: 'trial'
      };

      await setUserRoleInDatabase(
        userId,
        formData.email,
        'account_owner',
        metadata
      );

      console.log('Account owner registered:', metadata);

      // Create organization
      const { createOrganization } = await import('../services/organizationService');
      const orgResult = await createOrganization(
        userId,
        formData.email,
        formData.organizationName,
        formData.ein
      );

      console.log('✅ Organization created:', orgResult);

      // Create invitation link for account owner to share
      const invitationResult = await createInvitationLink(
        userId,
        formData.email,
        formData.organizationName,
        orgResult.organizationId
      );

      console.log('✅ Invitation link created:', invitationResult);

      setSuccess(`✅ Account owner registration successful! Your account has been created with full administrative privileges. 
      
🔗 Your unique invitation link:
${invitationResult.link}

Share this link with team members so they can join your organization. You can view and manage this link in your admin panel.`);
      
      // Redirect to homepage after successful registration
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('❌ Account Owner registration error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      let userFriendlyMessage = error.message || 'Registration failed. Please try again.';
      
      // Handle specific Firebase errors with more detailed messages
      if (error.message?.includes('Firebase not available') || error.message?.includes('Firebase not configured')) {
        userFriendlyMessage = '🔥 Firebase Connection Issue: The authentication service is not available. This could be due to:\n\n• Network connectivity problems\n• Browser blocking Firebase\n• Firewall restrictions\n\nPlease check your internet connection and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        userFriendlyMessage = '🌐 Network Issue: Please check your internet connection and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        userFriendlyMessage = '🌐 Network request failed. Please check your internet connection and try again.';
      }
      
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="app-name">Integrant</h1>
          <h2>Register as Account Owner</h2>
          <p>Create your organization account and start inviting team members</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
            <div style={{ marginTop: '15px' }}>
              <a href="/admin" className="btn btn-primary" style={{ marginRight: '10px' }}>
                Go to Admin Panel
              </a>
              <a href="/" className="btn btn-secondary">
                Go to Dashboard
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="organizationName">Organization Name</label>
            <input
              type="text"
              id="organizationName"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Enter your organization name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ein">EIN (Employer Identification Number)</label>
            <input
              type="text"
              id="ein"
              name="ein"
              value={formData.ein}
              onChange={handleChange}
              placeholder="XX-XXXXXXX (e.g., 12-3456789)"
              required
              disabled={loading}
              maxLength="10"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password (min 6 characters)"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label="Toggle password visibility"
              >
                {showPassword ? '👁' : '👁'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? '👁' : '👁'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <span className="checkbox-text">
                I accept the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </span>
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </label>
          </div>

          <button
            type="submit"
            className="submit-button create-account-owner-button"
            disabled={loading || !firebaseReady}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              <>
                🚀 Create Account Owner
              </>
            )}
          </button>
        </form>

        <div className="form-footer">
          <p>
            Already have an account? 
            <button type="button" className="toggle-button" onClick={() => window.location.href = '/login'}>
              Sign In
            </button>
          </p>
          
          <div className="register-options">
            <p>
              Looking for team member registration? 
              <button type="button" className="toggle-button" onClick={() => window.location.href = '/login'}>
                Regular Registration
              </button>
            </p>
          </div>
        </div>

        <div className="benefits-section">
          <h3>Account Owner Benefits</h3>
          <div className="benefits-grid">
            <div className="benefit-item">✅ Full administrative control</div>
            <div className="benefit-item">✅ Invite and manage team members</div>
            <div className="benefit-item">✅ Access to all premium features</div>
            <div className="benefit-item">✅ Organization-wide settings</div>
            <div className="benefit-item">✅ Billing and subscription management</div>
            <div className="benefit-item">✅ Data export and backup options</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountOwnerRegistration;