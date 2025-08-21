'use server'

import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

interface TwoFactorSecret {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}

export async function generateTwoFactorSecret(userEmail: string): Promise<TwoFactorSecret> {
  const secret = speakeasy.generateSecret({
    name: `Deltalytix (${userEmail})`,
    issuer: 'Deltalytix',
    length: 32,
  })

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate 2FA secret')
  }

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

  return {
    secret: secret.base32!,
    qrCodeUrl,
    manualEntryKey: secret.base32!,
  }
}

export async function verifyTwoFactorToken(token: string, secret: string): Promise<boolean> {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps tolerance
  })
}

export async function enableTwoFactor(secret: string, token: string): Promise<boolean> {
  const userId = await getUserId()
  
  // Verify the token first
  const isValid = await verifyTwoFactorToken(token, secret)
  if (!isValid) {
    return false
  }

  // Store the secret in database
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    },
  })

  return true
}

export async function disableTwoFactor(token: string): Promise<boolean> {
  const userId = await getUserId()
  
  // Get user's current secret
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  })

  if (!user?.twoFactorSecret) {
    return false
  }

  // Verify the token
  const isValid = await verifyTwoFactorToken(token, user.twoFactorSecret)
  if (!isValid) {
    return false
  }

  // Remove 2FA from database
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    },
  })

  return true
}

export async function verifyUserTwoFactor(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      twoFactorSecret: true, 
      twoFactorEnabled: true 
    },
  })

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return true // 2FA not enabled, allow access
  }

  return verifyTwoFactorToken(token, user.twoFactorSecret)
}

export async function getUserTwoFactorStatus(userId: string): Promise<{
  enabled: boolean
  hasSecret: boolean
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      twoFactorSecret: true, 
      twoFactorEnabled: true 
    },
  })

  return {
    enabled: user?.twoFactorEnabled ?? false,
    hasSecret: !!user?.twoFactorSecret,
  }
}
