# Network Access Setup Guide

This guide explains how to make your Next.js application accessible from external networks and enable port forwarding.

## ✅ Configuration Changes Made

### 1. Next.js Configuration (`next.config.js`)
- Added CORS headers to allow external connections
- Added image remote patterns for your local network IP
- Configured rewrites for external access

### 2. Package.json Scripts
- Updated all dev scripts to bind to `0.0.0.0` instead of `localhost`
- This allows the server to accept connections from any IP address

### 3. Network Access URLs
Your application is now accessible via:
- **Local**: `http://localhost:3000`
- **Network**: `http://192.168.188.101:3000`
- **External** (with port forwarding): `http://[your-public-ip]:3000`

## 🔥 Windows Firewall Setup

### Option 1: Allow Node.js through Windows Firewall (Recommended)
1. Open **Windows Security** → **Firewall & network protection**
2. Click **Allow an app through firewall**
3. Click **Change Settings** → **Allow another app...**
4. Browse and select your Node.js executable (usually in `C:\Program Files\nodejs\node.exe`)
5. Check both **Private** and **Public** networks
6. Click **OK**

### Option 2: Create a Specific Port Rule
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule...**
3. Select **Port** → **Next**
4. Select **TCP** and **Specific local ports**: `3000`
5. Select **Allow the connection** → **Next**
6. Check **Domain**, **Private**, and **Public** → **Next**
7. Name it "Next.js Dev Server" → **Finish**

## 🌐 Port Forwarding Setup

### Router Configuration
1. Access your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Navigate to **Port Forwarding** or **Virtual Server**
3. Create a new rule:
   - **Service Name**: Next.js App
   - **External Port**: 3000 (or any port you prefer)
   - **Internal IP**: 192.168.188.101
   - **Internal Port**: 3000
   - **Protocol**: TCP

### Dynamic DNS (Optional)
If your ISP changes your public IP frequently:
1. Sign up for a free DDNS service (No-IP, DuckDNS, etc.)
2. Configure DDNS in your router settings
3. Use your DDNS hostname instead of IP address

## 🚀 Testing Network Access

### Local Network Test
```bash
# From another device on your network
curl http://192.168.188.101:3000
# or open in browser: http://192.168.188.101:3000
```

### External Access Test
```bash
# From outside your network (after port forwarding)
curl http://[your-public-ip]:3000
# Find your public IP: curl ifconfig.me
```

## 🔧 Development Commands

Start the server with network access:
```bash
npm run dev          # Turbo mode with network access
npm run dev:turbo    # Same as above
npm run dev:webpack  # Webpack mode with network access
```

## 📱 Mobile Device Testing

Once configured, you can test your app on mobile devices:
- **Same WiFi network**: `http://192.168.188.101:3000`
- **External network**: `http://[your-public-ip]:3000` (with port forwarding)

## 🛡️ Security Considerations

### Development Environment
- Only enable external access during development/testing
- Consider using environment variables to control network binding
- Monitor your firewall logs for unusual activity

### Production Environment
- Use proper reverse proxy (nginx, Apache)
- Enable HTTPS with SSL certificates
- Implement rate limiting and DDoS protection
- Use environment-specific configurations

## 🔍 Troubleshooting

### Common Issues

1. **"This site can't be reached"**
   - Check Windows Firewall settings
   - Verify the dev server is running with `-H 0.0.0.0`
   - Confirm your local IP address: `ipconfig`

2. **CORS Errors**
   - Ensure CORS headers are configured in `next.config.js`
   - Check browser developer tools for specific errors

3. **Port Already in Use**
   ```bash
   # Find what's using port 3000
   netstat -ano | findstr :3000
   # Kill the process if needed
   taskkill /PID [process-id] /F
   ```

4. **Router Port Forwarding Not Working**
   - Check if your ISP blocks incoming connections
   - Verify router UPnP settings
   - Try different external ports

### Network Diagnostics
```bash
# Check if port is open locally
netstat -an | findstr :3000

# Test from another device on network
telnet 192.168.188.101 3000

# Check your public IP
curl ifconfig.me
```

## ⚡ Performance Tips

- Use `npm run dev:fast` for better performance with increased memory
- Enable Windows performance mode when testing
- Close unnecessary applications to free up resources
- Monitor network usage during testing

## 📝 Environment Variables

Create a `.env.local` file if you need different URLs for different environments:
```env
NEXT_PUBLIC_SITE_URL=http://192.168.188.101:3000
NEXTAUTH_URL=http://192.168.188.101:3000
```

---

**Note**: This configuration is optimized for development and testing. For production deployment, consider using proper hosting services like Vercel, Netlify, or traditional VPS with proper security measures.
