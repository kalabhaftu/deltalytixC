# Deltalytix Cookie Inventory & Analysis

## Overview
This document provides a comprehensive analysis of all cookies and storage mechanisms used in the Deltalytix application, along with recommendations for the personal-use transformation.

## Cookie Categories & Analysis

### 🔐 Authentication Cookies (KEEP - Essential)

#### Supabase Auth Cookies
- **Names:** `sb-access-token`, `sb-refresh-token`, and other `sb-*` cookies
- **Set by:** `@supabase/ssr` in `server/auth.ts` and `middleware.ts`
- **Purpose:** Maintain user authentication sessions
- **Lifespan:** Session-based with refresh rotation
- **Flags:** 
  - `httpOnly: false` (allowing client-side access)
  - `secure: true` (production only)
  - `sameSite: "lax"`
- **Keep/Remove:** **KEEP** - Essential for user authentication
- **Files involved:**
  - `server/auth.ts:21-44` (cookie store configuration)
  - `middleware.ts:37-54` (auth cookie handling)
  - `app/api/auth/callback/route.ts` (OAuth callback processing)

### 🌍 Geolocation Cookies (OPTIONAL)

#### User Country Cookie
- **Name:** `user-country`
- **Set by:** `middleware.ts:181-186, 204-209`
- **Purpose:** Store user's detected country for localization
- **Lifespan:** 24 hours (`maxAge: 60 * 60 * 24`)
- **Flags:** `sameSite: "lax"`, `secure: true` (production)
- **Keep/Remove:** **OPTIONAL** - Not essential for core functionality

### 🎨 UI Preferences (REVIEW - Currently localStorage)

#### Theme Cookie
- **Status:** No theme cookies found - likely using localStorage
- **Recommendation:** Verify if `next-themes` uses localStorage or cookies
- **Keep/Remove:** **KEEP as localStorage** - Avoid cookies for non-essential preferences

### 🌐 Internationalization (OPTIONAL)

#### Next-International Locale
- **Implementation:** `next-international` with middleware handling
- **Cookie name:** Not explicitly found - may use URL rewriting only
- **Set by:** `middleware.ts:13-17` (I18nMiddleware)
- **Purpose:** Remember user's language preference
- **Keep/Remove:** **OPTIONAL** - Only needed if language switching is required

### 📊 Analytics & Tracking Cookies (REMOVE - Not needed for personal use)

#### PostHog Analytics
- **Names:** `_ph_*` cookies and localStorage entries
- **Set by:** PostHog script in `app/layout.tsx:160-168`
- **Purpose:** User analytics and tracking
- **Keep/Remove:** **REMOVE** - Not needed for personal use

#### Vercel Analytics
- **Implementation:** `@vercel/analytics` in `app/layout.tsx:5,233`
- **Purpose:** Page view tracking
- **Keep/Remove:** **REMOVE** - Not needed for personal use

### 🍪 Consent Management (REMOVE - No longer needed)

#### Cookie Consent
- **Name:** `cookieConsent`
- **Storage:** localStorage (not cookies)
- **Set by:** `components/consent-banner.tsx:54,105`
- **Purpose:** Store user's cookie consent preferences
- **Keep/Remove:** **REMOVE** - Not needed if removing analytics

## Detailed File Analysis

### Files Setting Cookies

| File | Line | Cookie/Storage | Purpose | Action |
|------|------|----------------|---------|--------|
| `middleware.ts` | 44-49 | Supabase auth cookies | Authentication | KEEP |
| `middleware.ts` | 181-186 | `user-country` | Geolocation | OPTIONAL |
| `middleware.ts` | 204-209 | `user-country` (fallback) | Geolocation | OPTIONAL |
| `server/auth.ts` | 33-35 | Supabase auth cookies | Authentication | KEEP |
| `components/consent-banner.tsx` | 105 | `cookieConsent` (localStorage) | Consent tracking | REMOVE |
| `app/layout.tsx` | 160-168 | PostHog cookies | Analytics | REMOVE |

### Third-Party Dependencies Analysis

#### Package.json Analysis
- ✅ `@supabase/ssr` & `@supabase/supabase-js` - Auth cookies (KEEP)
- ✅ `next-international` - I18n cookies (OPTIONAL) 
- ❌ `@vercel/analytics` - Analytics cookies (REMOVE)
- ❌ PostHog script - Analytics cookies (REMOVE)

## Recommendations for Personal Use

### 🎯 Immediate Actions (High Priority)

1. **Remove Analytics Infrastructure**
   - Delete PostHog script from `app/layout.tsx:160-168`
   - Remove `@vercel/analytics` from `app/layout.tsx:5,233`
   - Remove `@vercel/speed-insights` from `app/layout.tsx:6,232`

2. **Remove Consent Banner System**
   - Delete `components/consent-banner.tsx` entirely
   - Remove `<ConsentBanner />` from `app/[locale]/layout.tsx:11`
   - Remove consent translations from locale files

3. **Clean up Dependencies**
   - Remove `@vercel/analytics` and `@vercel/speed-insights` from `package.json`
   - PostHog is loaded via script (no package dependency)

### 🔧 Optional Optimizations

1. **Simplify Geolocation**
   - Remove `user-country` cookie if location features aren't needed
   - Remove geolocation logic from `middleware.ts:176-213`

2. **Internationalization Review**
   - If only English is needed, remove `next-international` setup
   - Remove i18n middleware and locale handling

### ✅ Keep Essential Cookies

1. **Supabase Authentication**
   - Keep all `sb-*` cookies for user sessions
   - Maintain current security flags
   - Continue using httpOnly, secure, and sameSite settings

## Compliance Impact

### Before Transformation
- Cookie banner required for analytics tracking
- GDPR compliance needed for EU users
- Complex consent management system

### After Transformation (Personal Use)
- No analytics = no tracking cookies
- No consent banner needed
- Only essential auth cookies remain
- Simplified privacy footprint

## Implementation Checklist

- [ ] Remove PostHog analytics script
- [ ] Remove Vercel Analytics components  
- [ ] Delete consent banner component
- [ ] Update package.json dependencies
- [ ] Remove consent translations
- [ ] Test authentication flow (ensure auth cookies still work)
- [ ] Verify no broken references to consent system
- [ ] Update any privacy policy references

---

*Generated: $(date)*
*Status: Analysis Complete - Ready for Implementation*
