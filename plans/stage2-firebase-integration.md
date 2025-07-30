# Stage 2: Firebase Integration - Detailed Implementation Plan

⚠️ **IMPORTANT**: This plan must be thoroughly reviewed before execution. Verify all code changes, test individual components, and ensure Firebase rules are properly configured.

## Overview
Integrate Firebase SDK for multiplayer functionality, create the multiplayer.js module, and establish the core data structure for multiplayer rooms and player management.

## Prerequisites
- Stage 1 (Delayed Pose Capture) must be completed
- Firebase project already configured (body-draw)
- Firestore rules already allow test-collection access

## Files to Create/Modify

### 1. Create `public/scripts/multiplayer.js` - Core Multiplayer Module

**Create New File**: `public/scripts/multiplayer.js`

```javascript
/**
 * Multiplayer Firebase Integration for Body Draw
 * Handles room creation, joining, player management, and real-time synchronization
 */

class MultiplayerManager {
    constructor() {
        this.currentRoom = null;
        this.playerId = null;
        this.playerNickname = null;
        this.roomListeners = [];
        
        // Initialize Firebase references
        this.db = window.firebase.db;
        this.collection = window.firebase.collection;
        this.addDoc = window.firebase.addDoc;
        this.getDocs = window.firebase.getDocs;
        this.query = window.firebase.query;
        this.orderBy = window.firebase.orderBy;
        this.limit = window.firebase.limit;
        this.doc = window.firebase.doc;
        this.updateDoc = window.firebase.updateDoc;
        this.deleteDoc = window.firebase.deleteDoc;
        this.onSnapshot = window.firebase.onSnapshot;
        this.serverTimestamp = window.firebase.serverTimestamp;
        
        this.initializeEventListeners();
    }

    /**
     * Generate a readable room code
     * Format: room-[animal] (e.g., room-tiger, room-elephant)
     */
    generateRoomCode() {
        const animals = [
            'tiger', 'elephant', 'dolphin', 'penguin', 'koala', 'panda',
            'giraffe', 'zebra', 'lion', 'cheetah', 'hippo', 'rhino',
            'kangaroo', 'flamingo', 'octopus', 'whale', 'shark', 'eagle',
            'owl', 'fox', 'wolf', 'bear', 'rabbit', 'deer'
        ];
        
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        return `room-${randomAnimal}`;
    }

    /**
     * Generate unique player ID
     */
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create a new multiplayer room
     */
    async createRoom(hostNickname) {
        try {
            const roomCode = this.generateRoomCode();
            const playerId = this.generatePlayerId();
            
            // Create room document
            const roomData = {
                roomId: roomCode,
                created: new Date(),
                state: 'waiting_start',
                currentStage: 0,
                poses: ['tpose', 'celebration', 'pointing'],
                maxPlayers: 4,
                hostPlayerId: playerId,
                startTime: null,
                endTime: null
            };

            // Add room to Firestore
            await this.addDoc(this.collection(this.db, 'rooms'), roomData);
            
            // Add host player
            const playerData = {
                playerId: playerId,
                nickname: hostNickname,
                joinedAt: new Date(),
                isReady: false,
                isHost: true,
                connectionStatus: 'connected',
                lastActivity: new Date()
            };

            await this.addDoc(
                this.collection(this.db, 'rooms', roomCode, 'players'),
                playerData
            );

            // Set local state
            this.currentRoom = roomCode;
            this.playerId = playerId;
            this.playerNickname = hostNickname;

            console.log(`Room created: ${roomCode}, Host: ${playerId}`);
            return { success: true, roomCode, playerId };

        } catch (error) {
            console.error('Error creating room:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Join an existing room
     */
    async joinRoom(roomCode, nickname) {
        try {
            // Check if room exists
            const roomQuery = this.query(
                this.collection(this.db, 'rooms'),
                this.where('roomId', '==', roomCode)
            );
            
            const roomSnapshot = await this.getDocs(roomQuery);
            
            if (roomSnapshot.empty) {
                return { success: false, error: 'Room not found' };
            }

            const roomData = roomSnapshot.docs[0].data();
            
            // Check if room is full
            const playersSnapshot = await this.getDocs(
                this.collection(this.db, 'rooms', roomCode, 'players')
            );
            
            if (playersSnapshot.size >= roomData.maxPlayers) {
                return { success: false, error: 'Room is full' };
            }

            // Check if game already started
            if (roomData.state !== 'waiting_start') {
                return { success: false, error: 'Game already in progress' };
            }

            // Add player to room
            const playerId = this.generatePlayerId();
            const playerData = {
                playerId: playerId,
                nickname: nickname,
                joinedAt: new Date(),
                isReady: false,
                isHost: false,
                connectionStatus: 'connected',
                lastActivity: new Date()
            };

            await this.addDoc(
                this.collection(this.db, 'rooms', roomCode, 'players'),
                playerData
            );

            // Set local state
            this.currentRoom = roomCode;
            this.playerId = playerId;
            this.playerNickname = nickname;

            console.log(`Joined room: ${roomCode}, Player: ${playerId}`);
            return { success: true, roomCode, playerId };

        } catch (error) {
            console.error('Error joining room:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Submit pose result for current stage
     */
    async submitResult(accuracy) {
        if (!this.currentRoom || !this.playerId) {
            throw new Error('Not in a room');
        }

        try {
            const resultData = {
                playerId: this.playerId,
                nickname: this.playerNickname,
                stage: 0, // Will be updated based on current game stage
                accuracy: Math.round(accuracy),
                submittedAt: new Date(),
                processingTime: Date.now() // Can be calculated from pose capture time
            };

            await this.addDoc(
                this.collection(this.db, 'rooms', this.currentRoom, 'results'),
                resultData
            );

            console.log(`Result submitted: ${accuracy}% for stage ${resultData.stage}`);
            return { success: true };

        } catch (error) {
            console.error('Error submitting result:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize event listeners for UI integration
     */
    initializeEventListeners() {
        // This will be expanded in later stages
        console.log('Multiplayer event listeners initialized');
    }

    /**
     * Clean up listeners when leaving room
     */
    cleanup() {
        this.roomListeners.forEach(unsubscribe => unsubscribe());
        this.roomListeners = [];
        
        this.currentRoom = null;
        this.playerId = null;
        this.playerNickname = null;
    }
}

// Make multiplayer manager available globally
window.MultiplayerManager = MultiplayerManager;
```

### 2. Update `public/scripts/firebase-config.js` - Add Missing Firestore Methods

**File**: `public/scripts/firebase-config.js`

**Current Code** (lines 11-28):
```javascript
// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export for use in other scripts
window.firebase = {
  app,
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
};
```

**Replace With**:
```javascript
// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export for use in other scripts
window.firebase = {
  app,
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
};
```

### 3. Update `firestore.rules` - Add Multiplayer Collections Security

**File**: `firestore.rules`

**Add After Line 32** (after test-collection rules):
```javascript
    // Allow read/write access to multiplayer rooms
    match /rooms/{roomId} {
      allow create: if roomId.matches('^room-[a-z]+$'); // Only allow room-[animal] format
      allow read: if true;   // Allow anyone to read room info
      allow update: if true; // Allow room state updates
      allow delete: if false; // Prevent room deletion
    }
    
    // Allow read/write access to players in rooms
    match /rooms/{roomId}/players/{playerId} {
      allow create: if true; // Allow anyone to join rooms
      allow read: if true;   // Allow reading player list
      allow update: if true; // Allow player state updates
      allow delete: if true; // Allow players to leave
    }
    
    // Allow read/write access to game results
    match /rooms/{roomId}/results/{resultId} {
      allow create: if true; // Allow result submission
      allow read: if true;   // Allow reading results for leaderboard
      allow update: if false; // Prevent result updates (immutable)
      allow delete: if false; // Prevent result deletion
    }
```

### 4. Update `public/index.html` - Add Multiplayer Script

**File**: `public/index.html`

**Current Code** (lines 56-61):
```html
    <script src="scripts/camera.js"></script>
    <script src="scripts/roboflow.js"></script>
    <script src="scripts/pose-comparison.js"></script>
    <script src="scripts/poses.js"></script>
    <script src="scripts/game.js"></script>
```

**Replace With**:
```html
    <script type="module" src="scripts/firebase-config.js"></script>
    <script src="scripts/camera.js"></script>
    <script src="scripts/roboflow.js"></script>
    <script src="scripts/pose-comparison.js"></script>
    <script src="scripts/poses.js"></script>
    <script src="scripts/multiplayer.js"></script>
    <script src="scripts/game.js"></script>
```

### 5. Update `public/scripts/game.js` - Initialize Multiplayer Manager

**File**: `public/scripts/game.js`

**Current Code** (lines 1-6):
```javascript
class PoseMatchingGame {
    constructor() {
        this.camera = new CameraManager();
        this.roboflow = new RoboflowAPI();
        this.poses = new TargetPoses();
```

**Replace With**:
```javascript
class PoseMatchingGame {
    constructor() {
        this.camera = new CameraManager();
        this.roboflow = new RoboflowAPI();
        this.poses = new TargetPoses();
        this.multiplayer = null; // Will be initialized when Firebase loads
```

**Add After Line 469** (after console.log in DOMContentLoaded):
```javascript
// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const game = new PoseMatchingGame();
    
    // Initialize camera immediately on page load
    await game.camera.initialize();
    
    // Initialize multiplayer when Firebase is ready
    setTimeout(() => {
        if (window.MultiplayerManager && window.firebase) {
            game.multiplayer = new MultiplayerManager();
            console.log('Multiplayer manager initialized');
        } else {
            console.warn('Firebase or MultiplayerManager not available');
        }
    }, 1000); // Give Firebase time to load
    
    // Don't load target pose until game starts
    
    console.log('Visionary2 Pose Matching Game initialized');
});
```

## Deployment Steps

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Test Firebase Integration
1. Open Firebase test page: `http://localhost:3001/firebase-test.html`
2. Verify write/read operations work
3. Check console for any Firebase errors

### 3. Test Multiplayer Module
1. Open browser console on main game page
2. Check for "Multiplayer manager initialized" message
3. Test room creation: `game.multiplayer.createRoom('TestPlayer')`
4. Verify room appears in Firebase console

## Testing Checklist

- [ ] Firebase SDK loads without errors
- [ ] MultiplayerManager class is available globally
- [ ] Room creation works (check Firebase console)
- [ ] Room joining validates correctly
- [ ] Firestore security rules deployed successfully
- [ ] No console errors on page load
- [ ] Firebase test page still works

## Common Issues & Solutions

1. **Module Loading Error**: Ensure `firebase-config.js` uses `type="module"`
2. **Undefined Firebase Methods**: Check all required methods are imported in firebase-config.js
3. **Room Creation Fails**: Verify Firestore rules allow creation with room-[animal] format
4. **Timing Issues**: MultiplayerManager initialization may need delay for Firebase to load

## Next Steps

After successful implementation and testing:
1. Proceed to Stage 3: Room Management UI
2. Add room creation/joining interface
3. Implement player list display
4. Test end-to-end room lifecycle

## Dependencies for Next Stage

Stage 3 will require:
- Working Firebase connection (this stage)
- MultiplayerManager class functional (this stage)
- UI components for room management (Stage 3)
- Real-time listeners for player updates (Stage 4)