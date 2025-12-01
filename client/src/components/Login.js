import React, { useState } from 'react';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    name: '',
    entity: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      // Client-side validation
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
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message || 'Authentication failed');
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
    setError('');
    setSuccess('');
    setResetEmail('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="app-name">Integrant Platform</h1>
          <h2>
            {isForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p>
            {isForgotPassword 
              ? 'Enter your email to receive reset instructions'
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
          ) : (
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
          )}
          
          <div className="register-options">
            <p className="register-prompt">Don't have an account?</p>
            <p className="account-owner-link">
              Create an organization: 
              <a href="/register/owner" className="owner-link"> Register as Account Owner</a>
            </p>
            <p className="member-info">
              Members can join via invitation link from their organization
            </p>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Login;