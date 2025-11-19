import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

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
      const firebaseAuthService = await import('../services/firebaseAuthService');
      let data;

      if (isSignUp) {
        data = await firebaseAuthService.default.register(formData.email, formData.password, formData.name);
        setSuccess('Account created successfully! Check your email for verification.');
      } else {
        data = await firebaseAuthService.default.login(formData.email, formData.password);
        setSuccess('Login successful! Redirecting...');
      }

      if (data.success) {
        // Firebase AuthContext will handle user state automatically
        // Just show success and redirect
        setTimeout(() => {
          onLogin(data.user);
        }, isSignUp ? 2000 : 1000);
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

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
    setIsForgotPassword(false);
    setFormData({ name: '', email: '', password: '' });
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
          <h1>🚀 FH App</h1>
          <h2>
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p>
            {isForgotPassword 
              ? 'Enter your email to receive reset instructions'
              : isSignUp 
                ? 'Join our full-stack application' 
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
            {isSignUp && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name (optional)"
                disabled={loading}
              />
            </div>
          )}

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
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="6"
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
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
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
            <>
              <p>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <button 
                  type="button" 
                  className="toggle-button"
                  onClick={toggleMode}
                  disabled={loading}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
              {!isSignUp && (
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
            </>
          )}
        </div>

        <div className="demo-info">
          <h3>{isSignUp ? 'Sign Up Information' : 'Authentication'}</h3>
          {isSignUp ? (
            <div>
              <p>Create your account:</p>
              <ul>
                <li>Use your real email address</li>
                <li>Password must be at least 6 characters</li>
                <li>Name is optional (auto-generated if empty)</li>
                <li>🔥 Powered by Firebase Authentication</li>
              </ul>
            </div>
          ) : (
            <div>
              <p>Secure Authentication System:</p>
              <ul>
                <li>✅ Real user accounts with Firebase</li>
                <li>🔐 Secure password encryption</li>
                <li>📧 Password recovery via email</li>
                <li>🚀 Production-ready security</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;