import validator from 'validator'
import { z } from 'zod'

// Input sanitization utilities
export class InputSanitizer {
  // Sanitize string input
  static sanitizeString(input: string, options?: {
    maxLength?: number
    allowEmpty?: boolean
    allowHtml?: boolean
  }): string {
    if (!input) return options?.allowEmpty ? '' : ''
    
    let sanitized = input.trim()
    
    // Escape HTML if not allowed
    if (!options?.allowHtml) {
      sanitized = validator.escape(sanitized)
    }
    
    // Limit length
    if (options?.maxLength) {
      sanitized = sanitized.slice(0, options.maxLength)
    }
    
    return sanitized
  }

  // Sanitize email
  static sanitizeEmail(email: string): string {
    return validator.normalizeEmail(email) || ''
  }

  // Sanitize URL
  static sanitizeUrl(url: string): string {
    if (!url) return ''
    
    const sanitized = validator.trim(url)
    return validator.isURL(sanitized) ? sanitized : ''
  }

  // Sanitize number input
  static sanitizeNumber(input: string | number, options?: {
    min?: number
    max?: number
    decimals?: number
  }): number {
    const num = typeof input === 'string' ? parseFloat(input) : input
    
    if (isNaN(num)) return 0
    
    let sanitized = num
    
    if (options?.min !== undefined) {
      sanitized = Math.max(sanitized, options.min)
    }
    
    if (options?.max !== undefined) {
      sanitized = Math.min(sanitized, options.max)
    }
    
    if (options?.decimals !== undefined) {
      sanitized = parseFloat(sanitized.toFixed(options.decimals))
    }
    
    return sanitized
  }

  // Sanitize file upload
  static validateFile(file: File, options?: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  }): { valid: boolean; error?: string } {
    // Check file size
    if (options?.maxSize && file.size > options.maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${options.maxSize / (1024 * 1024)}MB limit`
      }
    }
    
    // Check file type
    if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      }
    }
    
    // Check file extension
    if (options?.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !options.allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: `File extension .${extension} is not allowed`
        }
      }
    }
    
    return { valid: true }
  }

  // Sanitize SQL-like input (prevent injection)
  static sanitizeSqlInput(input: string): string {
    if (!input) return ''
    
    // Remove dangerous SQL keywords and characters
    const dangerous = [
      'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE',
      'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'SELECT', '--', ';',
      '/*', '*/', 'xp_', 'sp_'
    ]
    
    let sanitized = input
    dangerous.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi')
      sanitized = sanitized.replace(regex, '')
    })
    
    return validator.escape(sanitized.trim())
  }

  // Sanitize JSON input
  static sanitizeJsonInput(input: string): any {
    try {
      const parsed = JSON.parse(input)
      return this.deepSanitizeObject(parsed)
    } catch {
      return null
    }
  }

  // Deep sanitize object recursively
  private static deepSanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj)
    }
    
    if (typeof obj === 'number') {
      return this.sanitizeNumber(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitizeObject(item))
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const sanitizedKey = this.sanitizeString(key, { maxLength: 50 })
          sanitized[sanitizedKey] = this.deepSanitizeObject(obj[key])
        }
      }
      return sanitized
    }
    
    return obj
  }
}

// Zod schemas for validation
export const schemas = {
  // User input schemas
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  
  // Trade schemas
  tradeComment: z.string().max(1000).optional(),
  accountNumber: z.string().min(1).max(50),
  instrument: z.string().min(1).max(20),
  quantity: z.number().int().min(1).max(1000000),
  price: z.number().min(0).max(1000000),
  pnl: z.number().min(-1000000).max(1000000),
  
  // File upload schemas
  csvFile: z.object({
    name: z.string().min(1).max(255),
    size: z.number().min(1).max(50 * 1024 * 1024), // 50MB
    type: z.enum(['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  }),
  
  imageFile: z.object({
    name: z.string().min(1).max(255),
    size: z.number().min(1).max(5 * 1024 * 1024), // 5MB
    type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }),
  
  pdfFile: z.object({
    name: z.string().min(1).max(255),
    size: z.number().min(1).max(10 * 1024 * 1024), // 10MB
    type: z.literal('application/pdf'),
  }),
  
  // API input schemas
  twoFactorToken: z.string().length(6).regex(/^\d{6}$/),
  twoFactorSecret: z.string().min(16).max(64),
  
  // Filter schemas
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }).refine(data => data.from <= data.to, {
    message: "From date must be before to date",
  }),
  
  pnlRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).refine(data => {
    if (data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max
    }
    return true
  }, {
    message: "Min must be less than or equal to max",
  }),
}

// Validation helper functions
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

// Request body validator middleware
export function validateRequestBody<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = validateAndSanitize(schema, data)
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`)
    }
    return result.data
  }
}

// Security checks
export class SecurityValidator {
  // Check for XSS attempts
  static containsXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }

  // Check for SQL injection attempts
  static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION\s+SELECT)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(;\s*DROP\s+TABLE)/gi,
      /(\'\s*OR\s*\'\d+\'\s*=\s*\'\d+)/gi,
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }

  // Check for path traversal attempts
  static containsPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\\\g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
    ]
    
    return pathPatterns.some(pattern => pattern.test(input))
  }

  // Comprehensive security check
  static isSafe(input: string): { safe: boolean; threats: string[] } {
    const threats: string[] = []
    
    if (this.containsXSS(input)) {
      threats.push('XSS')
    }
    
    if (this.containsSQLInjection(input)) {
      threats.push('SQL Injection')
    }
    
    if (this.containsPathTraversal(input)) {
      threats.push('Path Traversal')
    }
    
    return {
      safe: threats.length === 0,
      threats
    }
  }
}
