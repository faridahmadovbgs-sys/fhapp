import React, { useState } from 'react';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    name: '',
    entity: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegistering) {
        // Registration flow
        if (!formData.name || !formData.name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        
        if (!formData.email || !formData.email.trim()) {
          setError('Please enter your email address');
          setLoading(false);
          return;
        }
        
        if (!formData.password || !formData.password.trim()) {
          setError('Please enter your password');
          setLoading(false);
          return;
        }
        
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }
        
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const firebaseAuthService = await import('../services/firebaseAuthService');
        const data = await firebaseAuthService.default.register(
          formData.email,
          formData.password,
          formData.name,
          formData.entity
        );
        
        if (data.success) {
          setSuccess('Registration successful! You can now sign in and access the platform.');
          // Clear form
          setFormData({
            name: '',
            entity: '',
            email: '',
            password: '',
            confirmPassword: ''
          });
          // Switch to login mode after 2 seconds
          setTimeout(() => {
            setIsRegistering(false);
            setSuccess('');
          }, 2000);
        } else {
          setError(data.message || 'Registration failed');
        }
      } else {
        // Login flow
        if (!formData.email || !formData.email.trim()) {
          setError('Please enter your email address');
          setLoading(false);
          return;
        }
        
        if (!formData.password || !formData.password.trim()) {
          setError('Please enter your password');
          setLoading(false);
          return;
        }

        const firebaseAuthService = await import('../services/firebaseAuthService');
        const data = await firebaseAuthService.default.login(formData.email, formData.password);
        setSuccess('Login successful! Redirecting...');

        if (data.success) {
          // Firebase AuthContext will handle user state automatically via onAuthStateChanged
          // No need to call onLogin - just show success message
          // The auth state change will automatically redirect to the main app
        } else {
          setError(data.message || 'Authentication failed');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message || (isRegistering ? 'Registration failed' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const firebaseAuthService = await import('../services/firebaseAuthService');
      const data = await firebaseAuthService.default.forgotPassword(resetEmail);

      if (data.success) {
        setSuccess(
          <>
            <div style={{ marginBottom: '10px' }}>
              ✅ Password reset email sent successfully!
            </div>
            <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
              📧 Check your email inbox (and spam folder) for reset instructions
            </div>
            <div style={{ fontSize: '0.8em', color: '#888' }}>
              🔥 Powered by Firebase Authentication - Real email service!
            </div>
          </>
        );
        setResetEmail('');
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsRegistering(false);
    setError('');
    setSuccess('');
    setResetEmail('');
  };

  const toggleRegistration = () => {
    setIsRegistering(!isRegistering);
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
    setFormData({
      name: '',
      entity: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="app-name">Integrant Platform</h1>
          <h2>
            {isForgotPassword 
              ? 'Reset Password' 
              : isRegistering 
              ? 'Create Account' 
              : 'Welcome Back'}
          </h2>
          <p>
            {isForgotPassword 
              ? 'Enter your email to receive reset instructions'
              : isRegistering
              ? 'Join the platform and start collaborating'
              : 'Sign in to continue'
            }
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="login-form">
            <div className="form-group">
              <label htmlFor="resetEmail">Email Address</label>
              <input
                type="email"
                id="resetEmail"
                name="resetEmail"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>

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

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        ) : isRegistering ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="entity">Organization/Entity (Optional)</label>
              <input
                type="text"
                id="entity"
                name="entity"
                value={formData.entity}
                onChange={handleChange}
                placeholder="Enter your organization name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password (min 6 characters)"
                  minLength="6"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '👁' : '👁'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  minLength="6"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? '👁' : '👁'}
                </button>
              </div>
            </div>

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

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="info-message" style={{ marginTop: '15px', fontSize: '0.9em', color: '#666', textAlign: 'center' }}>
              ℹ️ After registration, you can upgrade to Account Owner or Sub-Account Owner from your profile settings.
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                minLength="6"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁' : '👁'}
              </button>
            </div>
          </div>

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

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
          </form>
        )}

        <div className="login-footer">
          {isForgotPassword ? (
            <p>
              Remember your password?{' '}
              <button 
                type="button" 
                className="toggle-button"
                onClick={toggleForgotPassword}
                disabled={loading}
              >
                Back to Sign In
              </button>
            </p>
          ) : isRegistering ? (
            <p>
              Already have an account?{' '}
              <button 
                type="button" 
                className="toggle-button"
                onClick={toggleRegistration}
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          ) : (
            <>
              <p>
                <button 
                  type="button" 
                  className="forgot-password-button"
                  onClick={toggleForgotPassword}
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </p>
              
              <div className="register-options">
                <p className="register-prompt">Don't have an account?</p>
                <button 
                  type="button" 
                  className="toggle-button"
                  onClick={toggleRegistration}
                  disabled={loading}
                  style={{ 
                    fontSize: '1em', 
                    padding: '10px 20px', 
                    marginBottom: '15px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Register Now
                </button>
                <p className="account-owner-link" style={{ fontSize: '0.9em', color: '#666' }}>
                  Or create an organization: 
                  <a href="/register/owner" className="owner-link"> Register as Account Owner</a>
                </p>
                <p className="member-info" style={{ fontSize: '0.85em', color: '#888' }}>
                  After registration, you can upgrade to Account Owner or Sub-Account Owner from your profile
                </p>
              </div>
            </>
          )}
        </div>


      </div>
    </div>
  );
};

export default Login;