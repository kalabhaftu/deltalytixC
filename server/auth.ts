'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { headers } from "next/headers"
// Removed locales import - using plain English strings

export async function getWebsiteURL() {
  // In development, always use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/'
  }
  
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'
  
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  return url
}

export async function createClient() {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Check for placeholder values
  if (!supabaseUrl || !supabaseKey ||
      supabaseUrl.includes('[YOUR_PROJECT_REF]') ||
      supabaseKey.includes('your-anon-key') ||
      supabaseUrl === 'https://[YOUR_PROJECT_REF].supabase.co' ||
      supabaseKey === 'your-anon-key-from-supabase') {
    throw new Error('Supabase configuration is incomplete. Please check your environment variables.')
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function signInWithDiscord(next: string | null = null) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${websiteURL}api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })
  if (data.url) {
    // Before redirecting, ensure user is created/updated in Prisma database
    redirect(data.url)
  }
}

export async function signInWithGoogle(next: string | null = null) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${websiteURL}api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
}


export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/authentication')
}

export async function signInWithEmail(email: string, next: string | null = null) {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()

  // Check Prisma database first (doesn't consume rate-limited requests)
  let dbUserExists = false
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    })
    dbUserExists = !!existingUser
    console.log('[signInWithEmail] Prisma DB check - User exists:', dbUserExists)
  } catch (dbError) {
    console.warn('[signInWithEmail] Prisma DB unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
  }

  // Use database check as primary indicator (doesn't consume rate-limited slots)
  const isExistingUser = dbUserExists
  console.log('[signInWithEmail] Using database check - User exists:', isExistingUser)

  if (isExistingUser) {
    // For existing users, send magic link (not OTP)
    console.log('[signInWithEmail] Existing user detected, sending magic link')
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${websiteURL}api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : '?next=/dashboard'}`,
      }
    })

    if (error) {
      console.error('[signInWithEmail] Magic link error:', error)
      console.error('[signInWithEmail] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      })

      // Handle Supabase's built-in rate limiting
      if (error.status === 429 && (error.message.includes('rate limit') || error.code === 'over_email_send_rate_limit')) {
        console.log('[signInWithEmail] Supabase rate limit detected, returning error to client')
        return {
          error: error.message,
          rateLimited: true,
          isExistingUser: true,
          emailSent: false // Supabase didn't send the email due to rate limit
        }
      }

      // Return error result instead of throwing
      return {
        error: error.message,
        rateLimited: false,
        isExistingUser: true,
        emailSent: false
      }
    }

    console.log('[signInWithEmail] Magic link sent successfully for existing user')
    return { isExistingUser: true, emailSent: true }
  } else {
    // For new users, use signUp with OTP
    console.log('[signInWithEmail] New user detected, sending signup OTP')
    const { error } = await supabase.auth.signUp({
      email: email,
      password: generateTemporaryPassword(),
      options: {
        emailRedirectTo: undefined, // This forces OTP mode for new users
        data: {
          email: email,
        }
      }
    })

    if (error) {
      console.error('[signInWithEmail] Signup OTP error:', error)
      console.error('[signInWithEmail] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      })

      // Handle Supabase's built-in rate limiting
      if (error.status === 429 && (error.message.includes('rate limit') || error.code === 'over_email_send_rate_limit')) {
        console.log('[signInWithEmail] Supabase rate limit detected, returning error to client')
        return {
          error: error.message,
          rateLimited: true,
          isExistingUser: false,
          emailSent: false // Supabase didn't send the email due to rate limit
        }
      }

      // Return error result instead of throwing
      return {
        error: error.message,
        rateLimited: false,
        isExistingUser: false,
        emailSent: false
      }
    }

    console.log('[signInWithEmail] Signup OTP sent successfully for new user')
    return { isExistingUser: false, emailSent: true }
  }
}

// Generate a temporary password for signUp (user won't use this)
function generateTemporaryPassword(): string {
  return Math.random().toString(36).slice(-12) + 'A1!'
}

interface SupabaseUser {
  id: string;
  email?: string | null;
}

export async function ensureUserInDatabase(user: SupabaseUser, locale?: string) {
  
  if (!user) {
    console.log('[ensureUserInDatabase] ERROR: No user provided');
    await signOut();
    throw new Error('User data is required for authentication.');
  }

  if (!user.id) {
    console.log('[ensureUserInDatabase] ERROR: No user ID provided');
    await signOut();
    throw new Error('User ID is required for authentication.');
  }

  try {
    // First try to find user by auth_user_id with error handling
    let existingUserByAuthId;
    try {
      existingUserByAuthId = await prisma.user.findUnique({
        where: { auth_user_id: user.id },
      });
    } catch (dbError) {
      console.error('[ensureUserInDatabase] Database query failed:', dbError)
      // Return false to allow graceful degradation
      return false
    }

    // If user exists by auth_user_id, update email if needed
    if (existingUserByAuthId) {
      // If email is different, update it
      if (existingUserByAuthId.email !== user.email) {
        console.log('[ensureUserInDatabase] Updating existing user email');
        try {
          const updatedUser = await prisma.user.update({
            where: {
              auth_user_id: user.id // Always use auth_user_id as the unique identifier
            },
            data: {
              email: user.email || existingUserByAuthId.email,
              language: locale || existingUserByAuthId.language
            },
          });
          console.log('[ensureUserInDatabase] SUCCESS: User updated successfully');
          return updatedUser;
        } catch (updateError) {
          console.error('[ensureUserInDatabase] ERROR: Failed to update user email:', updateError);
          throw new Error('Failed to update user email address.');
        }
      }
      console.log('[ensureUserInDatabase] SUCCESS: Existing user found, no update needed');
      return existingUserByAuthId;
    }

    // If user doesn't exist by auth_user_id, check if email exists
    if (user.email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUserByEmail && existingUserByEmail.auth_user_id !== user.id) {
        console.log('[ensureUserInDatabase] ERROR: Account conflict - email already associated with different auth method', {
          userEmail: user.email,
          existingAuthId: existingUserByEmail.auth_user_id,
          currentAuthId: user.id
        });
        await signOut();
        throw new Error('This email is already associated with a different authentication method. Please use the original sign-in method or contact support.');
      }
    }

    // Create new user if no existing user found
    console.log('[ensureUserInDatabase] Creating new user');
    try {
      const newUser = await prisma.user.create({
        data: {
          auth_user_id: user.id,
          email: user.email || '', // Provide a default empty string if email is null
          id: user.id,
          language: locale || 'en'
        },
      });
      console.log('[ensureUserInDatabase] SUCCESS: New user created successfully');
      return newUser;
    } catch (createError) {
      if (createError instanceof Error &&
        createError.message.includes('Unique constraint failed')) {
        console.log('[ensureUserInDatabase] ERROR: Unique constraint failed when creating user', createError);
        await signOut();
        throw new Error('Database integrity error: Duplicate user records found');
      }
      console.error('[ensureUserInDatabase] ERROR: Failed to create user:', createError);
      await signOut();
      throw new Error('Failed to create user account');
    }
  } catch (error) {
    // Re-throw NEXT_REDIRECT errors immediately (these are normal Next.js redirects)
    if (error instanceof Error && (
      error.message === 'NEXT_REDIRECT' || 
      ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))
    )) {
      throw error;
    }

    console.error('[ensureUserInDatabase] ERROR: Unexpected error in main catch block:', error);

    // Handle database connection errors gracefully - DON'T sign out user
    if (error instanceof Error && (
      error.message.includes("Can't reach database server") ||
      error.message.includes('P1001') ||
      error.message.includes('Connection timeout') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    )) {
      console.log('[ensureUserInDatabase] Database connection error - allowing graceful degradation');
      // Return without signing out - let the middleware handle the auth state
      return null;
    }

    // Handle Prisma validation errors (these require sign out)
    if (error instanceof Error) {
      if (error.message.includes('Argument `where` of type UserWhereUniqueInput needs')) {
        console.log('[ensureUserInDatabase] ERROR: Invalid user identification provided');
        await signOut();
        throw new Error('Invalid user identification provided');
      }

      if (error.message.includes('Unique constraint failed')) {
        console.log('[ensureUserInDatabase] ERROR: Database integrity error - duplicate user records');
        await signOut();
        throw new Error('Database integrity error: Duplicate user records found');
      }

      if (error.message.includes('Account conflict')) {
        console.log('[ensureUserInDatabase] ERROR: Re-throwing account conflict error');
        // Error already handled above
        throw error;
      }
    }

    // For authentication-related errors, sign out the user
    if (error instanceof Error && (
      error.message.includes('User not authenticated') ||
      error.message.includes('Invalid authentication') ||
      error.message.includes('Token expired') ||
      error.message.includes('Invalid token')
    )) {
      console.log('[ensureUserInDatabase] ERROR: Authentication error - signing out user');
      await signOut();
      throw new Error('Authentication error occurred. Please log in again.');
    }

    // For other unexpected errors, don't sign out - just log and continue
    console.log('[ensureUserInDatabase] ERROR: Unexpected error - allowing graceful degradation:', error);
    return null;
  }
}

export async function verifyOtp(email: string, token: string, type: 'email' | 'signup' = 'email') {
  try {
    console.log('[verifyOtp] Starting OTP verification for:', email)
    const supabase = await createClient()

    // Try to verify the OTP - Supabase will handle the type automatically
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type
    })

    if (error) {
      console.error('[verifyOtp] Supabase OTP verification error:', error)
      console.error('[verifyOtp] Error details:', {
        message: error.message,
        status: error.status
      })
      throw new Error(error.message)
    }

    console.log('[verifyOtp] OTP verification successful for:', email)

    // After successful OTP verification, ensure user exists in database (if DB is available)
    if (data.user) {
      try {

        // Check if user already exists in our database with this email
        const existingUser = await prisma.user.findUnique({
          where: { email: email }
        })

        if (existingUser && existingUser.auth_user_id !== data.user.id) {
          // User exists with different auth ID - update the auth_user_id instead of creating conflict
          await prisma.user.update({
            where: { email: email },
            data: { auth_user_id: data.user.id }
          })
        } else if (!existingUser) {
          // New user, create in database
          const locale = 'en' // Default locale
          await ensureUserInDatabase(data.user, locale)
        }

        console.log('[verifyOtp] User database sync completed successfully')
      } catch (dbError) {
        console.warn('[verifyOtp] Database unavailable, skipping user sync. Authentication still successful:', dbError)
        // Don't throw - authentication succeeded, database sync is secondary
        // The app will work with just Supabase auth, database sync can happen later
      }
    }

    return data
  } catch (error) {
    console.error('[verifyOtp] Unexpected error:', error)
    throw error
  }
}

// Optimized function that uses middleware data when available
export async function getUserId(): Promise<string> {
  try {
    // First try to get user ID from middleware headers
    const headersList = await headers()
    const userIdFromMiddleware = headersList.get('x-user-id')
    const authStatus = headersList.get('x-user-authenticated')

    console.log('[getUserId] Headers:', { userIdFromMiddleware, authStatus, path: headersList.get('x-path') })

    if (userIdFromMiddleware && authStatus === "authenticated") {
      if (process.env.NODE_ENV === 'development') {
        console.log('[getUserId] Using middleware headers:', userIdFromMiddleware)
      }
      return userIdFromMiddleware
    }

    // Check if middleware already detected auth failure
    if (authStatus === "unauthenticated") {
      const authError = headersList.get('x-auth-error')
      if (authError && authError.includes("timeout")) {
        throw new Error("Authentication service temporarily unavailable")
      }
      throw new Error("User not authenticated")
    }
  } catch (headerError) {
    console.warn('[getUserId] Headers not available, falling back to Supabase call')
  }

  // Fallback to Supabase call (for API routes or edge cases) with timeout
  if (process.env.NODE_ENV === 'development') {
    console.log("[Auth] Fallback to Supabase call")
  }
  
  try {
    const supabase = await createClient()
    
    // Add timeout to Supabase call with reasonable timeout for stability
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Auth timeout")), 10000) // Increased to 10 seconds for stability
    )

    const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]) as any

    if (error) {
      if (error.message?.includes("timeout")) {
        throw new Error("Authentication service temporarily unavailable")
      }
      throw new Error("User not authenticated")
    }

    if (!user) {
      throw new Error("User not authenticated")
    }

    return user.id
  } catch (authError) {
    if (authError instanceof Error) {
      if (authError.message === "Auth timeout") {
        throw new Error("Authentication service temporarily unavailable")
      }
      if (authError.message.includes("fetch failed") || authError.message.includes("ConnectTimeoutError")) {
        throw new Error("Authentication service temporarily unavailable")
      }
    }
    throw new Error("User not authenticated")
  }
}

export async function getUserEmail(): Promise<string> {
  const headersList = await headers()
  const userEmail = headersList.get('x-user-email')
  if (process.env.NODE_ENV === 'development') {
    console.log("[Auth] getUserEmail FROM HEADERS", userEmail)
  }
  return userEmail || ""
}

/**
 * Get user ID safely - returns null for unauthenticated users instead of throwing
 * Use this in server actions that should handle unauthenticated users gracefully
 */
export async function getUserIdSafe(): Promise<string | null> {
  try {
    return await getUserId()
  } catch (error) {
    if (error instanceof Error && error.message.includes("not authenticated")) {
      return null // Return null for unauthenticated users instead of throwing
    }
    throw error // Re-throw other errors (like service unavailable)
  }
}

// Identity linking functions
export async function linkDiscordAccount() {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'discord',
    options: {
      redirectTo: `${websiteURL}api/auth/callback?action=link`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
  if (error) {
    throw new Error(error.message)
  }
}

export async function linkGoogleAccount() {
  const supabase = await createClient()
  const websiteURL = await getWebsiteURL()
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${websiteURL}api/auth/callback?action=link`,
    },
  })
  if (data.url) {
    redirect(data.url)
  }
  if (error) {
    throw new Error(error.message)
  }
}

export async function unlinkIdentity(identity: any) {
  const supabase = await createClient()
  const { error } = await supabase.auth.unlinkIdentity(identity)
  if (error) {
    throw new Error(error.message)
  }
  return { success: true }
}

export async function getUserIdentities() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('User not authenticated')
  }

  // Get user's identities using the proper method
  const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
  
  if (identitiesError) {
    throw new Error(identitiesError.message)
  }

  return identities
}