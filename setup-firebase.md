# 🔥 Firebase Setup Instructions

## Quick Test Setup (5 minutes)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" 
3. Project name: `pose-matching-game` (or your choice)
4. Enable/disable Google Analytics (your choice)
5. Click "Create project"

### Step 2: Enable Firestore
1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select a location (choose closest to your users)

### Step 3: Get Firebase Config
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (`</>`)
4. Register app name: `pose-game`
5. **Copy the firebaseConfig object**

### Step 4: Update Test File
1. Open `public/firebase-test.html`
2. Replace the `firebaseConfig` object with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id", 
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Step 5: Test Firebase Connection
1. Run your local server: `npm run dev`
2. Open: `http://localhost:3000/firebase-test.html`
3. Click "📝 Write Test Data"
4. Click "📖 Read Test Data"

### Expected Results:
- ✅ "Firebase initialized successfully!"
- ✅ "Test data written successfully!"
- ✅ "Successfully read X documents!"

---

## After Testing Works:

### Next Steps:
1. **Initialize Firebase in your project:**
   ```bash
   firebase login
   firebase init hosting
   firebase init firestore
   ```

2. **Deploy to Firebase Hosting:**
   ```bash
   firebase deploy
   ```

3. **Your game will be live at:**
   - `https://your-project-id.web.app`
   - `https://your-project-id.firebaseapp.com`

---

## 🚨 Troubleshooting:

**If you see errors:**
1. Check browser console for detailed error messages
2. Verify your Firebase config is correct
3. Make sure Firestore is enabled in Firebase Console
4. Ensure you're in "test mode" for Firestore rules

**Common Issues:**
- `Firebase: No Firebase App '[DEFAULT]' has been created` → Config is wrong
- `Missing or insufficient permissions` → Check Firestore rules
- `Network request failed` → Check internet connection

---

## 📋 What to send me after testing:

1. ✅ "Firebase test works!" 
2. Your project ID (e.g., `pose-matching-game-12345`)
3. Any error messages if it doesn't work

Then I'll help you integrate it with the main game!