# Simple Multi-Player Pose Matching Game Plan

## Overview
Transform the game into a simple multi-player experience with minimal infrastructure, using URL-based rooms and Firebase for data storage.

## Key Changes

### 1. Delayed Pose Capture (Priority: High)
- **Remove continuous pose detection** during the 7-second timer
- **Single API call** at the end of each round
- Players pose "blind" without seeing their accuracy until time expires
- Show countdown timer but hide accuracy display during matching phase

### 2. Simple Room System (Priority: High)
- **URL-based rooms**: `game.html#room=ABC123`
- **No backend server** - players share room codes manually
- **Firebase Realtime Database** for synchronization (free tier)
- Room lifecycle: 30 minutes auto-cleanup

### 3. Multi-Player Flow
1. **Create/Join Room**: Player enters name and creates/joins room
2. **Lobby**: Wait for 2-4 players (60 second timeout)
3. **Game Rounds**: 3-5 target poses, 7 seconds each
4. **Scoring**: Single capture at timer end, immediate results
5. **Leaderboard**: Show all players' scores after each round

### 4. Data Storage (Firebase)
```javascript
// Simple Firebase structure
rooms: {
  ABC123: {
    created: timestamp,
    players: {
      player1: { name: "John", scores: [85, 92, 78] },
      player2: { name: "Jane", scores: [90, 88, 95] }
    },
    currentRound: 1,
    gameState: "lobby|playing|finished"
  }
}
```

### 5. UI Updates
- **Split screen**: Grid layout for 2-4 players
- **Player cards**: Name, current round score, total score
- **Room info**: Room code, player count, round progress
- **Mobile responsive**: Stack vertically on small screens

### 6. Implementation Steps
1. Add Firebase SDK to index.html
2. Create `multiplayer.js` for room management
3. Modify `game.js` to support delayed capture
4. Update UI with player grid layout
5. Add room creation/joining interface
6. Implement score synchronization

### 7. Deployment
- **No changes to Vercel deployment**
- Firebase config in environment variables
- Static site remains fully client-side

## Benefits
- **Simple**: No backend server needed
- **Fast**: Firebase handles real-time sync
- **Scalable**: Can handle many concurrent rooms
- **Free**: Firebase free tier is generous
- **Easy sharing**: Just share the URL with room code