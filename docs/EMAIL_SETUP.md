# Email Configuration Guide for Password Recovery

## Quick Fix: Testing Password Recovery

**Current Status**: Your password recovery is working, but the reset link is returned in the response instead of being emailed. This is a temporary solution for immediate testing.

### How to Test Right Now:

1. **Go to your deployed app**: https://fhapp-client-1pcdknm92-farids-projects-0239e101.vercel.app
2. **Click "Forgot your password?"**
3. **Enter any email address**
4. **Look for the reset link in the success message**
5. **Copy and paste the link to reset your password**

---

## Setting Up Real Email Service

To send actual emails, you need to configure an email service. Here are the most popular options:

### Option 1: Gmail SMTP (Easiest for Testing)

1. **Enable 2-Step Verification** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

3. **Set Environment Variables in Vercel**:
   ```
   EMAIL_SERVICE=Gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=FH App <your-email@gmail.com>
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account** (free tier: 100 emails/day)
2. **Get API Key** from SendGrid dashboard
3. **Set Environment Variables**:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=your-sendgrid-api-key
   EMAIL_FROM=FH App <noreply@yourdomain.com>
   ```

### Option 3: Mailgun

1. **Create Mailgun Account**
2. **Get SMTP Credentials**
3. **Set Environment Variables**:
   ```
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   EMAIL_USER=your-mailgun-username
   EMAIL_PASS=your-mailgun-password
   EMAIL_FROM=FH App <noreply@yourdomain.com>
   ```

---

## Setting Environment Variables in Vercel

### Method 1: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Open your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

```
EMAIL_SERVICE=Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=FH App <your-email@gmail.com>
FRONTEND_URL=https://your-app-url.vercel.app
```

### Method 2: Vercel CLI

```bash
# Add environment variables via CLI
vercel env add EMAIL_SERVICE Gmail production
vercel env add EMAIL_USER your-email@gmail.com production
vercel env add EMAIL_PASS your-app-password production
vercel env add EMAIL_FROM "FH App <your-email@gmail.com>" production

# Redeploy after adding variables
vercel --prod
```

---

## Testing Email Configuration

### Local Development

1. **Create `.env` file** in `/server` directory:
   ```
   EMAIL_SERVICE=Gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=FH App <your-email@gmail.com>
   FRONTEND_URL=http://localhost:3000
   ```

2. **Start your local server** and test password recovery

### Production Testing

1. **Set environment variables** in Vercel dashboard
2. **Redeploy your app**: `vercel --prod`
3. **Test password recovery** on your live app

---

## Email Templates

The current email includes:
- ✅ Professional HTML template
- ✅ Reset button and plain text link
- ✅ 1-hour expiration notice
- ✅ Security warnings
- ✅ Responsive design

### Customizing Email Template

Edit `/server/src/services/emailService.js`:

```javascript
const mailOptions = {
  from: process.env.EMAIL_FROM || 'Your App <noreply@yourapp.com>',
  to: email,
  subject: 'Password Reset Request - Your App Name',
  html: `<!-- Your custom HTML template -->`
};
```

---

## Troubleshooting

### Common Issues

1. **"Authentication failed" with Gmail**:
   - Enable 2-Step Verification
   - Use App Password, not regular password

2. **"Environment variable not found"**:
   - Check variable names in Vercel dashboard
   - Redeploy after adding variables

3. **Emails going to spam**:
   - Use proper FROM address
   - Add SPF/DKIM records (advanced)
   - Use professional email service

### Debug Mode

To see detailed email logs, check Vercel function logs:

```bash
vercel logs --follow
```

---

## Security Best Practices

1. **Never commit email credentials** to Git
2. **Use environment variables** for all secrets
3. **Rotate credentials** regularly
4. **Monitor email usage** for abuse
5. **Add rate limiting** to prevent spam

---

## Next Steps

1. **Choose an email service** (Gmail for testing, SendGrid for production)
2. **Set environment variables** in Vercel dashboard
3. **Redeploy your application**
4. **Test the complete email flow**
5. **Monitor email delivery and user feedback**

Once configured, users will receive professional password reset emails instead of seeing the reset link in the browser!

---

**Need Help?** The temporary solution (showing reset link in response) works immediately for testing, but follow this guide to enable real email delivery for production use.