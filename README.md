# Integrant Platform - Enterprise Organization Management

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![React](https://img.shields.io/badge/React-v18-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-v9+-orange.svg)

**An enterprise-grade platform for managing organizations, team members, billing cycles, and document workflows. Integrant streamlines business operations with automated payment tracking, secure document storage, real-time team collaboration, and granular permission controls - all in one unified system.**

---

## 🎯 What is Integrant Platform?

**Integrant Platform** is a comprehensive **organization management platform** designed for businesses and corporations to:

- **Manage Organizations**: Create and manage multiple organizations with hierarchical structures
- **Team Member Management**: Invite, add, and manage team members with role-based permissions
- **Billing & Payments**: Create bills, track payments, and manage subscriptions for organization members
- **Document Management**: Store, share, and organize both personal and organization-wide documents
- **Real-Time Communication**: Built-in chat system with Firebase Cloud Messaging (FCM) push notifications
- **Secure Access Control**: Advanced role-based authorization with granular permissions
- **Profile Management**: User profiles with photo uploads and customizable information
- **Push Notifications**: Background notifications for messages, announcements, bills, and documents

---

## 🚀 Key Features

### 👑 Account Owner (Organization Admin)
- **Organization Creation**: Set up organizations with EIN and custom branding
- **Member Invitations**: Generate invitation links to onboard team members
- **Billing Management**: 
  - Create one-time or subscription-based bills
  - Assign bills to all members or specific individuals
  - Track payment history and outstanding amounts
  - View detailed payment reports
- **Document Sharing**: Upload and share organization-wide documents
- **Member Management**: View, manage, and remove organization members
- **Access Control**: Manage roles and permissions for team members
- **CSV Import/Export**: Import contacts from CSV and export member lists

### 👤 Organization Members
- **Payment Dashboard**: View pending bills and payment history
- **Payment Processing**: Pay bills with multiple payment methods (credit card, debit card, PayPal, bank transfer)
- **Document Access**: Access organization documents and upload personal documents
- **Profile Management**: Update profile information and upload profile photos
- **Real-Time Chat**: Communicate with team members in real-time
- **Organization View**: See all organization members and their roles

### 🔐 Admin Features
- **User Management**: View and manage all registered users
- **Role Assignment**: Promote users to admin or moderator roles
- **Permission Control**: Assign granular permissions for pages and actions
- **System Monitoring**: Track user activity and system health

---

## 🏗️ Architecture & Technology Stack

### **Frontend**
- **React.js 18** - Modern UI library with hooks and functional components
- **React Router v6** - Client-side routing and navigation
- **Firebase v9+** - Real-time database, authentication, and storage
- **CSS3** - Professional corporate design with CSS custom properties
- **Responsive Design** - Mobile-first approach with breakpoints for all devices

### **Backend & Services**
- **Firebase Firestore** - NoSQL cloud database for real-time data
- **Firebase Authentication** - Secure user authentication and session management
- **Firebase Storage** - Cloud storage for profile photos and documents
- **Node.js** - Server-side runtime (optional for extended features)
- **Express.js** - RESTful API framework (optional)

### **Key Services**
- **Authentication Service**: User registration, login, password recovery
- **Organization Service**: Organization CRUD operations, member management
- **Billing Service**: Bill creation, payment processing, payment history
- **Invitation Service**: Invitation link generation and validation
- **Role Service**: User role management and permission assignment
- **Document Service**: File upload, storage, and retrieval with base64 encoding

---

## 📊 Database Structure

### **Collections**

#### `users`
- User profiles with authentication details
- Role information (account_owner, member, admin, moderator, user)
- Organization associations
- Profile photos and personal information
- Metadata (EIN, subscription status, account creation date)

#### `organizations`
- Organization details (name, EIN, owner)
- Member lists
- Creation timestamps
- Organization metadata

#### `bills`
- Bill information (title, amount, description)
- Bill types (one-time, subscription)
- Assigned members (all or specific members)
- Payment status and history
- Due dates and billing intervals

#### `payments`
- Payment records linked to bills
- Payment methods and amounts
- Member information
- Payment timestamps

#### `invitations`
- Invitation tokens and links
- Organization associations
- Expiration dates
- Status tracking (pending, accepted, expired)

#### `personalDocuments` & `organizationDocuments`
- Document metadata (title, description, category)
- File data (base64 encoded)
- Upload timestamps
- Owner/organization associations

#### `messages`
- Real-time chat messages
- User associations
- Timestamps and message content

#### `userPermissions`
- Granular permission assignments
- Page-level and action-level permissions
- Custom permission sets per user

---

## 🎨 User Interface

### **Professional Corporate Design**
- **Color Palette**: Navy blue primary (#1a365d), corporate blue accents
- **Typography**: Inter font family with professional hierarchy
- **Components**: Gradient buttons, elevated cards, professional forms
- **Animations**: Smooth transitions, animated gradients, hover effects
- **Responsive**: Optimized for desktop, tablet, and mobile devices

### **Key Pages**
- **Home**: Welcome page with feature highlights
- **Dashboard**: Overview of organizations, bills, and payments
- **Members**: Organization member directory with search and pagination
- **Billing**: Bill creation and management interface
- **Payments**: Member payment dashboard and history
- **Documents**: Personal and organization document libraries
- **Chat**: Real-time messaging with push notifications
- **Notifications**: Firebase Cloud Messaging for background notifications
- **Profile**: User profile editing and photo upload
- **Invitations**: Invitation link management and team onboarding
- **Admin Panel**: User and permission management

---

## 🔐 Security & Authorization

### **Role-Based Access Control (RBAC)**
- **Roles**: Super Admin, Account Owner, Admin, Moderator, Member, User
- **Permissions**: Granular control over pages and actions
- **Protected Routes**: Route-level permission checking
- **Component Guards**: Conditional rendering based on permissions
- **Firebase Rules**: Server-side security rules for data access

### **Authentication**
- **Email/Password**: Secure authentication with bcrypt hashing
- **Password Recovery**: Email-based password reset flow
- **Session Management**: JWT-based authentication tokens
- **Account Verification**: Email verification for new accounts

---

## 📋 Use Cases

### **Business Organizations**
- Manage employee memberships and access
- Collect membership fees and track payments
- Share company policies and documents
- Communicate with team members

### **Non-Profit Organizations**
- Manage volunteers and members
- Collect donations and membership dues
- Share organizational documents
- Coordinate team activities

### **Educational Institutions**
- Manage student organizations
- Collect club dues and fees
- Share educational resources
- Facilitate group communication

### **Service Organizations**
- Manage client accounts
- Bill for services rendered
- Share service documents
- Track payment history

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js v16 or higher
- npm v8 or higher
- Firebase account with project setup

### **Installation**

```bash
# Clone the repository
git clone https://github.com/faridahmadovbgs-sys/fhapp.git
cd fhapp

# Install dependencies
npm run install:all

# Configure Firebase
# Create .env file in client/ directory with your Firebase config
# See FIREBASE_SETUP.md for detailed instructions

# Start development servers
npm run dev
```

### **Firebase Configuration**

Create `client/.env` file:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### **Running the Application**

```bash
# Start frontend (http://localhost:3000)
npm run dev:client

# Start backend (http://localhost:5000)
npm run dev:server

# Or start both concurrently
npm run dev
```

---

## 📖 Documentation

- **[BILLING_SYSTEM.md](./BILLING_SYSTEM.md)** - Complete billing and payment system documentation
- **[AUTHORIZATION_GUIDE.md](./AUTHORIZATION_GUIDE.md)** - Role-based access control guide
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration and setup
- **[ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)** - Admin account setup instructions
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - UI design system and components

---

## 🔧 Available Scripts

### Root Level
- `npm run install:all` - Install all dependencies (client + server)
- `npm run dev` - Start both frontend and backend
- `npm run dev:client` - Start frontend only
- `npm run dev:server` - Start backend only
- `npm run build` - Build frontend for production
- `npm run deploy:production` - Build and deploy to production
- `npm run setup:admin` - Setup admin account

### Client
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Server
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests

---

## 🌐 Live Demo

**GitHub Pages**: [https://faridahmadovbgs-sys.github.io/fhapp](https://faridahmadovbgs-sys.github.io/fhapp)

*Note: Runs entirely in the browser with Firebase backend - no separate server needed!*

---

## 📦 Project Structure

```
fhapp/
├── client/                    # React frontend application
│   ├── public/               # Static files
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts (Auth, Authorization)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API and business logic services
│   │   ├── config/          # Firebase and app configuration
│   │   └── App.js           # Main application component
│   └── package.json
├── server/                   # Node.js backend (optional)
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Business logic controllers
│   │   ├── models/          # Data models
│   │   ├── middleware/      # Express middleware
│   │   └── config/          # Server configuration
│   └── package.json
├── docs/                     # Additional documentation
├── package.json             # Root package configuration
└── README.md                # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👥 Developer

**Developed by: Farid Ahmadov**

- **Repository**: [github.com/faridahmadovbgs-sys/fhapp](https://github.com/faridahmadovbgs-sys/fhapp)
- **Contact**: Open an issue on GitHub

---

## 🙏 Acknowledgments

- React.js team for the amazing framework
- Firebase for real-time backend infrastructure
- Open source community for inspiration and tools

---

## 📈 Roadmap

### Upcoming Features
- ✅ Real-time notifications
- ✅ Email notifications for bills and payments
- ✅ Advanced analytics dashboard
- ✅ Multi-currency support
- ✅ Payment gateway integration (Stripe, PayPal)
- ✅ PDF receipt generation
- ✅ Dark mode theme
- ✅ Mobile app (React Native)
- ✅ Calendar integration
- ✅ File version control for documents
- ✅ Advanced reporting and exports

---

## ❓ Support

For questions, issues, or feature requests:
1. Check the [documentation](./docs/)
2. Search existing [GitHub Issues](https://github.com/faridahmadovbgs-sys/fhapp/issues)
3. Open a new issue if needed

---

**Built with ❤️ for modern organizations**
