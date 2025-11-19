// Email service for sending password reset emails
import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  // Check if we have email configuration
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Production: Use real SMTP service
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else if (process.env.SMTP_HOST) {
    // Custom SMTP configuration
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Development: Use Ethereal test account
    return null; // Will create test account dynamically
  }
};

const emailService = {
  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'https://fhapp-client-1pcdknm92-farids-projects-0239e101.vercel.app'}/reset-password?token=${resetToken}&email=${email}`;
      
      let transporter = createTransporter();
      
      // If no transporter (development mode), create test account
      if (!transporter) {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log('\n🧪 USING ETHEREAL TEST EMAIL SERVICE');
        console.log('Test account created:', testAccount.user);
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'FH App <noreply@fhapp.com>',
        to: email,
        subject: 'Password Reset Request - FH App',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background: #f9f9f9; }
              .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 FH App</h1>
                <h2>Password Reset Request</h2>
              </div>
              <div class="content">
                <p>Hi ${userName || 'there'},</p>
                <p>You requested a password reset for your FH App account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p><strong>Or copy and paste this link in your browser:</strong></p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                <p><strong>⏰ This link will expire in 1 hour for security reasons.</strong></p>
                <p>If you did not request this password reset, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>Best regards,<br>The FH App Team</p>
                <p>This is an automated message, please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hi ${userName || 'there'},

You requested a password reset for your FH App account.

Reset your password by clicking this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Best regards,
The FH App Team
        `
      };

      const info = await transporter.sendMail(mailOptions);
      
      // Log success
      console.log('\n✅ PASSWORD RESET EMAIL SENT');
      console.log('=====================================');
      console.log(`To: ${email}`);
      console.log(`Message ID: ${info.messageId}`);
      
      // If using test account, show preview URL
      if (nodemailer.getTestMessageUrl(info)) {
        console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      console.log('=====================================\n');
      
      return {
        success: true,
        message: 'Password reset email sent successfully',
        resetUrl,
        previewUrl: nodemailer.getTestMessageUrl(info) // For testing
      };
      
    } catch (error) {
      console.error('❌ Email sending error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email',
        error: error.message
      };
    }
  },

  // Demo email for new user registration
  async sendWelcomeEmail(email, userName) {
    try {
      console.log('\n📧 WELCOME EMAIL (DEMO)');
      console.log('=====================================');
      console.log(`To: ${email}`);
      console.log(`Subject: Welcome to FH App!`);
      console.log('\nEmail Content:');
      console.log(`Hi ${userName},\n`);
      console.log('Welcome to FH App! Your account has been created successfully.\n');
      console.log('You can now access all features of our full-stack application.\n');
      console.log('If you have any questions, feel free to reach out to our support team.\n');
      console.log('Best regards,');
      console.log('The FH App Team');
      console.log('=====================================\n');
      
      return { success: true };
    } catch (error) {
      console.error('Welcome email error:', error);
      return { success: false };
    }
  }
};

export default emailService;