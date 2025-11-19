# Password Recovery System - Testing Guide

## Overview
Your FH App now includes a complete password recovery system that allows users to reset their passwords when they forget them.

## How It Works

### 1. User Flow
1. **Login Page**: User clicks "Forgot your password?" link
2. **Forgot Password Form**: User enters their email address
3. **Email Notification**: System sends password reset email (simulated in development)
4. **Reset Password Page**: User clicks link in email to access reset form
5. **New Password**: User enters and confirms new password
6. **Completion**: User is redirected back to login with new password

### 2. Security Features
- **Secure Tokens**: Cryptographically secure reset tokens (32 bytes)
- **Token Expiration**: Reset tokens expire after 1 hour
- **Email Validation**: Only registered email addresses can request resets
- **Password Hashing**: New passwords are securely hashed with bcrypt
- **Single Use**: Reset tokens are deleted after successful password reset

## Testing the System

### Frontend Testing (http://localhost:3000)
1. **Access Forgot Password Form**:
   - Go to the login page
   - Click "Forgot your password?" link
   - Enter an email address and submit

2. **Test Reset Password Page**:
   - Navigate directly to: `http://localhost:3000/reset-password?token=test123&email=test@example.com`
   - Enter a new password and confirm it
   - Submit the form

### Backend API Testing

#### 1. Request Password Reset
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

#### 2. Reset Password (with token from email)
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-reset-token-here",
    "email": "test@example.com", 
    "password": "newpassword123"
  }'
```

## Email Configuration

### Development Mode
- Emails are simulated and logged to console
- No actual emails are sent
- Check backend server logs to see "email" content

### Production Setup
To enable real emails, update `server/src/services/emailService.js`:

1. **Configure SMTP Settings**:
```javascript
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com', // or your email provider
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

2. **Add Environment Variables** (server/.env):
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-app@example.com
```

3. **Update Email Template**:
   - Modify the HTML email template in `emailService.js`
   - Customize branding and styling
   - Update reset URL to your production domain

## File Structure

### Frontend Files
- `client/src/components/Login.js` - Includes forgot password form
- `client/src/components/ResetPassword.js` - Password reset page
- `client/src/App.js` - Routing configuration

### Backend Files  
- `server/src/routes/auth.js` - Password reset API endpoints
- `server/src/models/User.js` - User model with reset token fields
- `server/src/services/emailService.js` - Email sending service

## Database Schema

### User Model Extensions
```javascript
{
  // ... existing user fields
  resetPasswordToken: String,        // Secure reset token
  resetPasswordExpires: Date         // Token expiration time
}
```

## Security Considerations

### Token Generation
- Uses Node.js `crypto.randomBytes()` for secure tokens
- 32-byte tokens provide 256 bits of entropy
- Tokens are stored hashed in database

### Rate Limiting (Recommended)
Consider adding rate limiting to prevent abuse:
```javascript
app.use('/api/auth/forgot-password', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
}));
```

### Additional Recommendations
- Log password reset attempts for security monitoring
- Consider email verification for new accounts
- Implement account lockout after multiple failed attempts
- Add CAPTCHA for forgot password form in production

## Troubleshooting

### Common Issues
1. **Token Expired**: Tokens expire after 1 hour - request new reset
2. **Invalid Token**: Check URL parameters match database
3. **Email Not Found**: Only registered emails can reset passwords
4. **Server Connection**: Ensure backend is running on port 5000

### Debug Mode
Enable debug logging in `emailService.js` to troubleshoot email issues:
```javascript
console.log('Password reset email sent:', info);
```

## Next Steps
1. Test the complete password recovery flow
2. Configure real email service for production
3. Add rate limiting and security monitoring
4. Customize email templates with your branding
5. Add additional security features as needed

---

Your password recovery system is now fully functional and ready for testing!