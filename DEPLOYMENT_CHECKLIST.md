# Production Deployment Checklist

## 🚀 Pre-Deployment Checklist

### ✅ Security Configuration
- [ ] JWT_SECRET is 32+ characters and unique
- [ ] All environment variables are set
- [ ] Firebase security rules are configured
- [ ] CORS is restricted to production domains
- [ ] HTTPS is enabled
- [ ] Admin promotion tool is disabled in production
- [ ] Debug components are removed

### ✅ Database Setup
- [ ] MongoDB is configured and accessible
- [ ] Database user has appropriate permissions
- [ ] Connection string uses SSL
- [ ] INITIAL_ADMIN_EMAIL is set
- [ ] Database indexes are created

### ✅ Application Configuration
- [ ] NODE_ENV=production
- [ ] Error logging is configured
- [ ] API rate limiting is enabled
- [ ] Health checks are working
- [ ] Static files are served efficiently

## 🔧 Deployment Commands

### Quick Start (Docker)
```bash
# 1. Set environment variables
cp .env.production .env
# Edit .env with your values

# 2. Deploy with Docker
docker-compose up -d

# 3. Check logs
docker-compose logs -f
```

### Manual Deployment
```bash
# 1. Install dependencies
npm run install:all

# 2. Build frontend
cd client && npm run build && cd ..

# 3. Start production server
cd server && npm start
```

### Cloud Platform (Vercel + Railway)

**Frontend (Vercel):**
```bash
# Deploy to Vercel
cd client
npx vercel --prod
```

**Backend (Railway):**
```bash
# Deploy to Railway
cd server
npx @railway/cli up
```

## 🔐 Initial Admin Setup

### Option 1: Environment Variable (Recommended)
1. Set `INITIAL_ADMIN_EMAIL=your-admin@domain.com` in environment
2. Register with that email address
3. User will automatically get admin role

### Option 2: Database Command
```javascript
// Connect to MongoDB and run:
db.users.updateOne(
  { email: "your-admin@domain.com" },
  { $set: { role: "admin" } }
)
```

## 🧪 Post-Deployment Testing

### Authentication Flow
```bash
# Test user registration
curl -X POST https://your-api.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test login
curl -X POST https://your-api.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Authorization Tests
- [ ] Admin panel accessible at `/admin`
- [ ] Non-admin users cannot access admin panel
- [ ] Permission toggles work correctly
- [ ] Role changes take effect immediately
- [ ] Protected API endpoints require authentication

### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries are optimized
- [ ] Static files are cached properly

## 📊 Production Monitoring

### Health Checks
```bash
# API Health Check
curl https://your-api.com/api/health

# Database Health Check
curl https://your-api.com/api/health/db
```

### Logging
Monitor these log files:
- Application errors
- Authentication failures
- Permission changes
- Database connection issues

### Metrics to Track
- User registration rate
- Login success/failure rate
- API response times
- Database performance
- Error rates

## 🛡️ Security Monitoring

### Critical Alerts
Set up alerts for:
- Multiple failed login attempts
- Unauthorized admin access attempts
- Permission escalation attempts
- Database connection failures
- SSL certificate expiration

### Regular Security Tasks
- [ ] Review user permissions monthly
- [ ] Update dependencies quarterly
- [ ] Security audit annually
- [ ] Backup verification monthly

## 🆘 Emergency Procedures

### Admin Lockout Recovery
```javascript
// Emergency admin access via database
db.users.updateOne(
  { email: "emergency-admin@domain.com" },
  { 
    $set: { 
      role: "admin",
      isActive: true 
    }
  }
)
```

### Reset All Permissions
```javascript
// Reset user to default permissions
db.users.updateMany(
  { role: "user" },
  { $unset: { permissions: 1 } }
)
```

## 📞 Support Information

### Key Environment Variables
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your_secure_jwt_secret_key_here
CLIENT_URL=https://your-domain.com
INITIAL_ADMIN_EMAIL=admin@your-domain.com
FIREBASE_PROJECT_ID=your-firebase-project
```

### Important URLs
- Frontend: https://your-domain.com
- API: https://your-api-domain.com/api
- Admin Panel: https://your-domain.com/admin
- Health Check: https://your-api-domain.com/api/health

---

## ✅ Deployment Complete!

Your authorization system is now production-ready with:
- 🔐 Role-based access control
- 🛡️ Enterprise-grade security
- 📊 Real-time permission management
- 🚀 Scalable architecture
- 📱 Mobile-responsive interface

Need help? Check the logs or contact support! 🎉