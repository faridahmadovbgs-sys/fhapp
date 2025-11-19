# FH App - Full-Stack Web Application

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![React](https://img.shields.io/badge/React-v18-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-ready-green.svg)

A modern full-stack web application built with React frontend, Node.js backend, and MongoDB database.

## 🌟 Live Demo

**Note**: Replace with your actual deployed URLs after deployment
- **Frontend**: `https://your-app-name.vercel.app`
- **Backend API**: `https://your-api-name.herokuapp.com`

## 🚀 Quick Clone & Run

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fhapp.git
cd fhapp

# Install dependencies
npm run install:all

# Start development servers
npm run dev:client    # Terminal 1: React app on http://localhost:3000
npm run dev:server    # Terminal 2: API server on http://localhost:5000
```

## 🚀 Tech Stack

### Frontend
- **React.js 18** - Modern UI library with hooks
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **CSS3** - Modern styling

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Development Tools
- **nodemon** - Development server auto-restart
- **CORS** - Cross-Origin Resource Sharing
- **Helmet** - Security middleware
- **Morgan** - HTTP request logger

## 📁 Project Structure

```
fhapp/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   └── package.json       # Frontend dependencies
├── server/                # Node.js backend
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   └── app.js         # Server entry point
│   ├── .env.example       # Environment variables template
│   └── package.json       # Backend dependencies
├── shared/                # Shared utilities
└── package.json           # Workspace scripts
```

## 🛠️ Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v16 or higher)
2. **npm** (comes with Node.js)
3. **MongoDB** (local installation or MongoDB Atlas)

### Installing Node.js

**Windows:**
```powershell
# Using Windows Package Manager
winget install OpenJS.NodeJS

# Or download from https://nodejs.org/
```

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or download from https://nodejs.org/
```

### Installing MongoDB

**Windows:**
```powershell
# Using Windows Package Manager
winget install MongoDB.Server
```

**macOS:**
```bash
# Using Homebrew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Or install individually:
npm run install:client
npm run install:server
```

### 2. Environment Setup

Create environment file for the backend:

```bash
# Copy the example environment file
cp server/.env.example server/.env
```

Edit `server/.env` with your configuration:

```env
# Environment Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/fhapp

# JWT Secret (replace with a secure random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Start MongoDB

Make sure MongoDB is running:

```bash
# Windows (if installed as service)
net start MongoDB

# macOS (using Homebrew)
brew services start mongodb-community

# Linux (using systemctl)
sudo systemctl start mongod

# Or run directly
mongod
```

### 4. Run the Application

**Development Mode (Recommended):**

Open two terminal windows/tabs:

```bash
# Terminal 1 - Start backend server
cd server
npm run dev

# Terminal 2 - Start frontend development server
cd client
npm start
```

**Production Mode:**

```bash
# Build frontend
npm run build:client

# Start backend server
npm run start:server
```

## 📚 Available Scripts

### Workspace Level (Root)
- `npm run install:all` - Install dependencies for both frontend and backend
- `npm run install:client` - Install frontend dependencies only
- `npm run install:server` - Install backend dependencies only
- `npm run dev:client` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run build:client` - Build frontend for production

### Frontend (client/)
- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (⚠️ one-way operation)

### Backend (server/)
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart
- `npm test` - Run backend tests

## 🌐 API Endpoints

### Health & Info
- `GET /api/health` - Server health check
- `GET /api/info` - API information

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID

### Example API Usage

```javascript
// Frontend service example
import apiService from './services/apiService';

// Get all users
const users = await apiService.get('/api/users');

// Create new user
const newUser = await apiService.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword123'
});
```

## 🎨 Frontend Features

- ✅ React Router for navigation
- ✅ Responsive design
- ✅ Component-based architecture
- ✅ API integration with Axios
- ✅ Error handling
- ✅ Loading states

## 🔧 Backend Features

- ✅ RESTful API design
- ✅ MongoDB integration with Mongoose
- ✅ Input validation
- ✅ Error handling middleware
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Request logging (Morgan)
- ✅ Password hashing (bcrypt)

## 🔐 Security Features

- Password hashing with bcrypt
- Input validation and sanitization
- Security headers with Helmet
- CORS protection
- Environment variable configuration
- JWT token authentication structure

## 🚀 Deployment

### Frontend Deployment
The frontend can be deployed to:
- **Vercel**: `npm run build` → deploy `build/` folder
- **Netlify**: `npm run build` → deploy `build/` folder  
- **GitHub Pages**: Set up GitHub Actions with build process

### Backend Deployment
The backend can be deployed to:
- **Heroku**: Add `Procfile` with `web: node src/app.js`
- **Railway**: Direct Git deployment
- **DigitalOcean App Platform**: Use this repository
- **AWS/Azure**: Container deployment

### Database Deployment
- **MongoDB Atlas** (recommended): Cloud MongoDB service
- **Self-hosted**: Deploy MongoDB on your server

## 🧪 Testing

```bash
# Run frontend tests
cd client && npm test

# Run backend tests
cd server && npm test
```

## 📝 Development Guidelines

### Code Style
- Use ES6+ modern JavaScript syntax
- Follow React best practices and hooks patterns
- Use async/await for asynchronous operations
- Implement proper error handling
- Write descriptive commit messages

### Database Conventions
- Use camelCase for field names
- Implement proper validation in Mongoose schemas
- Use indexes for frequently queried fields
- Implement soft deletes where appropriate

### API Conventions
- Follow RESTful API principles
- Use HTTP status codes appropriately
- Return consistent JSON response format
- Implement proper error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3000 (frontend)
npx kill-port 3000

# Kill process on port 5000 (backend)  
npx kill-port 5000
```

**MongoDB connection error:**
```bash
# Make sure MongoDB is running
# Check connection string in .env file
# Verify MongoDB service status
```

**npm install errors:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Deployment

### Frontend (Vercel - Recommended)
1. Push your code to GitHub
2. Connect your GitHub repo to [Vercel](https://vercel.com)
3. Set build directory to `client/build`
4. Deploy automatically on push

### Backend (Heroku)
1. Create a Heroku app: `heroku create your-api-name`
2. Set environment variables: `heroku config:set MONGODB_URI=your_mongo_connection`
3. Deploy: `git subtree push --prefix server heroku main`

### Database (MongoDB Atlas)
1. Create account at [MongoDB Atlas](https://mongodb.com/cloud/atlas)
2. Create cluster and get connection string
3. Update `MONGODB_URI` in environment variables

## 📈 Project Stats

- **30 Files** - Well-organized project structure
- **2500+ Lines** - Comprehensive full-stack implementation
- **JWT Auth** - Secure authentication system
- **RESTful API** - Professional backend architecture
- **Responsive UI** - Modern React components

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by best practices in full-stack development
- Thanks to the open-source community

## 📞 Support

For support and questions:
- 🐛 [Create an issue](https://github.com/YOUR_USERNAME/fhapp/issues)
- 📚 Check existing documentation
- 💬 Review discussions and community help

---

⭐ **Star this repo if it helped you!** ⭐

Happy coding! 🎉