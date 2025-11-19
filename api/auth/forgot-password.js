export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Generate a demo token (in production, this would be stored in database)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetUrl = `https://fhapp-client-dkhfe2oio-farids-projects-0239e101.vercel.app/reset-password?token=${resetToken}&email=${email}`;

      // For now, return the reset URL directly (temporary solution)
      res.status(200).json({
        success: true,
        message: 'Password reset instructions sent to your email',
        resetUrl, // Temporary: return URL directly for testing
        note: 'Copy and paste this URL in your browser to reset password (temporary demo)'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error occurred'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}