// Email service for sending password reset emails
// This is a demo implementation - in production, use services like SendGrid, Nodemailer with SMTP, etc.

const emailService = {
  // Demo email sending function
  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      // In a real application, you would use an email service like:
      // - SendGrid
      // - Mailgun  
      // - Nodemailer with SMTP
      // - AWS SES
      
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`;
      
      // Demo: Log the email to console (in production, actually send email)
      console.log('\n📧 PASSWORD RESET EMAIL (DEMO)');
      console.log('=====================================');
      console.log(`To: ${email}`);
      console.log(`Subject: Password Reset Request - FH App`);
      console.log('\nEmail Content:');
      console.log(`Hi ${userName},\n`);
      console.log('You requested a password reset for your FH App account.\n');
      console.log('Click the link below to reset your password:');
      console.log(`${resetUrl}\n`);
      console.log('This link will expire in 10 minutes for security reasons.\n');
      console.log('If you did not request this password reset, please ignore this email.\n');
      console.log('Best regards,');
      console.log('The FH App Team');
      console.log('=====================================\n');
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Password reset email sent successfully',
        resetUrl // In demo mode, return the URL for testing
      };
      
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        message: 'Failed to send password reset email'
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