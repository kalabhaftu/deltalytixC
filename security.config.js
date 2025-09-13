// Security Configuration for Deltalytix
// This file contains security-related configurations and best practices

const securityConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "*.supabase.co", "localhost:3000"],
      connectSrc: ["'self'", "*.supabase.co", "api.openai.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },

  // Security Headers
  headers: {
    // Prevent XSS attacks
    xssProtection: "1; mode=block",
    
    // Prevent MIME type sniffing
    noSniff: "nosniff",
    
    // Prevent clickjacking
    frameOptions: "DENY",
    
    // Force HTTPS in production
    strictTransportSecurity: process.env.NODE_ENV === 'production' 
      ? "max-age=31536000; includeSubDomains; preload" 
      : null,
    
    // Referrer policy
    referrerPolicy: "strict-origin-when-cross-origin",
    
    // Permissions policy
    permissionsPolicy: "geolocation=(), microphone=(), camera=()",
  },

  // Rate limiting configuration
  rateLimit: {
    // API endpoints
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
    },
    
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 auth attempts per windowMs
    },
    
    // AI/Chat endpoints
    ai: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Limit each IP to 10 AI requests per minute
    }
  },

  // Input validation
  validation: {
    // Maximum file sizes
    maxFileSize: {
      pdf: 10 * 1024 * 1024, // 10MB for PDFs
      image: 5 * 1024 * 1024, // 5MB for images
      csv: 50 * 1024 * 1024,  // 50MB for CSV files
    },
    
    // Allowed file types
    allowedFileTypes: {
      images: ['image/jpeg', 'image/png', 'image/webp'],
      documents: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
    },
    
    // Maximum string lengths
    maxStringLengths: {
      comment: 1000,
      accountName: 100,
      instrumentName: 50,
      tagName: 50,
    }
  },

  // Database security
  database: {
    // Connection pool settings
    poolSettings: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    
    // Query timeout
    queryTimeout: 30000, // 30 seconds
    
    // Enable query logging in development
    logging: process.env.NODE_ENV === 'development',
  },

  // Session configuration
  session: {
    // Session timeout (24 hours)
    maxAge: 24 * 60 * 60 * 1000,
    
    // Secure cookies in production
    secure: process.env.NODE_ENV === 'production',
    
    // SameSite policy
    sameSite: 'lax',
    
    // HTTP only cookies
    httpOnly: true,
  }
};

module.exports = securityConfig;
