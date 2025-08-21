import { NextRequest, NextResponse } from 'next/server'
import { InputSanitizer, SecurityValidator } from '@/lib/validation'

// Validation middleware for API routes
export function withValidation(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    sanitizeBody?: boolean
    checkSecurity?: boolean
    maxBodySize?: number
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const opts = {
        sanitizeBody: true,
        checkSecurity: true,
        maxBodySize: 10 * 1024 * 1024, // 10MB default
        ...options
      }

      // Check content length
      const contentLength = req.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > opts.maxBodySize) {
        return NextResponse.json(
          { error: 'Request body too large' },
          { status: 413 }
        )
      }

      // Clone request for body reading
      const clonedRequest = req.clone()

      // Validate and sanitize request body if it exists
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        try {
          const body = await clonedRequest.text()
          
          if (body && opts.checkSecurity) {
            // Security checks
            const securityCheck = SecurityValidator.isSafe(body)
            if (!securityCheck.safe) {
              console.warn(`Security threat detected: ${securityCheck.threats.join(', ')}`)
              return NextResponse.json(
                { 
                  error: 'Security violation detected',
                  threats: securityCheck.threats
                },
                { status: 400 }
              )
            }
          }

          // Sanitize JSON body
          if (body && opts.sanitizeBody && req.headers.get('content-type')?.includes('application/json')) {
            try {
              const jsonBody = JSON.parse(body)
              const sanitizedBody = InputSanitizer.sanitizeJsonInput(JSON.stringify(jsonBody))
              
              // Create new request with sanitized body
              const sanitizedRequest = new NextRequest(req.url, {
                method: req.method,
                headers: req.headers,
                body: JSON.stringify(sanitizedBody),
              })
              
              return handler(sanitizedRequest)
            } catch (error) {
              return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
              )
            }
          }
        } catch (error) {
          // Body reading failed, continue with original request
          console.warn('Failed to read request body for validation:', error)
        }
      }

      // Continue with original handler
      return handler(req)
    } catch (error) {
      console.error('Validation middleware error:', error)
      return NextResponse.json(
        { error: 'Request validation failed' },
        { status: 400 }
      )
    }
  }
}

// URL parameter validation
export function validateUrlParams(
  params: Record<string, string | string[]>,
  rules: Record<string, {
    required?: boolean
    type?: 'string' | 'number' | 'uuid'
    maxLength?: number
    pattern?: RegExp
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [key, rule] of Object.entries(rules)) {
    const value = params[key]

    // Check required
    if (rule.required && (!value || (Array.isArray(value) && value.length === 0))) {
      errors.push(`Parameter '${key}' is required`)
      continue
    }

    if (value) {
      const stringValue = Array.isArray(value) ? value[0] : value

      // Type validation
      if (rule.type === 'number' && isNaN(Number(stringValue))) {
        errors.push(`Parameter '${key}' must be a number`)
      }

      if (rule.type === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stringValue)) {
        errors.push(`Parameter '${key}' must be a valid UUID`)
      }

      // Length validation
      if (rule.maxLength && stringValue.length > rule.maxLength) {
        errors.push(`Parameter '${key}' exceeds maximum length of ${rule.maxLength}`)
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(stringValue)) {
        errors.push(`Parameter '${key}' does not match required pattern`)
      }

      // Security check
      const securityCheck = SecurityValidator.isSafe(stringValue)
      if (!securityCheck.safe) {
        errors.push(`Parameter '${key}' contains security threats: ${securityCheck.threats.join(', ')}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// Query parameter sanitizer
export function sanitizeSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const sanitized: Record<string, string> = {}

  searchParams.forEach((value, key) => {
    const sanitizedKey = InputSanitizer.sanitizeString(key, { maxLength: 50 })
    const sanitizedValue = InputSanitizer.sanitizeString(value, { maxLength: 1000 })
    
    if (sanitizedKey && sanitizedValue) {
      sanitized[sanitizedKey] = sanitizedValue
    }
  })

  return sanitized
}

// Headers validation
export function validateHeaders(
  headers: Headers,
  requiredHeaders: string[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required headers
  for (const header of requiredHeaders) {
    if (!headers.get(header)) {
      errors.push(`Required header '${header}' is missing`)
    }
  }

  // Validate content-type for POST/PUT requests
  const contentType = headers.get('content-type')
  if (contentType) {
    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
      'text/plain'
    ]

    const isAllowed = allowedTypes.some(type => contentType.includes(type))
    if (!isAllowed) {
      errors.push(`Content-Type '${contentType}' is not allowed`)
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip']
  for (const header of suspiciousHeaders) {
    const value = headers.get(header)
    if (value) {
      const securityCheck = SecurityValidator.isSafe(value)
      if (!securityCheck.safe) {
        errors.push(`Header '${header}' contains security threats`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// File upload validation
export function validateFileUpload(
  file: File,
  options: {
    maxSize: number
    allowedTypes: string[]
    allowedExtensions: string[]
  }
): { valid: boolean; error?: string } {
  return InputSanitizer.validateFile(file, options)
}

// Comprehensive request validator
export function validateRequest(req: NextRequest, rules: {
  params?: Record<string, any>
  headers?: string[]
  maxBodySize?: number
  allowedMethods?: string[]
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Method validation
  if (rules.allowedMethods && !rules.allowedMethods.includes(req.method)) {
    errors.push(`Method '${req.method}' is not allowed`)
  }

  // Header validation
  if (rules.headers) {
    const headerValidation = validateHeaders(req.headers, rules.headers)
    if (!headerValidation.valid) {
      errors.push(...headerValidation.errors)
    }
  }

  // URL parameter validation
  if (rules.params) {
    const url = new URL(req.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })

    const paramValidation = validateUrlParams(params, rules.params)
    if (!paramValidation.valid) {
      errors.push(...paramValidation.errors)
    }
  }

  return { valid: errors.length === 0, errors }
}
