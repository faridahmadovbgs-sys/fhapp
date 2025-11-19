// Shared utility functions and constants

// API Response formatter
export const formatApiResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

// Common validation patterns
export const validationPatterns = {
  email: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

// HTTP status codes
export const statusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Common error messages
export const errorMessages = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please provide a valid email address',
  WEAK_PASSWORD: 'Password must contain at least 8 characters with uppercase, lowercase, and number',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Access denied. No token provided',
  INVALID_TOKEN: 'Invalid token',
  SERVER_ERROR: 'Internal server error'
};