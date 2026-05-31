Setup Steps:
1. Install Turso CLI
bash# Mac
brew install tursodatabase/tap/turso

# Or with curl
curl -sSfL https://get.tur.so/install.sh | bash
2. Sign Up & Create Database
bashturso auth signup  # Free account
turso db create letterboxd-wrapped  # Create DB
3. Upload Your SQLite Database
bashturso db shell letterboxd-wrapped < your_database.db
# Or import directly:
turso db upload letterboxd-wrapped your_database.db
4. Get Connection URL
bashturso db show letterboxd-wrapped --url
# Outputs: libsql://your-db.turso.io

turso db tokens create letterboxd-wrapped
# Outputs: your-auth-token
5. Update Your Python Code (Minimal changes!)
python# OLD (local SQLite):
import sqlite3
conn = sqlite3.connect('imdb_database.db')

# NEW (Turso):
import libsql_experimental as libsql
conn = libsql.connect(
    "libsql://your-db.turso.io",
    auth_token="your-auth-token"
)
# Everything else stays the same!
```

**6. Add to Vercel Environment Variables**
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

Done! Your database is now cloud-hosted and works with Vercel.

---

## 🔒 Security Checklist

### What People CAN See (Public Repo):
✅ **Safe to expose:**
- Frontend code (React components)
- CSS/styling
- Public API endpoints structure
- Package.json dependencies
- README, documentation

### What People CANNOT See (Must be hidden):
❌ **NEVER commit these:**
- API keys (TMDb, etc.)
- Database credentials
- Auth tokens (Turso token)
- `.env` files
- Cache files
- User data

### How to Protect Secrets:

**1. Create `.gitignore` (if you haven't)**
```
# .gitignore file
.env
.env.local
*.db
*.sqlite
cache/
__pycache__/
node_modules/
.vercel/
2. Use Environment Variables
bash# .env.local (NOT committed to Git)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_secret_token
3. Add to Vercel Dashboard

Go to Vercel project settings
Environment Variables section
Add each secret there
Vercel injects them at runtime

4. Check What's Committed
bash# Before pushing to GitHub, check:
git status
git diff

# Make sure no .env or .db files are listed!
```

---

## 📁 Project Structure for Deployment

### Frontend (React - Vite)
```
/frontend
  /src
    /components
    App.jsx
  package.json
  vite.config.js
```

### Backend (Python - FastAPI)
```
/backend  (or /api)
  main.py
  requirements.txt
  /utils
```

### Vercel Configuration
```
vercel.json  (at root)
.gitignore
README.md
```

---

## 🚀 Step-by-Step Deployment

### Phase 1: Prepare Your Code

**1. Split Frontend & Backend (if not already)**
```
letterboxd-wrapped/
  ├── frontend/         # React app
  ├── api/              # FastAPI backend
  ├── vercel.json       # Config
  ├── .gitignore
  └── README.md
2. Update API Endpoints in Frontend
javascript// OLD (local development):
const API_URL = 'http://localhost:8000';

// NEW (production):
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Vercel proxies this
  : 'http://localhost:8000';
3. Create vercel.json at root:
json{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "devCommand": "cd frontend && npm run dev",
  "installCommand": "npm install",
  
  "functions": {
    "api/*.py": {
      "runtime": "python3.9"
    }
  },
  
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/frontend/$1"
    }
  ]
}
```

**4. Create `requirements.txt` in `/api` folder:**
```
fastapi
uvicorn
letterboxdpy
curl_cffi
beautifulsoup4
libsql-experimental  # For Turso
5. Verify .gitignore
bashcat .gitignore
# Should include:
# .env
# .env.local
# *.db
# cache/

Phase 2: Test Locally First
1. Test Frontend Production Build
bashcd frontend
npm run build
npm run preview  # Test production build locally
2. Test Backend with Turso
bashcd api
python main.py
# Make sure it connects to Turso, not local DB
3. Test Everything Together
Open browser:

Frontend: http://localhost:4173 (preview)
Backend: http://localhost:8000
Try a full user flow


Phase 3: Push to GitHub
1. Initialize Git (if not done)
bashgit init
git add .
git commit -m "Initial commit - ready for deployment"
2. Create GitHub Repo

Go to github.com
New Repository
Name: letterboxd-wrapped
Public or Private (your choice)
Don't initialize with README (you have one)

3. Push to GitHub
bashgit remote add origin https://github.com/yourusername/letterboxd-wrapped.git
git branch -M main
git push -u origin main
4. VERIFY: No Secrets Committed
bash# Check your GitHub repo in browser
# Make sure there's NO:
# - .env files
# - .db files
# - API keys visible anywhere
```

---

### Phase 4: Deploy to Vercel

**1. Sign Up for Vercel**
- Go to vercel.com
- Sign up with GitHub account (easiest)

**2. Import Project**
- Click "New Project"
- Select your `letterboxd-wrapped` repo
- Vercel auto-detects it's a Vite + Python project

**3. Configure Build Settings**
Vercel will show a form:
- **Framework Preset:** Vite
- **Root Directory:** `./frontend` (or `.` if frontend is at root)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

**4. Add Environment Variables**
Before deploying, click "Environment Variables":
```
TURSO_DATABASE_URL = libsql://your-db.turso.io
TURSO_AUTH_TOKEN = your-secret-token
```

**5. Deploy!**
- Click "Deploy"
- Vercel builds and deploys (takes 2-3 minutes)
- You get a URL: `letterboxd-wrapped.vercel.app`

---

### Phase 5: Test Production Deployment

**1. Visit Your Live Site**
```
https://letterboxd-wrapped.vercel.app
2. Test Full Flow

Enter a Letterboxd username
Verify data loads correctly
Check all sections render
Test shareable card download
Try on mobile

3. Check Vercel Logs

Go to Vercel dashboard → Your project → "Logs"
Look for any errors
Verify API calls are working


🐛 Common Deployment Issues & Fixes
Issue 1: "Cannot find module 'xyz'"
Cause: Missing dependency
Fix:
bash# Add to requirements.txt or package.json
# Redeploy
Issue 2: API calls returning 404
Cause: Routing not configured
Fix: Check vercel.json rewrites section
Issue 3: Database connection fails
Cause: Environment variables not set
Fix:

Vercel dashboard → Settings → Environment Variables
Make sure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are added
Redeploy after adding

Issue 4: Build fails
Cause: Usually missing files or wrong paths
Fix: Check Vercel build logs, they're very detailed
Issue 5: CORS errors
Cause: Frontend and backend on different domains
Fix: Already handled by vercel.json rewrites

💰 Costs Breakdown (Spoiler: $0!)
Free Tier Limits:
Vercel:

✅ Unlimited projects
✅ 100GB bandwidth/month
✅ Serverless functions
✅ Automatic HTTPS
✅ Global CDN
Cost: FREE

Turso:

✅ 500MB storage (enough for your DB)
✅ 1 billion rows
✅ Unlimited databases
✅ Edge network
Cost: FREE

Total Monthly Cost: $0.00 🎉
When You'll Need to Pay:

If you get >1M requests/month (upgrade Vercel: $20/mo)
If database grows >500MB (upgrade Turso: $29/mo)
For MVP launch: You're good for FREE!


📊 Performance Optimizations
Before Deploying:
1. Optimize Images
bash# Compress poster images
# Use WebP format
# Lazy load images
2. Minify Code
bash# Vite does this automatically in build
npm run build
3. Enable Caching
python# In FastAPI:
from fastapi import Response

@app.get("/api/user/{username}")
async def get_user(username: str, response: Response):
    # Cache for 24 hours
    response.headers["Cache-Control"] = "public, max-age=86400"
    # ... your code
4. Add Loading States
Make sure your frontend shows:

Skeleton loaders
Progress indicators
"Analyzing your year..." messages


🔐 Post-Deployment Security
Things to Monitor:
1. Rate Limiting (Prevent abuse)
python# Add to FastAPI:
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/user/{username}")
@limiter.limit("10/minute")  # Max 10 requests per minute
async def get_user(username: str):
    # ...
2. Input Validation
python# Sanitize username input:
import re

def validate_username(username: str):
    if not re.match(r'^[a-zA-Z0-9_-]{1,20}$', username):
        raise ValueError("Invalid username")
    return username
3. Error Handling
python# Don't expose internal errors to users:
try:
    # ... your code
except Exception as e:
    logger.error(f"Error: {e}")  # Log it
    return {"error": "Something went wrong"}  # Generic message

📋 Pre-Launch Checklist
Code:

 .gitignore includes .env, *.db, cache/
 No hardcoded secrets in code
 Environment variables used for all secrets
 Frontend uses production API URL
 All dependencies in requirements.txt / package.json

Database:

 Database uploaded to Turso
 Connection tested from local machine
 Environment variables set in Vercel

Testing:

 Production build works locally
 Full user flow tested
 Mobile responsive checked
 Error states tested

Deployment:

 Code pushed to GitHub
 No secrets in GitHub repo (double-check!)
 Vercel project created
 Environment variables added to Vercel
 First deployment successful
 Live site tested

Performance:

 Images optimized
 Caching enabled
 Loading states added
 Load time < 5s tested

Security:

 Rate limiting implemented
 Input validation added
 Error handling proper
 HTTPS enabled (automatic on Vercel)


🚀 Launch Day Plan
T-1 Day:

 Final test on staging
 Prepare social media posts
 Screenshot perfect examples
 Write launch tweet thread

T-0 (Launch):

Deploy final version
Test live site (5 different users)
Post on r/Letterboxd
Tweet launch thread
Share in film communities
Monitor Vercel logs for errors

T+1 Day:

 Respond to user feedback
 Fix any critical bugs
 Monitor performance
 Share user-generated content


🎯 Quick Start Summary
The Fastest Path to Deployment:

Set up Turso (15 mins)

bash   brew install turso
   turso auth signup
   turso db create letterboxd-wrapped
   turso db upload letterboxd-wrapped your_database.db

Update code to use Turso (30 mins)

Change SQLite connection to Turso
Test locally


Push to GitHub (5 mins)

Make sure .gitignore is correct
git push


Deploy to Vercel (10 mins)

Import from GitHub
Add environment variables
Deploy


Test & Launch (1 hour)

Test everything
Fix any issues
Go live!



Total time: ~2 hours for first deployment

---

## GitHub Releases DB (Private Repo)

If you are not using Turso, you can host the SQLite DB as a private GitHub Release asset in a separate private repo.

### Steps
1. Create a private data repo (separate from app repo).
2. Create a Release and upload `letterboxd_imdb.db` as an asset.
3. Create a fine-grained GitHub token with read access to that data repo.
4. Set these env vars in Vercel:
```
DB_SOURCE=github_release
DB_LOCAL_PATH=/tmp/letterboxd_imdb.db
GH_DB_OWNER=<private-data-repo-owner>
GH_DB_REPO=<private-data-repo-name>
GH_DB_TAG=<release-tag>
GH_DB_ASSET_NAME=letterboxd_imdb.db
GH_DB_TOKEN=<fine-grained-token>
```
5. Deploy as normal. The backend downloads the DB on cold start and reuses it while warm.
