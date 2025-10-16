"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { signInWithDiscord, signInWithEmail, verifyOtp, signInWithGoogle } from "@/server/auth"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Mail, Hash, Shield, Copy, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator
} from "@/components/ui/input-otp"

const formSchema = z.object({
    email: z.string().email(),
})

const otpFormSchema = z.object({
    otp: z.string().length(6, "Verification code must be 6 digits"),
})


interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

type AuthMethod = 'email' | 'discord' | 'google' | null

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [isEmailSent, setIsEmailSent] = React.useState<boolean>(false)
    const [countdown, setCountdown] = React.useState<number>(0)
    const [authMethod, setAuthMethod] = React.useState<AuthMethod>(null)
    const [showOtpInput, setShowOtpInput] = React.useState<boolean>(false)
    const [nextUrl, setNextUrl] = React.useState<string | null>(null)
    const [isExistingUser, setIsExistingUser] = React.useState<boolean>(false)
    const [otpError, setOtpError] = React.useState<boolean>(false)
    const [showPasteButton, setShowPasteButton] = React.useState<boolean>(false)
    const router = useRouter()

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const next = urlParams.get('next')
        setNextUrl(next)
    }, [])

    React.useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    })

    const otpForm = useForm<z.infer<typeof otpFormSchema>>({
        resolver: zodResolver(otpFormSchema),
        defaultValues: {
            otp: "",
        },
    })

    // Handle paste functionality
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            const cleanText = text.replace(/\D/g, '') // Remove non-digits
            if (cleanText.length === 6) {
                otpForm.setValue('otp', cleanText)
                setShowPasteButton(false)
            } else {
                toast.error("Invalid code", {
                    description: "Please copy a 6-digit verification code"
                })
            }
        } catch (error) {
            toast.error("Paste failed", {
                description: "Could not read from clipboard"
            })
        }
    }

    // Track verification attempts to prevent spam and rate limiting
    const [isVerifying, setIsVerifying] = React.useState(false)
    const [failedAttempts, setFailedAttempts] = React.useState(0)
    const [isRateLimited, setIsRateLimited] = React.useState(false)
    const verificationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const rateLimitTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    // OTP submission function
    const onSubmitOtp = React.useCallback(async (values: z.infer<typeof otpFormSchema>) => {
        // Prevent multiple simultaneous verification attempts
        if (isVerifying || isLoading) {
            console.log('OTP verification already in progress, skipping...')
            return
        }

        // Client-side rate limiting: max 5 attempts, then 30 second cooldown
        if (isRateLimited) {
            toast.error("Rate Limited", {
                description: "Too many attempts. Please wait 30 seconds before trying again.",
            })
            return
        }

        // After 5 failed attempts, enforce rate limit
        if (failedAttempts >= 5) {
            setIsRateLimited(true)
            setOtpError(true)
            otpForm.setValue('otp', '')
            toast.error("Too Many Failed Attempts", {
                description: "Please wait 30 seconds before trying again.",
            })
            
            // Reset after 30 seconds
            if (rateLimitTimeoutRef.current) {
                clearTimeout(rateLimitTimeoutRef.current)
            }
            rateLimitTimeoutRef.current = setTimeout(() => {
                setIsRateLimited(false)
                setFailedAttempts(0)
                toast.info("Ready to Try Again", {
                    description: "You can now attempt verification again.",
                })
            }, 30000) // 30 seconds
            return
        }

        setIsVerifying(true)
        setIsLoading(true)
        setOtpError(false)
        
        try {
            const email = form.getValues('email')
            await verifyOtp(email, values.otp)
            
            // Reset failed attempts on success
            setFailedAttempts(0)
            setIsRateLimited(false)
            
            toast.success("Success", {
                description: "Successfully verified. Redirecting...",
            })
            router.refresh()
            router.push(nextUrl || '/dashboard')
        } catch (error) {
            console.error('OTP verification error:', error)
            
            // Increment failed attempts
            setFailedAttempts(prev => prev + 1)
            
            // Better error handling based on error type
            const errorMessage = error instanceof Error ? error.message : "Verification failed"
            
            // Handle rate limiting from server
            if (errorMessage.includes('Too many') || errorMessage.includes('rate limit')) {
                setIsRateLimited(true)
                setOtpError(true)
                otpForm.setValue('otp', '')
                toast.error("Too Many Attempts", {
                    description: "Please wait 30 seconds before trying again.",
                })
                
                // Reset after 30 seconds
                if (rateLimitTimeoutRef.current) {
                    clearTimeout(rateLimitTimeoutRef.current)
                }
                rateLimitTimeoutRef.current = setTimeout(() => {
                    setIsRateLimited(false)
                    setFailedAttempts(0)
                }, 30000)
            }
            // Handle all authentication failures - wrong codes, expired, invalid
            else {
                // Always show error and clear input for any verification failure
                setOtpError(true)
                otpForm.setValue('otp', '')
                
                // Determine the specific error message
                let errorTitle = "Invalid Code"
                let errorDescription = `Incorrect verification code. ${5 - failedAttempts - 1} attempts remaining.`
                
                if (errorMessage.includes('expired') || errorMessage.includes('Token has expired')) {
                    errorTitle = "Code Expired"
                    errorDescription = "This verification code has expired. Please request a new one."
                } else if (errorMessage.includes('Authentication failed')) {
                    errorTitle = "Verification Failed"
                    errorDescription = "Unable to verify the code. Please try again."
                }
                
                toast.error(errorTitle, {
                    description: errorDescription,
                })
            }
        } finally {
            setIsLoading(false)
            setIsVerifying(false)
        }
    }, [form, otpForm, router, nextUrl, isVerifying, isLoading, failedAttempts, isRateLimited])

    // Auto-verify when OTP is complete - REBUILT FROM SCRATCH using industry best practices
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/input_event
    // Pattern: Only trigger on actual user input completion, not on every keystroke
    React.useEffect(() => {
        // Get current form subscription to OTP field changes
        const subscription = otpForm.watch((value, { name }) => {
            // Only proceed if the OTP field changed
            if (name !== 'otp') return
            
            const otpValue = value.otp
            
            // Validate: Must be exactly 6 digits, no partial completion
            if (!otpValue || otpValue.length !== 6) {
                // Clear any pending verification if user is still typing
                if (verificationTimeoutRef.current) {
                    clearTimeout(verificationTimeoutRef.current)
                    verificationTimeoutRef.current = null
                }
                return
            }
            
            // Guard: Prevent verification if already in progress or rate limited
            if (isLoading || isVerifying || isRateLimited) {
                return
            }
            
            // Clear any previous errors when user completes OTP entry
            setOtpError(false)
            
            // Cancel any pending verification from previous input
            if (verificationTimeoutRef.current) {
                clearTimeout(verificationTimeoutRef.current)
            }
            
            // Immediate verification on completion (no artificial delay)
            // Using requestAnimationFrame ensures DOM updates complete before verification
            verificationTimeoutRef.current = setTimeout(() => {
                requestAnimationFrame(() => {
                    // Final safety check before verification
                    const finalValue = otpForm.getValues('otp')
                    if (finalValue === otpValue && finalValue.length === 6 && !isLoading && !isVerifying && !isRateLimited) {
                        onSubmitOtp({ otp: finalValue })
                    }
                })
            }, 0) // Zero delay - immediate execution after render cycle
        })
        
        // Cleanup: Unsubscribe and clear timeouts on unmount or dependency change
        return () => {
            subscription.unsubscribe()
            if (verificationTimeoutRef.current) {
                clearTimeout(verificationTimeoutRef.current)
                verificationTimeoutRef.current = null
            }
            if (rateLimitTimeoutRef.current) {
                clearTimeout(rateLimitTimeoutRef.current)
                rateLimitTimeoutRef.current = null
            }
        }
    }, [otpForm, isLoading, isVerifying, isRateLimited, onSubmitOtp])


    async function onSubmitEmail(values: z.infer<typeof formSchema>) {
        if (countdown > 0) return
        
        setIsLoading(true)
        setAuthMethod('email')
        try {
            const result = await signInWithEmail(values.email, nextUrl)
            
            // Handle the response from signInWithEmail
            if (result && typeof result === 'object' && 'isExistingUser' in result) {
                setIsExistingUser(result.isExistingUser)
                setIsEmailSent(result.emailSent)
                
                // Only show OTP input for NEW users, existing users get magic links
                setShowOtpInput(!result.isExistingUser)
                setCountdown(15)
            } else {
                // Fallback for backward compatibility - assume existing user
                setIsExistingUser(true)
                setIsEmailSent(true)
                setShowOtpInput(false)
                setCountdown(15)
            }
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
        } finally {
            setIsLoading(false)
        }
    }


    async function onSubmitDiscord(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)
        setAuthMethod('discord')

        try {
            await signInWithDiscord(nextUrl)
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
            setIsLoading(false)
        }
    }

    async function onSubmitGoogle(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)
        setAuthMethod('google')

        try {
            await signInWithGoogle(nextUrl)
        } catch (error) {
            console.error(error)
            setAuthMethod(null)
            setIsLoading(false)
        }
    }

    function openMailClient() {
        const email = form.getValues('email')
        
        // Check if user is on mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        // On mobile, always use mailto: to open native mail app
        if (isMobile) {
            window.location.href = `mailto:`
            return
        }

        // On desktop, open known email providers in web browser
        const domain = email.split('@')[1]?.toLowerCase()

        if (domain?.includes('gmail.com')) {
            window.open('https://mail.google.com', '_blank', 'noopener,noreferrer')
        } else if (
            domain?.includes('outlook.com') || 
            domain?.includes('hotmail.com') || 
            domain?.includes('live.com') ||
            domain?.includes('msn.com') ||
            domain?.includes('office365.com')
        ) {
            window.open('https://outlook.live.com', '_blank', 'noopener,noreferrer')
        } else if (
            domain?.includes('proton.me') || 
            domain?.includes('protonmail.com') || 
            domain?.includes('pm.me')
        ) {
            window.open('https://mail.proton.me', '_blank', 'noopener,noreferrer')
        } else if (
            domain?.includes('icloud.com') || 
            domain?.includes('me.com') || 
            domain?.includes('mac.com')
        ) {
            window.open('https://www.icloud.com/mail', '_blank', 'noopener,noreferrer')
        } else if (domain?.includes('yahoo.com')) {
            window.open('https://mail.yahoo.com', '_blank', 'noopener,noreferrer')
        } else if (domain?.includes('aol.com')) {
            window.open('https://mail.aol.com', '_blank', 'noopener,noreferrer')
        } else if (domain?.includes('zoho.com')) {
            window.open('https://mail.zoho.com', '_blank', 'noopener,noreferrer')
        } else {
            // Default to mailto: for unknown domains
            window.location.href = `mailto:`
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitEmail)} className="grid gap-2">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Email</FormLabel>
                                <FormControl>
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading || isEmailSent || authMethod === 'discord' || authMethod === 'google'}
                                        className="h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {!isEmailSent ? (
                        <Button
                            disabled={isLoading || countdown > 0 || authMethod === 'discord' || authMethod === 'google'}
                            type="submit"
                            variant="outline"
                            className="h-12 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] hover:bg-muted/50"
                        >
                            {isLoading && authMethod === 'email' && (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Sign In with Email
                        </Button>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-center space-y-2 mb-4 p-4 border rounded-lg bg-muted/50 dark:bg-muted/20 transition-all duration-200">
                                <h3 className="font-semibold text-sm flex items-center justify-center gap-2">
                                    {isExistingUser ? (
                                        <>
                                            <Mail className="h-4 w-4" />
                                            Magic Link Sent!
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="h-4 w-4" />
                                            Verification Code Sent!
                                        </>
                                    )}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {isExistingUser
                                        ? 'Check your email and click the magic link to sign in. The link will redirect you to your dashboard.'
                                        : 'A 6-digit verification code has been sent to your email. Enter it below to complete registration.'
                                    }
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                                onClick={openMailClient}
                                disabled={authMethod === 'discord' || authMethod === 'google'}
                            >
                                <Icons.envelope className="mr-2 h-4 w-4" />
                                Open Mailbox
                            </Button>
                            <Button
                                type="submit"
                                variant="ghost"
                                className="w-full transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                                disabled={countdown > 0 || authMethod === 'discord' || authMethod === 'google'}
                            >
                                {countdown > 0 ? (
                                    `Resend in ${countdown}s`
                                ) : (
                                    'Resend Email'
                                )}
                            </Button>
                        </div>
                    )}
                </form>
            </Form>

            {showOtpInput && !isExistingUser && (
                <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-4">
                        <FormField
                            control={otpForm.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-center block text-sm font-medium">
                                        Enter Verification Code
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex flex-col items-center space-y-3">
                                            {/* Paste Button Tooltip */}
                                            {showPasteButton && (
                                                <div className="relative">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handlePaste}
                                                        className="text-xs px-3 py-1 h-auto bg-background/80 backdrop-blur-sm border-border/50"
                                                    >
                                                        <Copy className="h-3 w-3 mr-1" />
                                                        Paste Code
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {/* OTP Input */}
                                            <div className="relative">
                                                <InputOTP
                                                    maxLength={6}
                                                    value={field.value}
                                                    onChange={(value) => {
                                                        field.onChange(value)
                                                        setOtpError(false)
                                                        // Show paste button when first input is focused and empty
                                                        if (value.length === 0) {
                                                            setShowPasteButton(true)
                                                        } else {
                                                            setShowPasteButton(false)
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        if (field.value.length === 0) {
                                                            setShowPasteButton(true)
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => setShowPasteButton(false), 200)
                                                    }}
                                                    className={`gap-2 transition-all duration-200 ${
                                                        otpError ? 'animate-pulse' : ''
                                                    }`}
                                                >
                                                    <InputOTPGroup>
                                                        <InputOTPSlot 
                                                            index={0} 
                                                            className={`transition-all duration-200 ${
                                                                otpError ? 'border-destructive bg-destructive/10' : ''
                                                            }`}
                                                        />
                                                        <InputOTPSlot 
                                                            index={1}
                                                            className={`transition-all duration-200 ${
                                                                otpError ? 'border-destructive bg-destructive/10' : ''
                                                            }`}
                                                        />
                                                        <InputOTPSlot 
                                                            index={2}
                                                            className={`transition-all duration-200 ${
                                                                otpError ? 'border-destructive bg-destructive/10' : ''
                                                            }`}
                                                        />
                                                    </InputOTPGroup>
                                                    <InputOTPSeparator />
                                                    <InputOTPGroup>
                                                        <InputOTPSlot 
                                                            index={3}
                                                            className={`transition-all duration-200 ${
                                                                otpError ? 'border-destructive bg-destructive/10' : ''
                                                            }`}
                                                        />
                                                        <InputOTPSlot 
                                                            index={4}
                                                            className={`transition-all duration-200 ${
                                                                otpError ? 'border-destructive bg-destructive/10' : ''
                                                            }`}
                                                        />
                                                        <InputOTPSlot 
                                                            index={5}
                                                            className={`transition-all duration-200 ${
                                                                otpError ? 'border-destructive bg-destructive/10' : ''
                                                            }`}
                                                        />
                                                    </InputOTPGroup>
                                                </InputOTP>
                                                
                                                {/* Auto-verification indicator */}
                                                {field.value.length === 6 && isLoading && (
                                                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                                                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                                            <Icons.spinner className="h-3 w-3 animate-spin" />
                                                            <span>Verifying...</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Error message */}
                                            {otpError && (
                                                <div className="text-center space-y-2">
                                                    <p className="text-xs text-destructive animate-in fade-in-0">
                                                        Invalid or expired code. Please try again.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setOtpError(false)
                                                            otpForm.setValue('otp', '')
                                                            // Trigger resend email
                                                            form.handleSubmit(onSubmitEmail)()
                                                        }}
                                                        className="text-xs px-3 py-1 h-auto"
                                                    >
                                                        Request New Code
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-center" />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            )}

            {/* COMMENTED OUT - Verification Link Approach (kept for future reference)
            {isEmailSent && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="text-center space-y-2">
                        <h3 className="font-semibold text-lg">Check Your Email</h3>
                        <p className="text-sm text-muted-foreground">
                            A 6-digit verification code has been sent to your email. Please enter it below.
                        </p>
                    </div>
                </div>
            )}
            */}

            {/* Only show Google/Discord options when not in OTP mode */}
            {!showOtpInput && (
                <>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            type="button"
                            disabled={isLoading || authMethod === 'email'}
                            onClick={onSubmitGoogle}
                            className="w-full h-12 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] hover:bg-muted/50"
                        >
                            {isLoading && authMethod === 'google' ? (
                                <Icons.spinner className="mr-3 h-5 w-5 animate-spin" />
                            ) : (
                                <Icons.google className="mr-3 h-5 w-5" />
                            )}
                            Continue with Google
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                            disabled={isLoading || authMethod === 'email'}
                            onClick={onSubmitDiscord}
                            className="w-full h-12 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] hover:bg-discord/5 hover:border-discord/20"
                        >
                            {isLoading && authMethod === 'discord' ? (
                                <Icons.spinner className="mr-3 h-5 w-5 animate-spin" />
                            ) : (
                                <Icons.discord className="mr-3 h-5 w-5" />
                            )}
                            Continue with Discord
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}