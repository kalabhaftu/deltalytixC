# Discord OAuth Setup Guide

## 🎯 **Overview**

This guide will help you set up Discord OAuth authentication for your Deltalytix application. Discord OAuth allows users to sign in using their Discord accounts.

## 📋 **Prerequisites**

1. A Discord Developer Account
2. Access to your Supabase Dashboard
3. Your application running locally or deployed

## 🔧 **Step 1: Create Discord Application**

1. **Go to Discord Developer Portal:**
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Give your application a name (e.g., "Deltalytix")

2. **Configure OAuth2 Settings:**
   - Go to "OAuth2" → "General"
   - Copy your **Client ID** and **Client Secret**
   - Add redirect URIs:
     - `http://localhost:3000/api/auth/callback` (Development)
     - `https://yourdomain.com/api/auth/callback` (Production)

3. **Set Required Scopes:**
   - Go to "OAuth2" → "Scopes"
   - Select these scopes:
     - `identify` - Get user's Discord ID and username
     - `email` - Get user's email address (if available)

## 🔧 **Step 2: Configure Supabase**

1. **Go to Supabase Dashboard:**
   - Visit your [Supabase Project Dashboard](https://supabase.com/dashboard)
   - Navigate to "Authentication" → "Providers"

2. **Enable Discord Provider:**
   - Find "Discord" in the providers list
   - Toggle it to **Enabled**
   - Enter your Discord credentials:
     - **Client ID**: Your Discord application client ID
     - **Client Secret**: Your Discord application client secret

3. **Configure Redirect URLs:**
   - Add the same redirect URLs you configured in Discord:
     - `http://localhost:3000/api/auth/callback`
     - `https://yourdomain.com/api/auth/callback`

## 🔧 **Step 3: Update Environment Variables**

Update your `.env` file with your Discord credentials:

```bash
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_actual_discord_client_id
DISCORD_CLIENT_SECRET=your_actual_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

**Replace the placeholder values with your actual Discord application credentials.**

## 🔧 **Step 4: Test Discord Authentication**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the Discord login:**
   - Go to your application's login page
   - Click "Sign in with Discord"
   - You should be redirected to Discord for authorization
   - After authorization, you should be redirected back to your app

## 🔧 **Step 5: Production Setup**

When deploying to production:

1. **Update Discord OAuth2 Settings:**
   - Add your production domain to redirect URIs
   - Example: `https://yourdomain.com/api/auth/callback`

2. **Update Supabase Settings:**
   - Add production redirect URL in Supabase Dashboard

3. **Update Environment Variables:**
   ```bash
   DISCORD_REDIRECT_URI=https://yourdomain.com/api/auth/callback
   ```

## 🔧 **Step 6: Optional - Discord Webhook Setup**

If you want to use Discord webhooks for notifications:

1. **Create a Discord Webhook:**
   - Go to your Discord server
   - Server Settings → Integrations → Webhooks
   - Create a new webhook
   - Copy the webhook URL

2. **Add to Environment Variables:**
   ```bash
   DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
   ```

## 🎯 **Features Available**

Once configured, users can:

- **Sign in with Discord:** Use Discord account for authentication
- **Link Discord Account:** Connect Discord to existing account
- **Get Discord ID:** Access user's Discord ID for support
- **Receive Notifications:** Get webhook notifications (if configured)

## 🔍 **Troubleshooting**

### Common Issues:

1. **"Invalid redirect URI" error:**
   - Ensure redirect URIs match exactly in both Discord and Supabase
   - Check for trailing slashes and protocol (http vs https)

2. **"Client ID not found" error:**
   - Verify your Discord Client ID is correct
   - Ensure Discord application is properly configured

3. **"Client secret invalid" error:**
   - Regenerate your Discord Client Secret
   - Update both Discord and Supabase with new secret

4. **Redirect loop:**
   - Check that your callback URL is correct
   - Ensure Supabase is properly configured

### Debug Steps:

1. Check browser console for errors
2. Verify environment variables are loaded
3. Check Supabase logs for authentication errors
4. Test with a fresh Discord application

## 📚 **Additional Resources**

- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Discord Developer Portal](https://discord.com/developers/applications)

## 🎉 **Success Indicators**

You'll know Discord OAuth is working when:

- Users can sign in with Discord
- Discord accounts are linked to user profiles
- Discord IDs are available in user data
- No authentication errors in console
- Smooth redirect flow from Discord back to your app
