'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { QrCode, Shield, Copy, Check } from 'lucide-react'
import Image from 'next/image'

interface TwoFactorSetupProps {
  isEnabled: boolean
  onStatusChange: (enabled: boolean) => void
}

interface SetupData {
  secret: string
  qrCode: string
  manualEntryKey: string
}

export function TwoFactorSetup({ isEnabled, onStatusChange }: TwoFactorSetupProps) {
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const generateSecret = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate 2FA secret')
      }
      
      const data = await response.json()
      setSetupData(data)
      setShowSetup(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to setup 2FA. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const enableTwoFactor = async () => {
    if (!setupData || !verificationCode) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: setupData.secret,
          token: verificationCode,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to enable 2FA')
      }
      
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been enabled.',
      })
      
      onStatusChange(true)
      setShowSetup(false)
      setSetupData(null)
      setVerificationCode('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to enable 2FA',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const disableTwoFactor = async () => {
    if (!verificationCode) {
      toast({
        title: 'Error',
        description: 'Please enter your current 2FA code to disable.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationCode,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disable 2FA')
      }
      
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled.',
      })
      
      onStatusChange(false)
      setVerificationCode('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disable 2FA',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (setupData?.manualEntryKey) {
      await navigator.clipboard.writeText(setupData.manualEntryKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: 'Copied',
        description: 'Secret key copied to clipboard.',
      })
    }
  }

  if (isEnabled && !showSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Your account is protected with two-factor authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication is currently enabled for your account.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="disable-code">Enter your 2FA code to disable</Label>
            <Input
              id="disable-code"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
          </div>
          
          <Button
            onClick={disableTwoFactor}
            disabled={isLoading || !verificationCode}
            variant="destructive"
          >
            {isLoading ? 'Disabling...' : 'Disable 2FA'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with 2FA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showSetup ? (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is not enabled. Your account security could be improved.
              </AlertDescription>
            </Alert>
            
            <Button onClick={generateSecret} disabled={isLoading}>
              {isLoading ? 'Setting up...' : 'Setup 2FA'}
            </Button>
          </>
        ) : (
          setupData && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) or enter the secret key manually.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="border rounded-lg p-4">
                  <Image
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                  />
                </div>
                
                <div className="w-full space-y-2">
                  <Label>Manual Entry Key</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={setupData.manualEntryKey}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="w-full space-y-2">
                  <Label htmlFor="verification-code">Enter verification code</Label>
                  <Input
                    id="verification-code"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
                
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSetup(false)
                      setSetupData(null)
                      setVerificationCode('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={enableTwoFactor}
                    disabled={isLoading || !verificationCode}
                    className="flex-1"
                  >
                    {isLoading ? 'Enabling...' : 'Enable 2FA'}
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
