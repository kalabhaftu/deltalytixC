/**
 * Internal Phase ID Validation System
 * Prevents duplicate phase IDs within a user's active accounts
 */

import { prisma } from '@/lib/prisma'

export interface PhaseIdValidationResult {
  isValid: boolean
  error?: string
  conflictingAccount?: {
    id: string
    accountName: string
    phaseNumber: number
  }
}

/**
 * Validates that a phase ID is not already in use by the user's active phases
 * This prevents accidental linking of trades to wrong accounts
 */
export async function validatePhaseId(
  userId: string,
  phaseId: string,
  excludeAccountId?: string
): Promise<PhaseIdValidationResult> {
  

  try {
    // Trim and normalize the phase ID
    const normalizedPhaseId = phaseId.trim()
    
    if (!normalizedPhaseId) {
      return {
        isValid: false,
        error: 'Phase ID cannot be empty'
      }
    }

    // Check for existing phase accounts with this ID
    const existingPhaseAccount = await prisma.phaseAccount.findFirst({
      where: {
        phaseId: normalizedPhaseId,
        MasterAccount: {
          userId,
          isActive: true, // Only check active master accounts
          ...(excludeAccountId ? { NOT: { id: excludeAccountId } } : {})
        },
        status: {
          in: ['active', 'pending'] // Only check active or pending phases
        }
      },
      include: {
        MasterAccount: {
          select: {
            id: true,
            accountName: true
          }
        }
      }
    })

    if (existingPhaseAccount) {

      return {
        isValid: false,
        error: `Phase ID "${normalizedPhaseId}" is already in use`,
        conflictingAccount: {
          id: existingPhaseAccount.MasterAccount.id,
          accountName: existingPhaseAccount.MasterAccount.accountName,
          phaseNumber: existingPhaseAccount.phaseNumber
        }
      }
    }


    return {
      isValid: true
    }

  } catch (error) {
    console.error('[PHASE_ID_VALIDATION] Validation failed:', error)
    
    return {
      isValid: false,
      error: 'Failed to validate phase ID'
    }
  }
}

/**
 * Validates multiple phase IDs at once (for account creation with multiple phases)
 */
export async function validateMultiplePhaseIds(
  userId: string,
  phaseIds: { phaseNumber: number; phaseId: string }[],
  excludeAccountId?: string
): Promise<{ [key: number]: PhaseIdValidationResult }> {
  
  const results: { [key: number]: PhaseIdValidationResult } = {}
  
  // Check for duplicates within the provided IDs
  const providedIds = new Set<string>()
  const duplicatesWithinSet = new Set<string>()
  
  for (const { phaseNumber, phaseId } of phaseIds) {
    const normalizedId = phaseId.trim()
    if (providedIds.has(normalizedId)) {
      duplicatesWithinSet.add(normalizedId)
    }
    providedIds.add(normalizedId)
  }
  
  // Validate each phase ID
  for (const { phaseNumber, phaseId } of phaseIds) {
    const normalizedId = phaseId.trim()
    
    // Check for duplicates within the provided set first
    if (duplicatesWithinSet.has(normalizedId)) {
      results[phaseNumber] = {
        isValid: false,
        error: `Duplicate phase ID "${normalizedId}" provided in request`
      }
      continue
    }
    
    // Validate against database
    results[phaseNumber] = await validatePhaseId(userId, normalizedId, excludeAccountId)
  }
  
  return results
}

