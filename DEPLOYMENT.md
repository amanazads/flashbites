# 🚀 FlashBites Deployment Guide

## Local Development

### Prerequisites
- Node.js v16+
- MongoDB (Atlas or local)
- npm or yarn

### Quick Setup

1. **Clone/Download the project**
2. **Set up MongoDB**: Update `server/.env` with your MongoDB URI
3. **Install dependencies**: 
   ```bash
   npm run install:all
   ```
4. **Seed database**: 
   ```bash
   npm run seed
   ```
5. **Run development**: 
   ```bash
   # Option 1: Run both together (if you install concurrently)
   npm run dev
   
   # Option 2: Run separately
   # Terminal 1
   npm run server
   
   # Terminal 2
   npm run client
   ```

## Production Deployment

### Backend (Server) Deployment

#### Deploying to Heroku

1. **Create Heroku App**
   ```bash
   heroku create flashbites-api
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_atlas_url
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set NODE_ENV=production
   ```

3. **Deploy**
   ```bash
   git subtree push --prefix server heroku main
   ```

#### Deploying to Railway

1. Connect your GitHub repository
2. Select the `server` folder as root
3. Add environment variables in Railway dashboard
4. Deploy automatically

#### Deploying to Render

1. Create new Web Service
2. Connect repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

### Frontend (Client) Deployment

#### Deploying to Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd client
   vercel
   ```

3. **Set Environment Variables**
   - Add `VITE_API_URL` pointing to your backend URL

4. **Update API calls**
   In `client/src/context/AppContext.jsx`, update axios baseURL:
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || '/api';
   axios.defaults.baseURL = API_URL;
   ```

#### Deploying to Netlify

1. **Build the app**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy dist folder**
   ```bash
   npx netlify-cli deploy --prod --dir=dist
   ```

3. **Add `_redirects` file** in `client/public`:
   ```
   /* /index.html 200
   ```

### Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/flashbites
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com/api
```

### Database Setup (MongoDB Atlas)

1. Create cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist IP (0.0.0.0/0 for all IPs)
4. Get connection string
5. Replace `<password>` and database name
6. Run seeder after deployment:
   ```bash
   node seeder.js
   ```

### CORS Configuration

Update `server/server.js` for production:

```javascript
const allowedOrigins = [
  'https://your-frontend-url.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Production Checklist

Backend:
- [ ] MongoDB Atlas connection configured
- [ ] Environment variables set
- [ ] CORS properly configured
- [ ] Database seeded with data
- [ ] API endpoints tested

Frontend:
- [ ] API URL pointing to production backend
- [ ] Environment variables set
- [ ] Build tested locally
- [ ] Routes configured for SPA
- [ ] Meta tags and SEO optimized

### Performance Optimization

#### Backend
1. Enable compression:
   ```javascript
   import compression from 'compression';
   app.use(compression());
   ```

2. Add rate limiting:
   ```javascript
   import rateLimit from 'express-rate-limit';
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   app.use('/api/', limiter);
   ```

#### Frontend
1. Code splitting with React.lazy
2. Image optimization
3. Enable caching
4. Minify CSS/JS

### Monitoring

- Use MongoDB Atlas monitoring for database
- Use service provider logs (Vercel, Heroku, etc.)
- Set up error tracking (Sentry)
- Monitor API response times

### Backup Strategy

1. MongoDB Atlas automated backups
2. Export data regularly:
   ```bash
   mongoexport --uri="connection_string" --collection=restaurants --out=restaurants.json
   ```

### Security Best Practices

1. Never commit `.env` files
2. Use strong JWT secrets
3. Implement rate limiting
4. Validate all inputs
5. Use HTTPS only
6. Keep dependencies updated
7. Implement authentication (when ready)

### Troubleshooting

**Build Errors:**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all dependencies in package.json

**API Connection Issues:**
- Verify CORS configuration
- Check environment variables
- Test API endpoints with Postman
- Verify MongoDB connection

**Deployment Failures:**
- Check build logs
- Verify start commands
- Ensure all dependencies are in package.json (not devDependencies for production)

### Cost Estimation (Monthly)

**Free Tier:**
- MongoDB Atlas: Free (512MB)
- Vercel: Free (hobby plan)
- Render/Railway: Free tier available

**Paid (for scaling):**
- MongoDB Atlas: $9-57/month
- Vercel Pro: $20/month
- Backend hosting: $7-25/month

### Next Steps After Deployment

1. Set up custom domain
2. Add SSL certificate (usually automatic)
3. Configure CDN for images
4. Set up CI/CD pipeline
5. Add monitoring and analytics
6. Implement caching strategy

---

Good luck with your deployment! 🚀
