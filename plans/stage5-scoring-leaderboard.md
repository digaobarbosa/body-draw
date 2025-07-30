# Stage 5: Scoring and Leaderboard - Detailed Implementation Plan

⚠️ **IMPORTANT**: This plan must be thoroughly reviewed before execution. Verify all code changes, test individual components, and ensure Firebase rules are properly configured.

## Overview
Implement the multiplayer scoring system where players submit pose results, wait for all players to complete each stage, and display real-time leaderboards. Add final scoring calculation and persistent leaderboard tracking.

## Prerequisites
- Stage 4 (Real-time Synchronization) must be completed
- Game state management working
- Real-time Firebase listeners functional

## Files to Create/Modify

### 1. Update `public/scripts/game.js` - Add Multiplayer Mode Detection

**File**: `public/scripts/game.js`

**Add After Line 6** (after this.multiplayer = null):
```javascript
class PoseMatchingGame {
    constructor() {
        this.camera = new CameraManager();
        this.roboflow = new RoboflowAPI();
        this.poses = new TargetPoses();
        this.multiplayer = null; // Will be initialized when Firebase loads
        
        // Detect multiplayer mode from URL parameters
        this.isMultiplayerMode = this.detectMultiplayerMode();
        this.roomCode = this.getRoomFromURL();
        this.multiplayerState = {
            waitingForPlayers: false,
            currentStageResults: new Map(),
            allPlayersReady: false,
            gameStarted: false
        };
```

**Add After Line 469** (after the DOMContentLoaded event):
```javascript
    /**
     * Detect if game is in multiplayer mode
     */
    detectMultiplayerMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') === 'multiplayer' && urlParams.get('room');
    }

    /**
     * Get room code from URL
     */
    getRoomFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }

    /**
     * Initialize multiplayer if in multiplayer mode
     */
    async initializeMultiplayer() {
        if (!this.isMultiplayerMode || !this.roomCode) {
            return;
        }

        if (window.MultiplayerManager && window.firebase) {
            this.multiplayer = new MultiplayerManager();
            
            // Try to reconnect to the room
            const savedRoomData = localStorage.getItem('bodyDrawRoom');
            if (savedRoomData) {
                try {
                    const roomData = JSON.parse(savedRoomData);
                    if (roomData.roomId === this.roomCode) {
                        this.multiplayer.currentRoom = roomData.roomId;
                        this.multiplayer.playerId = roomData.playerId;
                        this.multiplayer.playerNickname = roomData.nickname;
                        
                        const result = await this.multiplayer.reconnectPlayer();
                        if (result.success) {
                            this.setupMultiplayerListeners();
                            this.updateUIForMultiplayer();
                            console.log('Reconnected to multiplayer room');
                        } else {
                            this.redirectToLobby('Failed to reconnect to room');
                        }
                    } else {
                        this.redirectToLobby('Room mismatch');
                    }
                } catch (error) {
                    this.redirectToLobby('Invalid room data');
                }
            } else {
                this.redirectToLobby('No room data found');
            }
        } else {
            // Wait for Firebase to load
            setTimeout(() => this.initializeMultiplayer(), 500);
        }
    }

    /**
     * Set up multiplayer-specific listeners
     */
    setupMultiplayerListeners() {
        if (!this.multiplayer) return;

        // Listen for room state changes and results
        this.multiplayer.setupRoomListeners(
            (players) => this.onMultiplayerPlayersUpdate(players),
            (roomData) => this.onMultiplayerRoomUpdate(roomData)
        );

        // Listen for results updates
        this.setupResultsListener();
    }

    /**
     * Set up listener for game results
     */
    setupResultsListener() {
        const resultsRef = this.multiplayer.collection(
            this.multiplayer.db, 
            'rooms', 
            this.roomCode, 
            'results'
        );

        const resultsUnsubscribe = this.multiplayer.onSnapshot(resultsRef, (snapshot) => {
            this.multiplayerState.currentStageResults.clear();
            
            snapshot.forEach((doc) => {
                const result = doc.data();
                if (result.stage === this.gameState.currentPoseIndex) {
                    this.multiplayerState.currentStageResults.set(result.playerId, result);
                }
            });
            
            this.checkAllPlayersSubmitted();
            this.updateMultiplayerScoreboard();
        });

        this.multiplayer.roomListeners.push(resultsUnsubscribe);
    }

    /**
     * Update UI for multiplayer mode
     */
    updateUIForMultiplayer() {
        // Add back to lobby button
        const header = document.querySelector('header');
        if (header && !document.getElementById('backToLobby')) {
            const backButton = document.createElement('button');
            backButton.id = 'backToLobby';
            backButton.textContent = '← Back to Lobby';
            backButton.style.cssText = `
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(255,255,255,0.2);
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
            `;
            backButton.addEventListener('click', () => {
                window.location.href = 'lobby.html';
            });
            header.appendChild(backButton);
        }

        // Add multiplayer scoreboard
        this.addMultiplayerScoreboard();
    }

    /**
     * Add multiplayer scoreboard to the game area
     */
    addMultiplayerScoreboard() {
        const gameArea = document.querySelector('.game-area');
        if (gameArea && !document.getElementById('multiplayerScoreboard')) {
            const scoreboard = document.createElement('div');
            scoreboard.id = 'multiplayerScoreboard';
            scoreboard.className = 'multiplayer-scoreboard';
            scoreboard.innerHTML = `
                <h3>Players</h3>
                <div id="playersScoreboard" class="players-scoreboard">
                    <div>Loading players...</div>
                </div>
            `;
            
            // Insert after score section
            const scoreSection = document.querySelector('.score-section');
            if (scoreSection) {
                gameArea.insertBefore(scoreboard, scoreSection.nextSibling);
            } else {
                gameArea.appendChild(scoreboard);
            }
        }
    }

    /**
     * Handle multiplayer players update
     */
    onMultiplayerPlayersUpdate(players) {
        this.updateMultiplayerScoreboard();
    }

    /**
     * Handle multiplayer room update
     */
    onMultiplayerRoomUpdate(roomData) {
        if (roomData.state === 'playing' && !this.multiplayerState.gameStarted) {
            this.multiplayerState.gameStarted = true;
            this.startGame(); // Start the actual game
        }
    }

    /**
     * Redirect to lobby with message
     */
    redirectToLobby(message) {
        alert(message);
        window.location.href = 'lobby.html';
    }
```

**Update the `captureFinalPose` method** (around line 166):
```javascript
    async captureFinalPose() {
        try {
            this.updateStatus('Capturing your pose...');
            
            // Capture the current frame
            const imageData = this.camera.captureFrame();
            if (!imageData) {
                this.updateStatus('Failed to capture pose');
                this.gameState.currentAccuracy = 0;
                this.gameState.bestAccuracy = 0;
                return;
            }
            
            // Process with Roboflow API with timeout protection
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API timeout')), 30000); // 30 second timeout
            });
            
            const apiPromise = this.roboflow.detectPose(imageData, this.THICKNESS);
            
            const result = await Promise.race([apiPromise, timeoutPromise]);
            const keypoints = this.roboflow.extractKeypoints(result);
            const visualization = this.roboflow.extractVisualizationImage(result);
            
            // Display the visualization
            if (visualization) {
                this.poses.displayVisualization(visualization);
            }
            
            if (keypoints.length > 0) {
                // Calculate final accuracy
                const accuracy = this.poses.calculatePoseSimilarity(keypoints);
                this.gameState.currentAccuracy = Math.round(accuracy);
                this.gameState.bestAccuracy = Math.round(accuracy); // Single shot, so current = best
                
                this.updateDebugInfo(`Final pose captured! Accuracy: ${this.gameState.bestAccuracy}%`);
            } else {
                this.updateDebugInfo('No pose detected in final capture');
                this.gameState.currentAccuracy = 0;
                this.gameState.bestAccuracy = 0;
            }

            // Submit result to multiplayer if in multiplayer mode
            if (this.isMultiplayerMode && this.multiplayer) {
                await this.submitMultiplayerResult();
            }
            
        } catch (error) {
            console.error('Error capturing final pose:', error);
            this.updateStatus('Failed to evaluate pose - API timeout or error');
            this.gameState.currentAccuracy = 0;
            this.gameState.bestAccuracy = 0;

            // Still submit result in multiplayer mode (with 0 score)
            if (this.isMultiplayerMode && this.multiplayer) {
                await this.submitMultiplayerResult();
            }
        }
    }

    /**
     * Submit result to multiplayer system
     */
    async submitMultiplayerResult() {
        try {
            const result = await this.multiplayer.submitResult(this.gameState.bestAccuracy);
            
            if (result.success) {
                this.updateStatus('Result submitted! Waiting for other players...');
                this.multiplayerState.waitingForPlayers = true;
            } else {
                this.updateStatus(`Failed to submit result: ${result.error}`);
            }
        } catch (error) {
            console.error('Error submitting multiplayer result:', error);
            this.updateStatus('Error submitting result');
        }
    }

    /**
     * Check if all players have submitted results
     */
    checkAllPlayersSubmitted() {
        // This will be called by the results listener
        // For now, we'll implement a simple check
        const submittedCount = this.multiplayerState.currentStageResults.size;
        
        // Get current player count from localStorage or assume minimum 2
        const savedRoomData = localStorage.getItem('bodyDrawRoom');
        let expectedPlayerCount = 2; // Default minimum
        
        if (savedRoomData) {
            try {
                const roomData = JSON.parse(savedRoomData);
                // We'll need to track this better in future stages
                expectedPlayerCount = roomData.playerCount || 2;
            } catch (error) {
                // Use default
            }
        }

        if (submittedCount >= expectedPlayerCount && this.multiplayerState.waitingForPlayers) {
            this.multiplayerState.waitingForPlayers = false;
            this.multiplayerState.allPlayersReady = true;
            
            // Show results and continue game
            this.showStageResults();
        }
    }

    /**
     * Show stage results for multiplayer
     */
    showStageResults() {
        const results = Array.from(this.multiplayerState.currentStageResults.values())
            .sort((a, b) => b.accuracy - a.accuracy);

        let message = `Stage ${this.gameState.currentPoseIndex + 1} Results:\n\n`;
        results.forEach((result, index) => {
            const position = index + 1;
            const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '  ';
            message += `${emoji} ${result.nickname}: ${result.accuracy}%\n`;
        });

        this.updateStatus(message);
        
        // Continue to next stage after delay
        setTimeout(() => {
            this.endGame(); // This will handle progression to next pose
        }, 3000);
    }

    /**
     * Update multiplayer scoreboard
     */
    updateMultiplayerScoreboard() {
        const scoreboard = document.getElementById('playersScoreboard');
        if (!scoreboard) return;

        const results = Array.from(this.multiplayerState.currentStageResults.values())
            .sort((a, b) => b.accuracy - a.accuracy);

        if (results.length === 0) {
            scoreboard.innerHTML = '<div>Waiting for results...</div>';
            return;
        }

        scoreboard.innerHTML = results.map((result, index) => {
            const position = index + 1;
            const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '';
            
            return `
                <div class="player-score-card">
                    <span class="position">${emoji} ${position}</span>
                    <span class="player-name">${result.nickname}</span>
                    <span class="score">${result.accuracy}%</span>
                </div>
            `;
        }).join('');
    }
```

**Update the DOMContentLoaded event** (replace the existing one):
```javascript
// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const game = new PoseMatchingGame();
    
    // Initialize camera immediately on page load
    await game.camera.initialize();
    
    // Initialize multiplayer when Firebase is ready
    setTimeout(async () => {
        if (window.MultiplayerManager && window.firebase) {
            await game.initializeMultiplayer();
            
            if (!game.isMultiplayerMode) {
                // Single player mode - initialize as before
                game.multiplayer = new MultiplayerManager();
                console.log('Single player mode initialized');
            }
        } else {
            console.warn('Firebase or MultiplayerManager not available');
        }
    }, 1000); // Give Firebase time to load
    
    // Don't load target pose until game starts
    
    console.log('Visionary2 Pose Matching Game initialized');
});
```

### 2. Update `public/scripts/multiplayer.js` - Enhanced Result Submission

**File**: `public/scripts/multiplayer.js`

**Update the `submitResult` method** (around line 137):
```javascript
    /**
     * Submit pose result for current stage
     */
    async submitResult(accuracy, stage = null) {
        if (!this.currentRoom || !this.playerId) {
            throw new Error('Not in a room');
        }

        try {
            // Get current stage from room data if not provided
            let currentStage = stage;
            if (currentStage === null) {
                const roomQuery = this.query(
                    this.collection(this.db, 'rooms'),
                    this.where('roomId', '==', this.currentRoom)
                );
                
                const roomSnapshot = await this.getDocs(roomQuery);
                if (!roomSnapshot.empty) {
                    currentStage = roomSnapshot.docs[0].data().currentStage || 0;
                } else {
                    currentStage = 0;
                }
            }

            const resultData = {
                playerId: this.playerId,
                nickname: this.playerNickname,
                stage: currentStage,
                accuracy: Math.round(accuracy),
                submittedAt: new Date(),
                processingTime: Date.now() // Can be calculated from pose capture time
            };

            await this.addDoc(
                this.collection(this.db, 'rooms', this.currentRoom, 'results'),
                resultData
            );

            console.log(`Result submitted: ${accuracy}% for stage ${currentStage}`);
            return { success: true };

        } catch (error) {
            console.error('Error submitting result:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all results for a specific stage
     */
    async getStageResults(stage) {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            const resultsRef = this.collection(this.db, 'rooms', this.currentRoom, 'results');
            const stageQuery = this.query(
                resultsRef,
                this.where('stage', '==', stage),
                this.orderBy('accuracy', 'desc')
            );

            const snapshot = await this.getDocs(stageQuery);
            const results = [];

            snapshot.forEach((doc) => {
                results.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return results;

        } catch (error) {
            console.error('Error getting stage results:', error);
            return [];
        }
    }

    /**
     * Get complete game results for leaderboard
     */
    async getCompleteGameResults() {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            const resultsRef = this.collection(this.db, 'rooms', this.currentRoom, 'results');
            const allResultsSnapshot = await this.getDocs(resultsRef);
            
            const playerTotals = new Map();

            allResultsSnapshot.forEach((doc) => {
                const result = doc.data();
                
                if (!playerTotals.has(result.playerId)) {
                    playerTotals.set(result.playerId, {
                        playerId: result.playerId,
                        nickname: result.nickname,
                        stageResults: [],
                        totalScore: 0,
                        averageAccuracy: 0
                    });
                }

                const player = playerTotals.get(result.playerId);
                player.stageResults[result.stage] = result.accuracy;
                player.totalScore += result.accuracy;
            });

            // Calculate averages and sort by total score
            const finalResults = Array.from(playerTotals.values())
                .map(player => {
                    player.averageAccuracy = Math.round(player.totalScore / player.stageResults.length);
                    return player;
                })
                .sort((a, b) => b.totalScore - a.totalScore);

            return finalResults;

        } catch (error) {
            console.error('Error getting complete game results:', error);
            return [];
        }
    }

    /**
     * Advance room to next stage
     */
    async advanceToNextStage() {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            const roomQuery = this.query(
                this.collection(this.db, 'rooms'),
                this.where('roomId', '==', this.currentRoom)
            );
            
            const roomSnapshot = await this.getDocs(roomQuery);
            
            if (roomSnapshot.empty) {
                throw new Error('Room not found');
            }

            const roomData = roomSnapshot.docs[0].data();
            const roomDocRef = roomSnapshot.docs[0].ref;
            
            const nextStage = (roomData.currentStage || 0) + 1;
            const maxStages = roomData.poses.length;

            if (nextStage >= maxStages) {
                // Game completed
                await this.updateDoc(roomDocRef, {
                    state: 'completed',
                    currentStage: nextStage,
                    endTime: new Date()
                });
            } else {
                // Next stage
                await this.updateDoc(roomDocRef, {
                    currentStage: nextStage
                });
            }

            console.log(`Advanced to stage: ${nextStage}`);
            return { success: true, nextStage, gameCompleted: nextStage >= maxStages };

        } catch (error) {
            console.error('Error advancing to next stage:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Submit final leaderboard entry
     */
    async submitToLeaderboard(totalScore, averageAccuracy) {
        try {
            const leaderboardData = {
                nickname: this.playerNickname,
                totalScore: Math.round(totalScore),
                averageAccuracy: Math.round(averageAccuracy),
                completedAt: new Date(),
                roomId: this.currentRoom
            };

            await this.addDoc(
                this.collection(this.db, 'leaderboard'),
                leaderboardData
            );

            console.log('Leaderboard entry submitted');
            return { success: true };

        } catch (error) {
            console.error('Error submitting to leaderboard:', error);
            return { success: false, error: error.message };
        }
    }
```

### 3. Add Multiplayer Styles to `public/styles/main.css`

**File**: `public/styles/main.css`

**Add at the end of the file**:
```css
/* Multiplayer Scoreboard Styles */
.multiplayer-scoreboard {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 15px;
    margin-top: 20px;
    color: white;
    backdrop-filter: blur(5px);
}

.multiplayer-scoreboard h3 {
    margin: 0 0 15px 0;
    text-align: center;
    color: white;
}

.players-scoreboard {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.player-score-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 10px 15px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.player-score-card .position {
    font-weight: bold;
    min-width: 30px;
}

.player-score-card .player-name {
    flex: 1;
    margin: 0 10px;
    font-weight: 500;
}

.player-score-card .score {
    font-weight: bold;
    color: #4CAF50;
}

/* Back to lobby button */
#backToLobby:hover {
    background: rgba(255, 255, 255, 0.3) !important;
}

/* Game area adjustments for multiplayer */
.game-area {
    display: grid;
    grid-template-columns: 1fr 1fr 300px;
    gap: 20px;
    margin: 30px 0;
}

@media (max-width: 1024px) {
    .game-area {
        grid-template-columns: 1fr 1fr;
    }
    
    .multiplayer-scoreboard {
        grid-column: 1 / -1;
    }
}

@media (max-width: 768px) {
    .game-area {
        grid-template-columns: 1fr;
    }
}

/* Waiting for players states */
.waiting-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(255, 193, 7, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(255, 193, 7, 0.5);
    color: #fff3cd;
    margin: 10px 0;
}

.waiting-indicator::before {
    content: "⏳ ";
    margin-right: 10px;
}

/* Results display */
.stage-results {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.5);
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    color: white;
    white-space: pre-line;
}

.final-results {
    background: rgba(156, 39, 176, 0.2);
    border: 1px solid rgba(156, 39, 176, 0.5);
    border-radius: 8px;
    padding: 20px;
    margin: 10px 0;
    color: white;
    text-align: center;
}

.final-results h3 {
    margin-top: 0;
    color: #e1bee7;
}
```

### 4. Update Firestore Rules for Leaderboard

**File**: `firestore.rules`

**Add after the existing multiplayer rules** (around line 55):
```javascript
    // Allow read/write access to global leaderboard
    match /leaderboard/{entryId} {
      allow create: if true; // Allow anyone to submit scores
      allow read: if true;   // Allow anyone to read leaderboard
      allow update: if false; // Prevent leaderboard updates (immutable)
      allow delete: if false; // Prevent leaderboard deletion
    }
```

## Testing Steps

### 1. Multiplayer Game Flow Testing
1. Create room with 2+ players in lobby
2. Start game from lobby
3. Verify all players redirect to game
4. Complete pose capture in all browsers
5. Verify results synchronize and show leaderboard

### 2. Result Submission Testing
1. Complete a pose in multiplayer mode
2. Check Firebase console for submitted results
3. Verify other players see "waiting for players" message
4. Complete pose in all browsers and verify progression

### 3. Scoring System Testing
1. Submit different accuracy scores
2. Verify ranking is correct (highest first)
3. Test with same scores (tie handling)
4. Verify total score calculation across multiple stages

### 4. Error Handling Testing
1. Test with API timeout during pose capture
2. Test with network disconnection during submission
3. Verify error messages display correctly
4. Test graceful degradation

### 5. Leaderboard Testing
1. Complete full game with multiple players
2. Verify final leaderboard submission
3. Check global leaderboard collection in Firebase
4. Test leaderboard display and sorting

## Testing Checklist

- [ ] Multiplayer game mode detects URL parameters correctly
- [ ] Players reconnect to rooms after page refresh
- [ ] Pose results submit to Firebase successfully
- [ ] Real-time scoreboard updates for all players
- [ ] Waiting states display correctly
- [ ] Stage progression works after all players submit
- [ ] Final leaderboard calculates totals correctly
- [ ] Error handling works for API failures
- [ ] Performance remains good with multiple players
- [ ] Mobile layout works with scoreboard

## Performance Considerations

1. **Result Queries**: Use indexed queries for stage-specific results
2. **Real-time Updates**: Limit listener frequency to avoid rate limits
3. **Leaderboard Size**: Consider pagination for large leaderboards
4. **Cache Management**: Use Firestore offline persistence

## Common Issues & Solutions

1. **Results Not Syncing**: Check Firestore rules and listener setup
2. **Game Not Progressing**: Verify all players submit results
3. **Incorrect Scoring**: Check accuracy calculation and submission
4. **Performance Issues**: Monitor Firestore read/write counts

## Next Steps

After successful implementation and testing:
1. Proceed to Stage 6: UI Enhancements
2. Add final polish to multiplayer experience
3. Improve mobile responsiveness
4. Add advanced features like spectator mode

## Dependencies for Next Stage

Stage 6 will require:
- Working scoring system (this stage)
- Real-time leaderboards (this stage)  
- Multiplayer game flow (this stage)
- UI polish and mobile improvements (Stage 6)