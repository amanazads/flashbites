# FlashBites Backend - Render Deployment Guide

## Quick Deploy Steps

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin master
```

### 2. Deploy on Render

#### Option A: Using render.yaml (Recommended)
1. Go to **render.com** → Sign in with GitHub
2. Click **New +** → **Blueprint**
3. Connect repository: **amanazads/flashbites**
4. Render will detect `render.yaml` automatically
5. Click **Apply** - it will create the service with all settings

#### Option B: Manual Setup
1. Go to **render.com** → Click **New +** → **Web Service**
2. Connect repository: **amanazads/flashbites**
3. Configure:
   - **Name**: flashbites-backend
   - **Region**: Singapore
   - **Branch**: master
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 3. Add Environment Variables

Go to your service → **Environment** tab → Add these:

```bash
NODE_ENV=production
PORT=5000

# Database
MONGO_URI=your_mongodb_connection_string_from_atlas

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_chars
JWT_REFRESH_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Email - Mailtrap
MAILTRAP_API_TOKEN=your_mailtrap_api_token
MAILTRAP_FROM_EMAIL=hello@flashbites.shop
MAILTRAP_FROM_NAME=FlashBites

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session
SESSION_SECRET=your_session_secret_min_32_chars

# URLs
BACKEND_URL=https://flashbites-backend.onrender.com
FRONTEND_URL=https://flashbites.shop

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# SMS - Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Note**: Copy your actual values from `backend/.env` file when adding to Render.

### 4. Update Google OAuth Callback URL

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Navigate to: APIs & Services → Credentials
3. Click your OAuth Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://flashbites-backend.onrender.com/api/auth/google/callback
   ```
5. Remove the old Railway URL
6. Save changes

### 5. Update Frontend Environment Variables

In **Vercel** dashboard → flashbites project → Settings → Environment Variables:

Update:
```bash
VITE_API_URL=https://flashbites-backend.onrender.com/api
```

Redeploy frontend after updating.

### 6. Test Deployment

Visit: **https://flashbites-backend.onrender.com/api/health**

Expected response:
```json
{
  "success": true,
  "message": "FlashBites API is running",
  "environment": "production"
}
```

---

## Important Notes

### Free Tier Limitations
- ⏱️ Service spins down after 15 minutes of inactivity
- ⏳ First request after sleep takes 30-60 seconds (cold start)
- 💰 Upgrade to **Starter ($7/month)** for:
  - Always-on service (no cold starts)
  - Better performance
  - Production-ready

### Auto-Deploy Setup
1. Go to service → **Settings**
2. Under **Build & Deploy**:
   - ✅ Enable **Auto-Deploy**
   - Branch: `master`
3. Now every `git push` will trigger automatic deployment

### View Logs
- Dashboard → Your service → **Logs** tab
- Real-time logs for debugging

### Custom Domain (Optional)
If you want `api.flashbites.shop`:
1. Service → **Settings** → **Custom Domain**
2. Add: `api.flashbites.shop`
3. Add CNAME record in your DNS:
   ```
   CNAME api flashbites-backend.onrender.com
   ```

---

## Troubleshooting

### Build Fails
- Check if `package.json` has correct `start` script
- Verify root directory is set to `backend`
- Check logs for specific error

### Service Won't Start
- Verify PORT environment variable is set to `5000`
- Check MongoDB connection string is correct
- Review logs for startup errors

### Database Connection Issues
- Verify MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs)
- Check username/password in MONGO_URI are correct
- Test connection string locally first

### Socket.IO Issues
- Socket.IO works on Render free tier
- Ensure CORS origins include your frontend URL
- WebSocket connections auto-fallback to polling if needed

---

## Migration Checklist

- [ ] Code pushed to GitHub
- [ ] Service created on Render
- [ ] All environment variables added
- [ ] Google OAuth callback URL updated
- [ ] Frontend VITE_API_URL updated in Vercel
- [ ] Health check endpoint tested
- [ ] Full application tested
- [ ] Railway service stopped/deleted (to avoid charges)

---

## Cost Comparison

### Render Free Tier
- ✅ 750 hours/month free
- ✅ Automatic HTTPS
- ✅ Global CDN
- ⚠️ Spins down after inactivity

### Render Starter ($7/month)
- ✅ Always-on
- ✅ No cold starts
- ✅ 512MB RAM
- ✅ Better for production

Render is more cost-effective than Railway for small apps!

---

## Support

- Render Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

**Ready to deploy!** 🚀
