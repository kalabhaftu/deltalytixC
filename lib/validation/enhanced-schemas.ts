/**
 * Enhanced validation schemas with user-friendly error messages
 */

import { z } from 'zod'

// Custom error messages for common validations
const VALIDATION_MESSAGES = {
  required: "This field is required",
  email: "Please enter a valid email address",
  min: (min: number) => `Must be at least ${min} characters`,
  max: (max: number) => `Must be no more than ${max} characters`,
  minValue: (min: number) => `Must be at least ${min}`,
  maxValue: (max: number) => `Must be no more than ${max}`,
  positive: "Must be a positive number",
  percentage: "Must be between 0 and 100",
  alphanumeric: "Can only contain letters, numbers, hyphens, and underscores",
  timeFormat: "Must be in HH:MM format (e.g., 09:30)",
  accountNumber: "Account number must be 6-20 characters and contain only letters, numbers, and hyphens"
}

// Enhanced account number validation
export const AccountNumberSchema = z.string()
  .min(6, VALIDATION_MESSAGES.min(6))
  .max(20, VALIDATION_MESSAGES.max(20))
  .regex(/^[A-Za-z0-9-]+$/, VALIDATION_MESSAGES.accountNumber)

// Enhanced balance validation
export const BalanceSchema = z.number()
  .min(100, "Starting balance must be at least $100")
  .max(10000000, "Starting balance cannot exceed $10,000,000")

// Enhanced percentage validation  
export const PercentageSchema = z.number()
  .min(0, "Percentage cannot be negative")
  .max(100, "Percentage cannot exceed 100%")

// Enhanced prop firm schema
export const PropFirmNameSchema = z.string()
  .min(1, VALIDATION_MESSAGES.required)
  .max(50, VALIDATION_MESSAGES.max(50))
  .refine((value) => value.trim().length > 0, {
    message: "Prop firm name cannot be empty"
  })

// Enhanced time validation
export const TimeSchema = z.string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, VALIDATION_MESSAGES.timeFormat)

// Enhanced drawdown validation
export const DrawdownAmountSchema = z.number()
  .min(0, "Drawdown amount cannot be negative")
  .refine((value) => value > 0, {
    message: "Drawdown amount must be greater than 0"
  })

// Profile update schema with better validation
export const ProfileUpdateSchema = z.object({
  firstName: z.string()
    .min(1, VALIDATION_MESSAGES.required)
    .max(50, VALIDATION_MESSAGES.max(50))
    .regex(/^[A-Za-z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  
  lastName: z.string()
    .min(1, VALIDATION_MESSAGES.required)
    .max(50, VALIDATION_MESSAGES.max(50))
    .regex(/^[A-Za-z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
  
  email: z.string()
    .email(VALIDATION_MESSAGES.email)
    .max(255, VALIDATION_MESSAGES.max(255))
})

// Live account creation schema
export const LiveAccountSchema = z.object({
  name: z.string()
    .min(1, VALIDATION_MESSAGES.required)
    .max(100, VALIDATION_MESSAGES.max(100))
    .refine((value) => value.trim().length > 0, {
      message: "Account name cannot be empty"
    }),
  
  number: AccountNumberSchema,
  
  broker: z.string()
    .min(1, VALIDATION_MESSAGES.required)
    .max(100, VALIDATION_MESSAGES.max(100))
    .refine((value) => value.trim().length > 0, {
      message: "Broker name cannot be empty"
    }),
  
  startingBalance: BalanceSchema.optional(),
  
  accountType: z.enum(['live', 'demo'], {
    errorMap: () => ({ message: "Please select account type" })
  })
})

// Enhanced prop firm account creation
export const EnhancedPropFirmAccountSchema = z.object({
  number: AccountNumberSchema,
  
  name: z.string()
    .max(100, VALIDATION_MESSAGES.max(100))
    .optional(),
  
  propfirm: PropFirmNameSchema,
  
  startingBalance: z.number()
    .min(1000, "Starting balance must be at least $1,000 for prop firm accounts")
    .max(10000000, "Starting balance cannot exceed $10,000,000"),
  
  dailyDrawdownAmount: z.number()
    .min(0, "Daily drawdown cannot be negative")
    .optional(),
  
  maxDrawdownAmount: z.number()
    .min(0, "Max drawdown cannot be negative")
    .optional(),
  
  profitTarget: z.number()
    .min(0, "Profit target cannot be negative")
    .optional(),
  
  timezone: z.string()
    .min(1, "Please select a timezone"),
  
  dailyResetTime: TimeSchema
})
.refine((data) => {
  // Ensure daily drawdown is reasonable
  if (data.dailyDrawdownAmount && data.startingBalance) {
    const percentage = (data.dailyDrawdownAmount / data.startingBalance) * 100
    return percentage <= 10
  }
  return true
}, {
  message: "Daily drawdown cannot exceed 10% of starting balance",
  path: ["dailyDrawdownAmount"]
})
.refine((data) => {
  // Ensure max drawdown is reasonable
  if (data.maxDrawdownAmount && data.startingBalance) {
    const percentage = (data.maxDrawdownAmount / data.startingBalance) * 100
    return percentage <= 20
  }
  return true
}, {
  message: "Max drawdown cannot exceed 20% of starting balance",
  path: ["maxDrawdownAmount"]
})

// Password validation schema
export const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be no more than 128 characters")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  })

// Contact form schema
export const ContactFormSchema = z.object({
  name: z.string()
    .min(1, VALIDATION_MESSAGES.required)
    .max(100, VALIDATION_MESSAGES.max(100)),
  
  email: z.string()
    .email(VALIDATION_MESSAGES.email),
  
  subject: z.string()
    .min(1, VALIDATION_MESSAGES.required)
    .max(200, VALIDATION_MESSAGES.max(200)),
  
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be no more than 2000 characters")
})

// Export types
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>
export type LiveAccountInput = z.infer<typeof LiveAccountSchema>
export type EnhancedPropFirmAccountInput = z.infer<typeof EnhancedPropFirmAccountSchema>
export type ContactFormInput = z.infer<typeof ContactFormSchema>

