# Deployment Guide - Secure Pose Matching Game

## 🚀 Quick Start for Development

```bash
# 1. Install dependencies
npm install
cd functions && npm install && cd ..

# 2. Start development server
npm run dev:firebase

# 3. Open http://localhost:5000
```

## 📋 Prerequisites

### Development
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project (free Spark plan works)

### Production Deployment
- **Firebase Blaze Plan (pay-as-you-go)** - Required for Cloud Functions
- Environment variable setup

## 🔧 Development Commands

| Command | Description | Port |
|---------|-------------|------|
| `npm run dev:firebase` | **Recommended** - Full stack with secure API | 5000 |
| `npm run dev` | Legacy - Frontend only (no API security) | 3001 |
| `npm test` | Run Jest tests | - |
| `npm run deploy` | Deploy everything to Firebase | - |

## 🛡️ Security Implementation

### ✅ What's Protected
- **Roboflow API key** completely hidden from frontend users
- **Secure server-side proxy** via Firebase Cloud Functions  
- **Same-domain requests** - no CORS issues
- **Environment variable storage** for sensitive data

### 🔍 How It Works
1. Frontend calls `/api/detectPose` (same domain)
2. Firebase Hosting routes to Cloud Function via rewrites
3. Function securely forwards to Roboflow API with stored key
4. Results returned to frontend - users never see API key

## 🚀 Production Deployment

### Step 1: Upgrade Firebase Plan
Visit: https://console.firebase.google.com/project/YOUR_PROJECT/usage/details
- Upgrade to **Blaze (pay-as-you-go) plan**
- Required for Cloud Functions

### Step 2: Deploy
```bash
# Set up Firebase project
firebase login
firebase use YOUR_PROJECT_ID

# Deploy everything
npm run deploy

# Or deploy separately:
npm run deploy:functions  # Deploy secure API first
npm run deploy:hosting    # Deploy frontend
```

### Step 3: Configure Environment
When deploying functions for the first time:
- Firebase will prompt for `ROBOFLOW_API_KEY`
- Enter: `SLt1HjDiKA4nAQcHml4K`

## 📁 Project Structure

```
visionary2/
├── public/                 # Frontend files
│   ├── scripts/roboflow.js # Secure API client
│   └── ...
├── functions/              # Firebase Cloud Functions
│   ├── index.js           # Secure API proxy
│   ├── .env              # API key (development)
│   └── package.json      # Function dependencies
├── firebase.json          # Firebase configuration
└── package.json          # Development scripts
```

## 🧪 Testing Your Deployment

### Local Testing
```bash
npm run dev:firebase
# Visit: http://localhost:5000
# Check browser DevTools - no API key visible anywhere
```

### Production Testing
After deployment:
1. Visit your Firebase Hosted URL
2. Test pose detection functionality
3. Verify in DevTools that API calls go to `/api/detectPose`
4. Confirm no API key appears in Network tab or source code

## 🎯 Game Configuration

- **Pose matching timer**: 7 seconds
- **Preparation countdown**: 3 seconds
- **Target poses**: 4 predefined poses
- **Scoring**: Angle-based pose comparison + time bonus
- **Real-time feedback**: Live accuracy display

## 💰 Cost Considerations

### Firebase Functions (Blaze Plan)
- **Free tier**: 2M invocations/month, 400k GB-seconds/month
- **Typical game session**: ~10-20 function calls
- **Estimated cost**: Very low for most usage patterns

### Roboflow API
- Check your Roboflow plan limits
- Each pose detection = 1 API call
- Consider implementing request throttling if needed

## 🔧 Troubleshooting

### Functions Not Starting
```bash
# Check Node version
node --version  # Should be 18+

# Reinstall dependencies
cd functions && rm -rf node_modules && npm install
```

### API Key Issues
```bash
# Check environment file exists
ls -la functions/.env

# Verify content (should show ROBOFLOW_API_KEY=...)
cat functions/.env
```

### Deployment Fails
- Ensure Firebase project is on Blaze plan
- Check Firebase CLI is logged in: `firebase login`
- Verify project selection: `firebase use --list`

## 📞 Support

If you encounter issues:
1. Check Firebase emulator logs in terminal
2. Inspect browser Network tab for API errors
3. Verify Firebase project settings and billing
4. Test with simple `curl` commands to `/api/detectPose`

---

🎉 **Your API key is now completely secure while maintaining full functionality!**