'use client'

import React from 'react'
import { UseFormReturn, FieldError, FieldErrors } from 'react-hook-form'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FormFieldWrapperProps {
  children: React.ReactNode
  error?: FieldError
  success?: boolean
  hint?: string
  className?: string
}

interface FormErrorsDisplayProps {
  errors: FieldErrors
  className?: string
}

interface FormSuccessMessageProps {
  message: string
  className?: string
}

/**
 * Enhanced form field wrapper with better error display
 */
export function FormFieldWrapper({ 
  children, 
  error, 
  success = false, 
  hint, 
  className 
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
      
      {/* Hint text */}
      {hint && !error && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>{hint}</span>
        </div>
      )}
      
      {/* Success indicator */}
      {success && !error && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          <span>Valid</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Display all form errors in a consolidated view
 */
export function FormErrorsDisplay({ errors, className }: FormErrorsDisplayProps) {
  const errorEntries = Object.entries(errors).filter(([, error]) => error?.message)
  
  if (errorEntries.length === 0) return null
  
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          <p className="font-medium">Please fix the following errors:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {errorEntries.map(([field, error]) => (
              <li key={field}>
                <span className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>: {error?.message}
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Success message component
 */
export function FormSuccessMessage({ message, className }: FormSuccessMessageProps) {
  return (
    <Alert className={cn('border-green-200 bg-green-50 text-green-800', className)}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

/**
 * Form validation summary component
 */
interface FormValidationSummaryProps {
  form: UseFormReturn<any>
  successMessage?: string
  className?: string
}

export function FormValidationSummary({ 
  form, 
  successMessage, 
  className 
}: FormValidationSummaryProps) {
  const { formState } = form
  const hasErrors = Object.keys(formState.errors).length > 0
  const isValid = formState.isValid && formState.isDirty
  
  if (!hasErrors && !isValid && !successMessage) return null
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Errors */}
      {hasErrors && (
        <FormErrorsDisplay errors={formState.errors} />
      )}
      
      {/* Success */}
      {!hasErrors && successMessage && (
        <FormSuccessMessage message={successMessage} />
      )}
    </div>
  )
}

/**
 * Real-time validation indicator
 */
interface ValidationIndicatorProps {
  isValid: boolean
  isValidating: boolean
  isDirty: boolean
  className?: string
}

export function ValidationIndicator({ 
  isValid, 
  isValidating, 
  isDirty, 
  className 
}: ValidationIndicatorProps) {
  if (!isDirty) return null
  
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {isValidating ? (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-muted-foreground">Validating...</span>
        </>
      ) : isValid ? (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-green-600">Valid</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Invalid</span>
        </>
      )}
    </div>
  )
}

/**
 * Field-level validation helper
 */
interface FieldValidationProps {
  form: UseFormReturn<any>
  name: string
  children: React.ReactNode
  hint?: string
  showValidation?: boolean
  className?: string
}

export function FieldValidation({ 
  form, 
  name, 
  children, 
  hint, 
  showValidation = true,
  className 
}: FieldValidationProps) {
  const fieldState = form.getFieldState(name)
  const fieldError = form.formState.errors[name] as FieldError | undefined
  
  return (
    <FormFieldWrapper
      error={fieldError}
      success={showValidation && fieldState.isDirty && !fieldError}
      hint={hint}
      className={className}
    >
      {children}
      {showValidation && (
        <ValidationIndicator
          isValid={!fieldError}
          isValidating={fieldState.isValidating}
          isDirty={fieldState.isDirty}
          className="mt-1"
        />
      )}
    </FormFieldWrapper>
  )
}
