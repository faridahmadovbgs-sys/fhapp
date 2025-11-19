// Simple in-memory user store for demo when database is not available
const demoUsers = [
  {
    id: '1',
    name: 'Demo User',
    email: 'demo@example.com',
    password: 'demo123' // In real app, this would be hashed
  },
  {
    id: '2',
    name: 'Test User',
    email: 'test@example.com',
    password: 'test123'
  }
];

// Simple authentication service without database
export const demoAuthService = {
  // Simulate user login
  login: (email, password) => {
    const user = demoUsers.find(u => u.email === email && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token: `demo-token-${user.id}-${Date.now()}`
      };
    }
    return {
      success: false,
      message: 'Invalid email or password'
    };
  },

  // Simulate user registration
  register: (email, password, name) => {
    const existingUser = demoUsers.find(u => u.email === email);
    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists'
      };
    }

    const newUser = {
      id: String(demoUsers.length + 1),
      name: name || email.split('@')[0],
      email,
      password
    };

    demoUsers.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    
    return {
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword,
      token: `demo-token-${newUser.id}-${Date.now()}`
    };
  },

  // Get available demo users
  getDemoUsers: () => {
    return demoUsers.map(user => ({
      email: user.email,
      password: user.password
    }));
  }
};

export default demoAuthService;