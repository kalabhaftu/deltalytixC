# Cookie Write Operations Mapping

## Complete Reference of All Cookie/Storage Operations in Deltalytix

### 🔐 Authentication Cookie Operations

#### File: `middleware.ts`
```typescript
// Lines 41-50: Supabase Cookie Configuration
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: false, // Allow client-side access if needed
    })
  })
}

// Lines 120-128: Cookie Merging from Auth Response
authResponse.cookies.getAll().forEach((cookie) => {
  response.cookies.set(cookie.name, cookie.value, {
    path: cookie.path,
    domain: cookie.domain,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite as any,
  })
})

// Lines 181-186: User Country Cookie (Primary)
response.cookies.set("user-country", geo.country, {
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
})

// Lines 204-209: User Country Cookie (Fallback)
response.cookies.set("user-country", country, {
  path: "/",
  maxAge: 60 * 60 * 24,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
})
```

#### File: `server/auth.ts`
```typescript
// Lines 31-41: Supabase Cookie Store Configuration
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
      // Graceful handling for Server Components
    }
  },
}
```

### 🍪 Consent & Analytics Storage Operations

#### File: `components/consent-banner.tsx`
```typescript
// Line 54: Check for existing consent
const hasConsent = localStorage.getItem("cookieConsent")

// Line 62: Dev mode consent reset
localStorage.removeItem("cookieConsent")

// Line 105: Save consent preferences
localStorage.setItem("cookieConsent", JSON.stringify(consentSettings))

// Lines 106-114: Update Google Analytics consent
window.gtag?.("consent", "update", {
  analytics_storage: consentSettings.analytics_storage ? "granted" : "denied",
  ad_storage: consentSettings.ad_storage ? "granted" : "denied",
  ad_user_data: consentSettings.ad_user_data ? "granted" : "denied",
  ad_personalization: consentSettings.ad_personalization ? "granted" : "denied",
  functionality_storage: consentSettings.functionality_storage ? "granted" : "denied",
  personalization_storage: consentSettings.personalization_storage ? "granted" : "denied",
  security_storage: consentSettings.security_storage ? "granted" : "denied",
})
```

### 📊 Analytics Cookie Operations

#### File: `app/layout.tsx`
```typescript
// Lines 160-168: PostHog Analytics Initialization
posthog.init('phc_NS2VmvRg0gY0tMBpq3tMX3gOBQdG79VOciAh8NDWSeX', {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
})

// Lines 232-233: Vercel Analytics Components
<SpeedInsights />
<Analytics />
```

### 🌐 Internationalization

#### File: `middleware.ts`
```typescript
// Lines 13-17: I18n Middleware (may set locale cookies internally)
const I18nMiddleware = createI18nMiddleware({
  locales: ["en", "fr"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
})
```

## Summary by Cookie Type

### Essential Cookies (KEEP)
1. **Supabase Auth Cookies** (`sb-*`)
   - **Set by:** `middleware.ts:41-50`, `server/auth.ts:31-41`
   - **Purpose:** User authentication and session management
   - **Security:** httpOnly=false, secure=production, sameSite=lax

### Functional Cookies (OPTIONAL)
2. **User Country** (`user-country`)
   - **Set by:** `middleware.ts:181-186`, `middleware.ts:204-209`
   - **Purpose:** Geolocation-based features
   - **Lifespan:** 24 hours

3. **Locale Preference** (handled by next-international)
   - **Set by:** `middleware.ts:13-17` (internally managed)
   - **Purpose:** Language preference storage

### Non-Essential Cookies/Storage (REMOVE)
4. **Cookie Consent** (localStorage)
   - **Set by:** `components/consent-banner.tsx:105`
   - **Purpose:** Track consent choices

5. **PostHog Analytics** (multiple cookies)
   - **Set by:** `app/layout.tsx:160-168`
   - **Purpose:** User behavior tracking

6. **Vercel Analytics** (tracking cookies)
   - **Set by:** `app/layout.tsx:232-233`
   - **Purpose:** Performance and usage analytics

## Removal Priority

### High Priority (Remove First)
1. Delete `components/consent-banner.tsx` entirely
2. Remove PostHog script from `app/layout.tsx:160-168`
3. Remove Vercel Analytics from `app/layout.tsx:232-233`
4. Remove consent banner from `app/[locale]/layout.tsx:11`

### Medium Priority (Optional)
1. Remove geolocation cookies from `middleware.ts:176-213`
2. Simplify i18n if only one language needed

### Low Priority (Keep Working)
1. Maintain all Supabase auth cookie operations
2. Test authentication flow after changes

---

*This mapping provides exact line references for all cookie write operations in the codebase.*
