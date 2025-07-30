# Visionary2 - Pose Matching Game

A static web game that uses Roboflow's YOLOv8m pose detection to challenge players to match target human poses using their webcam.

## Game Concept

- Players see a target position (person picture) with highlighted keypoints
- Using their webcam, they have 30 seconds to match the exact same position
- The game uses YOLOv8m-pose-640 model to detect player's pose keypoints
- Real-time comparison between player's pose and target pose keypoints
- Players score based on how accurately they match the target position within the time limit

## Tech Stack

- Static HTML/CSS/JavaScript frontend
- Firebase Cloud Functions for secure API proxy
- Firebase Hosting for deployment
- Roboflow Inference API for pose detection
- WebRTC for camera access
- Canvas API for rendering

## API Integration

The game securely integrates with Roboflow's workflow API through Firebase Cloud Functions:

```javascript
// Frontend calls secure Firebase Function endpoint
const result = await fetch('/api/detectPose', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        imageBase64: base64Image,
        thickness: 10
    })
});

// Firebase Function securely forwards to Roboflow API
// API key is stored server-side and never exposed to users
```

## Project Structure

```
visionary2/
├── public/             # Frontend static files
│   ├── index.html      # Main game interface
│   ├── styles/
│   │   └── main.css    # Game styling
│   ├── scripts/
│   │   ├── game.js     # Core game logic with 7s timer
│   │   ├── camera.js   # Camera handling
│   │   ├── roboflow.js # Secure API client (calls Firebase Functions)
│   │   └── poses.js    # Target pose definitions and keypoints
│   └── assets/
│       └── targets/    # Target pose images and reference keypoints
├── functions/          # Firebase Cloud Functions
│   ├── index.js        # Secure Roboflow API proxy
│   ├── package.json    # Function dependencies
│   └── .env           # Environment variables (API key)
├── firebase.json       # Firebase configuration
├── package.json        # Development dependencies and scripts
└── CLAUDE.md          # Development instructions
```

## Setup

### Prerequisites
- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created (free Spark plan works for development)

### Development Setup
1. Clone the repository
2. Install root dependencies: `npm install`
3. Install function dependencies: `cd functions && npm install`
4. Set up Firebase project: `firebase login` and `firebase use <your-project-id>`
5. Start development with Firebase emulators: `npm run dev:firebase`
6. Open `http://localhost:5000`

## Deployment

### Firebase Hosting + Functions (Recommended)

**Prerequisites:**
- Upgrade Firebase project to **Blaze (pay-as-you-go) plan** (required for Cloud Functions)

**Deploy to Production:**
```bash
# Deploy both functions and hosting
npm run deploy

# Or deploy separately:
firebase deploy --only functions  # Deploy API proxy
firebase deploy --only hosting    # Deploy frontend
```

**Environment Variables:**
When deploying functions for the first time, Firebase will prompt for the `ROBOFLOW_API_KEY` value.

### Alternative: Static Hosting Only
For development/testing without Cloud Functions, you can deploy just the frontend to any static host (Vercel, Netlify, etc.), but you'll need to:
1. Revert to direct Roboflow API calls in `roboflow.js`
2. Accept that the API key will be visible to users

## Development Commands

- `npm run dev` - Start simple Python HTTP server (port 3001) - **Legacy mode**
- `npm run dev:firebase` - Start Firebase emulators with functions (port 5000) - **Recommended**
- `npm run preview` - Preview production build locally (port 8080)
- `npm test` - Run Jest tests
- `npm test:watch` - Run Jest tests in watch mode
- `npm run deploy` - Deploy to Firebase (hosting + functions)

### Firebase Emulator Commands
- `firebase emulators:start` - Start all emulators
- `firebase emulators:start --only hosting,functions` - Start specific emulators
- Emulator UI available at: `http://localhost:4000`

## Security & API Keys

✅ **Secure Implementation**: The Roboflow API key is now completely hidden from frontend users.

- **Development**: API key stored in `/functions/.env` (not committed to git)
- **Production**: API key stored as Firebase Function parameter
- **Frontend**: Makes secure calls to `/api/detectPose` endpoint
- **Backend**: Firebase Function proxies requests to Roboflow API

**No API key exposure** - Users cannot see the key in browser developer tools or source code.

## Game Flow

1. **Target Selection**: Player selects or is assigned a target pose
2. **Preparation**: 3-second countdown before timer starts  
3. **Matching Phase**: 7 seconds to match the target pose as closely as possible
4. **Scoring**: Real-time accuracy feedback with final score based on best match + time bonus
5. **Results**: Performance summary and option to try again or new pose

## Scoring System

- **Real-time Accuracy**: 0-100% based on keypoint position matching
- **Time Bonus**: Higher scores for achieving good matches quickly
- **Precision Bonus**: Extra points for maintaining position stability
- **Final Score**: Combination of best accuracy, time, and consistency

## Future Enhancements

- Multiple difficulty levels with different target poses
- Leaderboard system with best scores
- Multiplayer pose-off competitions
- Custom pose creation and sharing
- Progressive difficulty with pose sequences
- Performance analytics and improvement tracking