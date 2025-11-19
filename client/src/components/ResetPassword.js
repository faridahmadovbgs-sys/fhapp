import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Login.css'; // Reuse the same styles

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    // Check if we have required parameters
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token, email]);

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

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { authService } = await import('../services/apiService');
      const data = await authService.resetPassword(token, email, formData.password);

      if (data.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🚀 Integrant</h1>
          <h2>Reset Your Password</h2>
          <p>Enter your new password below</p>
        </div>

        {token && email ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your new password"
                minLength="6"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your new password"
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
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Resetting Password...
                </>
              ) : success ? (
                'Password Reset Successfully!'
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        ) : (
          <div className="error-message">
            Invalid reset link. The link may be expired or malformed.
          </div>
        )}

        <div className="login-footer">
          <p>
            <button 
              type="button" 
              className="toggle-button"
              onClick={goToLogin}
              disabled={loading}
            >
              Back to Login
            </button>
          </p>
        </div>

        <div className="demo-info">
          <h3>Password Requirements</h3>
          <ul>
            <li>Minimum 6 characters long</li>
            <li>Must match confirmation</li>
            <li>Will be securely hashed when saved</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;