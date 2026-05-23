# Railway Deployment Guide

## Quick Setup

### 1. Prerequisites
- GitHub account with your repository pushed (✅ Done)
- Railway account (free tier available at https://railway.app)

### 2. Connect Repository to Railway

1. Go to [railway.app](https://railway.app)
2. Sign in or create an account
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository: `angaadmallick375-git/Full-Stack-Assessment`
5. Railway will auto-detect and configure the monorepo

### 3. Configure Environment Variables

After deployment starts, go to your service settings and add these variables:

**Required:**
- `NODE_ENV` = `production`
- `JWT_SECRET` = (generate a strong random string, e.g., 32+ characters)

**Optional (if using PostgreSQL):**
- `DATABASE_URL` will be set automatically when you link PostgreSQL

### 4. Add PostgreSQL Database (Recommended)

1. In your Railway project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway automatically sets `DATABASE_URL` and `DATABASE_PRIVATE_URL`
3. Link it to your web service
4. The app will auto-migrate on startup

### 5. Deploy

Option A: **Automatic** (Recommended)
- Every push to `main` branch triggers a new deployment

Option B: **Manual**
- Go to the Railway dashboard and click "Deploy"

---

## Configuration Details

### Root `railway.toml` (Uses monorepo setup)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm install --prefix server && npm install --prefix client && VITE_API_URL=/api npm run build --prefix client"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
```

### What This Does:
1. **Build Phase:**
   - Installs server dependencies
   - Installs client dependencies
   - Builds React client with `/api` as API URL
   - Output goes to `client/dist/`

2. **Start Phase:**
   - Starts Express server
   - Server serves built client files statically
   - Health checks verify both API and client are working

3. **Environment Detection:**
   - Automatically detects Railway environment
   - Enables production mode optimizations
   - Uses `DATABASE_PRIVATE_URL` for internal connections

---

## Troubleshooting

### Deployment Fails

**Check logs:**
1. Go to Railway dashboard → Your service → Logs
2. Look for errors in the build or start phases

**Common Issues:**

| Issue | Solution |
|-------|----------|
| `DATABASE_URL is required` | Link PostgreSQL plugin to service |
| `JWT_SECRET missing` | Add `JWT_SECRET` to environment variables |
| Port binding error | Railway auto-assigns PORT; no manual config needed |
| Client build not found | Ensure `npm install --prefix client` runs in build |

### Database Issues

- **Connection refused:** Check `DATABASE_URL` is set
- **SSL errors:** Already handled in `db/connection.js`
- **Migration fails:** Check PostgreSQL plugin is linked and running

### Performance

- Railway free tier: 5GB RAM shared across services
- For production: Upgrade to paid tier
- Database backups: Enabled by default

---

## Important Notes

✅ **Already Configured:**
- Dynamic PORT binding
- Client build integration
- Health checks
- CORS setup
- JWT authentication
- SSL/TLS handling
- Database fallback (PGlite → Mock DB)

📌 **Next Steps:**
1. Go to https://railway.app
2. Deploy from GitHub
3. Add environment variables
4. (Optional) Add PostgreSQL
5. Monitor logs and test the app

---

## Testing Deployment

Once deployed, test with:
```bash
# Health check
curl https://your-app.up.railway.app/api/health

# Frontend
Open https://your-app.up.railway.app in browser
```

Replace `your-app` with your actual Railway project name.

---

## Support

- Railway Docs: https://docs.railway.app
- Node.js on Railway: https://docs.railway.app/guides/nodejs
- Database: https://docs.railway.app/databases/postgresql
