import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'account_owner'],
    default: 'user'
  },
  organizationId: {
    type: String,
    default: null
  },
  organizationName: {
    type: String,
    trim: true,
    maxlength: [100, 'Organization name cannot be more than 100 characters']
  },
  ein: {
    type: String,
    trim: true,
    match: [
      /^\d{2}-?\d{7}$/,
      'Please provide a valid EIN format (XX-XXXXXXX)'
    ]
  },
  permissions: {
    type: Object,
    default: null // Will use role-based permissions if null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by Firebase UID
userSchema.statics.findByUid = function(uid) {
  return this.findOne({ uid });
};

// Instance method to get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to check if user is account owner
userSchema.methods.isAccountOwner = function() {
  return this.role === 'account_owner';
};

// Instance method to check if user belongs to organization
userSchema.methods.belongsToOrganization = function(orgId) {
  return this.organizationId && this.organizationId.toString() === orgId.toString();
};

// Instance method to check if reset token is valid
userSchema.methods.isResetTokenValid = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.resetPasswordToken === hashedToken && 
         this.resetPasswordExpires > Date.now();
};

export default mongoose.model('User', userSchema);