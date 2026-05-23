# Railway Build Fix

## Issue
The Railway deployment was failing with "Deployment failed during build process" - "Build > Build image" error.

## Root Cause
The build command had PowerShell-style environment variable syntax (`VITE_API_URL=/api`) which doesn't work in the Linux build environment that Railway uses.

## Solution Implemented

1. **Created `build.sh`** - A bash script that properly handles the environment variable
2. **Updated `railway.toml`** - Now uses `bash build.sh` instead of inline npm commands
3. **Kept `package.json`** - Simple build script without environment variables

## Changes Made

### `/railway.toml`
```toml
[build]
builder = "nixpacks"
buildCommand = "bash build.sh"  # Changed from npm run build

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
```

### New `/build.sh`
```bash
#!/bin/bash
set -e
echo "📦 Installing server dependencies..."
npm install --prefix server
echo "📦 Installing client dependencies..."
npm install --prefix client
echo "🏗️ Building client..."
cd client
VITE_API_URL=/api npm run build
cd ..
echo "✅ Build complete!"
```

## What This Does

1. **Installs dependencies** for both server and client
2. **Sets `VITE_API_URL=/api`** - Ensures client API calls use relative paths in production
3. **Builds the React client** using Vite
4. **Returns to root** for npm start

## Testing

The client build was tested locally and completes successfully:
```
dist/index.html                   1.38 kB gzip: 0.62 kB
dist/assets/index-Cr8mPJaz.css   35.20 kB gzip: 7.31 kB
dist/assets/index-DPVA1r8M.js   439.26 kB gzip: 136.41 kB
✓ built in 3.90s
```

## Next Steps

1. **Push to GitHub** ✅ (already done)
2. **Railway will auto-deploy** on the main branch
3. **Monitor the build** in Railway dashboard
4. If still failing, check Railway logs for specific errors

## Troubleshooting

If the build still fails:

1. **Check Railway logs** - Go to Deployments → View logs
2. **Verify environment variables** are set:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (your secret)
3. **Check PostgreSQL** - If using database, ensure it's linked to the service
4. **Verify git push** - Use `git log --oneline | head -5` to confirm changes are on main

## Common Errors

| Error | Solution |
|-------|----------|
| `VITE_API_URL is not recognized` | Use bash script instead of inline env vars ✅ Fixed |
| `Module not found` | Ensure `npm install` runs before build |
| `Cannot find dist/index.html` | Client build must complete successfully |
| `DATABASE_URL missing` | Link PostgreSQL plugin in Railway |
