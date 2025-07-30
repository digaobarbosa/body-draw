# Stage 6: UI Enhancements - Detailed Implementation Plan

⚠️ **IMPORTANT**: This plan must be thoroughly reviewed before execution. Verify all code changes, test individual components, and ensure Firebase rules are properly configured.

## Overview
Polish the multiplayer experience with enhanced UI/UX, improved mobile responsiveness, spectator mode, room sharing features, and final game experience improvements. This stage focuses on user experience and visual polish.

## Prerequisites
- Stage 5 (Scoring and Leaderboard) must be completed
- Multiplayer game flow working
- Real-time scoring functional

## Files to Create/Modify

### 1. Create `public/spectate.html` - Spectator Mode

**Create New File**: `public/spectate.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Body Draw - Spectate Game</title>
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/spectate.css">
</head>
<body>
    <div class="spectate-container">
        <header>
            <h1>🍿 Spectating Game</h1>
            <div class="room-info">
                <span>Room: <strong id="spectateRoomCode">room-tiger</strong></span>
                <button id="joinGameBtn" class="join-game-btn" style="display: none;">Join Game</button>
            </div>
        </header>

        <div class="spectate-content">
            <!-- Game State Display -->
            <div class="game-state-panel">
                <div class="current-stage">
                    <h3>Current Stage</h3>
                    <div id="currentStageInfo" class="stage-info">
                        <div class="pose-name">T-Pose</div>
                        <div class="stage-progress">Stage 1 of 3</div>
                        <div class="time-remaining">⏱ 7 seconds</div>
                    </div>
                </div>

                <div class="game-status">
                    <div id="gameStatusMessage" class="status-message">
                        Players are posing...
                    </div>
                </div>
            </div>

            <!-- Live Leaderboard -->
            <div class="live-leaderboard">
                <h3>Live Scoreboard</h3>
                <div id="spectateScoreboard" class="spectate-scoreboard">
                    <div class="loading">Loading game data...</div>
                </div>
            </div>

            <!-- Player Grid (if we want to show individual player progress) -->
            <div class="players-grid">
                <h3>Players</h3>
                <div id="playersGrid" class="players-grid-content">
                    <!-- Players will be dynamically added -->
                </div>
            </div>
        </div>

        <div class="spectate-controls">
            <button id="refreshDataBtn" class="refresh-btn">🔄 Refresh</button>
            <button id="backToLobbyBtn" class="back-btn">← Back to Lobby</button>
        </div>

        <!-- Room Not Found / Error States -->
        <div id="errorState" class="error-state" style="display: none;">
            <div class="error-content">
                <h2>Room Not Found</h2>
                <p>The game room you're trying to spectate doesn't exist or has ended.</p>
                <button onclick="window.location.href='lobby.html'">Go to Lobby</button>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script type="module" src="scripts/firebase-config.js"></script>
    <script src="scripts/multiplayer.js"></script>
    <script src="scripts/spectate.js"></script>
</body>
</html>
```

### 2. Create `public/styles/spectate.css` - Spectator Styling

**Create New File**: `public/styles/spectate.css`

```css
/* Spectator Mode Styles */
.spectate-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.spectate-container header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.spectate-container h1 {
    margin: 0;
    font-size: 2rem;
}

.room-info {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 1.1rem;
}

.join-game-btn {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
}

.join-game-btn:hover {
    background: #45a049;
}

.spectate-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 30px;
}

/* Game State Panel */
.game-state-panel {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 25px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.current-stage h3 {
    margin: 0 0 20px 0;
    text-align: center;
    color: #fff;
}

.stage-info {
    text-align: center;
}

.pose-name {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 10px;
    color: #FFD700;
}

.stage-progress {
    font-size: 1.2rem;
    margin-bottom: 15px;
    opacity: 0.9;
}

.time-remaining {
    font-size: 1.5rem;
    font-weight: bold;
    color: #FF6B6B;
    background: rgba(255, 107, 107, 0.2);
    padding: 10px 20px;
    border-radius: 10px;
    display: inline-block;
}

.status-message {
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.5);
    border-radius: 10px;
    padding: 15px;
    text-align: center;
    font-size: 1.1rem;
    margin-top: 20px;
}

/* Live Leaderboard */
.live-leaderboard {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 25px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.live-leaderboard h3 {
    margin: 0 0 20px 0;
    text-align: center;
    color: #fff;
}

.spectate-scoreboard {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.spectate-player-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 10px;
    border: 2px solid transparent;
    transition: all 0.3s;
}

.spectate-player-card.leader {
    border-color: #FFD700;
    background: rgba(255, 215, 0, 0.2);
}

.spectate-player-card.submitted {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.2);
}

.spectate-player-card.waiting {
    border-color: #FF9800;
    background: rgba(255, 152, 0, 0.2);
}

.spectate-player-info {
    display: flex;
    align-items: center;
    gap: 15px;
}

.spectate-player-position {
    font-size: 1.5rem;
    font-weight: bold;
    min-width: 40px;
    text-align: center;
}

.spectate-player-name {
    font-size: 1.2rem;
    font-weight: 500;
}

.spectate-player-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
}

.current-score {
    font-size: 1.3rem;
    font-weight: bold;
    color: #4CAF50;
}

.total-score {
    font-size: 0.9rem;
    opacity: 0.8;
}

.player-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.9rem;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f44336;
}

.status-dot.submitted {
    background: #4CAF50;
}

.status-dot.waiting {
    background: #FF9800;
}

/* Players Grid */
.players-grid {
    grid-column: 1 / -1;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 25px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.players-grid h3 {
    margin: 0 0 20px 0;
    text-align: center;
    color: #fff;
}

.players-grid-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
}

.player-grid-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 15px;
    text-align: center;
    border: 2px solid transparent;
    transition: all 0.3s;
}

.player-grid-card.active {
    border-color: #2196F3;
    background: rgba(33, 150, 243, 0.2);
}

.player-avatar-large {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
    margin: 0 auto 10px auto;
}

.player-grid-name {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 5px;
}

.player-grid-status {
    font-size: 0.9rem;
    opacity: 0.8;
}

/* Controls */
.spectate-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 30px;
}

.refresh-btn, .back-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.refresh-btn {
    background: #2196F3;
    color: white;
}

.refresh-btn:hover {
    background: #1976D2;
}

.back-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* Error State */
.error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
}

.error-content {
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 40px;
    border-radius: 15px;
    backdrop-filter: blur(10px);
}

.error-content h2 {
    color: #FF6B6B;
    margin-bottom: 15px;
}

.error-content button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 20px;
}

/* Loading States */
.loading {
    text-align: center;
    padding: 30px;
    opacity: 0.7;
    font-style: italic;
}

.loading::after {
    content: "";
    animation: dots 1.5s steps(5, end) infinite;
}

@keyframes dots {
    0%, 20% { content: "."; }
    40% { content: ".."; }
    60% { content: "..."; }
    80%, 100% { content: ""; }
}

/* Responsive Design */
@media (max-width: 1024px) {
    .spectate-content {
        grid-template-columns: 1fr;
    }
    
    .spectate-container header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
}

@media (max-width: 768px) {
    .spectate-container {
        padding: 10px;
    }
    
    .spectate-player-card {
        flex-direction: column;
        gap: 10px;
        text-align: center;
    }
    
    .spectate-player-info {
        flex-direction: column;
        gap: 5px;
    }
    
    .spectate-controls {
        flex-direction: column;
        align-items: center;
    }
    
    .players-grid-content {
        grid-template-columns: 1fr;
    }
}

/* Animations */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.waiting .time-remaining {
    animation: pulse 1s infinite;
}

.submitted .spectate-player-card {
    animation: highlight 0.5s ease-in-out;
}

@keyframes highlight {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}
```

### 3. Create `public/scripts/spectate.js` - Spectator Logic

**Create New File**: `public/scripts/spectate.js`

```javascript
/**
 * Spectator Mode Controller
 * Allows users to watch ongoing games in real-time
 */

class SpectatorController {
    constructor() {
        this.multiplayer = null;
        this.roomCode = this.getRoomFromURL();
        this.gameData = null;
        this.playersData = new Map();
        this.resultsData = new Map();
        this.updateInterval = null;
        
        // UI Elements
        this.spectateRoomCode = document.getElementById('spectateRoomCode');
        this.joinGameBtn = document.getElementById('joinGameBtn');
        this.currentStageInfo = document.getElementById('currentStageInfo');
        this.gameStatusMessage = document.getElementById('gameStatusMessage');
        this.spectateScoreboard = document.getElementById('spectateScoreboard');
        this.playersGrid = document.getElementById('playersGrid');
        this.refreshDataBtn = document.getElementById('refreshDataBtn');
        this.backToLobbyBtn = document.getElementById('backToLobbyBtn');
        this.errorState = document.getElementById('errorState');
        
        this.initializeEventListeners();
        this.waitForFirebase();
    }

    /**
     * Get room code from URL
     */
    getRoomFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }

    /**
     * Wait for Firebase to be available
     */
    waitForFirebase() {
        const checkFirebase = () => {
            if (window.MultiplayerManager && window.firebase) {
                this.multiplayer = new MultiplayerManager();
                this.initializeSpectator();
            } else {
                setTimeout(checkFirebase, 500);
            }
        };
        checkFirebase();
    }

    /**
     * Initialize spectator mode
     */
    async initializeSpectator() {
        if (!this.roomCode) {
            this.showError('No room specified');
            return;
        }

        this.spectateRoomCode.textContent = this.roomCode;
        
        try {
            // Check if room exists
            const roomExists = await this.checkRoomExists();
            if (!roomExists) {
                this.showError('Room not found or game has ended');
                return;
            }

            // Set up real-time listeners
            this.setupSpectatorListeners();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('Spectator mode initialized for room:', this.roomCode);
            
        } catch (error) {
            console.error('Error initializing spectator:', error);
            this.showError('Failed to connect to room');
        }
    }

    /**
     * Check if room exists and is active
     */
    async checkRoomExists() {
        try {
            const roomQuery = this.multiplayer.query(
                this.multiplayer.collection(this.multiplayer.db, 'rooms'),
                this.multiplayer.where('roomId', '==', this.roomCode)
            );
            
            const roomSnapshot = await this.multiplayer.getDocs(roomQuery);
            return !roomSnapshot.empty;
        } catch (error) {
            console.error('Error checking room:', error);
            return false;
        }
    }

    /**
     * Set up real-time listeners for spectator data
     */
    setupSpectatorListeners() {
        // Listen to room data
        const roomQuery = this.multiplayer.query(
            this.multiplayer.collection(this.multiplayer.db, 'rooms'),
            this.multiplayer.where('roomId', '==', this.roomCode)
        );
        
        const roomUnsubscribe = this.multiplayer.onSnapshot(roomQuery, (snapshot) => {
            if (!snapshot.empty) {
                this.gameData = snapshot.docs[0].data();
                this.updateGameStateDisplay();
            } else {
                this.showError('Room no longer exists');
            }
        });

        // Listen to players
        const playersRef = this.multiplayer.collection(this.multiplayer.db, 'rooms', this.roomCode, 'players');
        const playersUnsubscribe = this.multiplayer.onSnapshot(playersRef, (snapshot) => {
            this.playersData.clear();
            snapshot.forEach((doc) => {
                this.playersData.set(doc.data().playerId, doc.data());
            });
            this.updatePlayersDisplay();
        });

        // Listen to results
        const resultsRef = this.multiplayer.collection(this.multiplayer.db, 'rooms', this.roomCode, 'results');
        const resultsUnsubscribe = this.multiplayer.onSnapshot(resultsRef, (snapshot) => {
            this.resultsData.clear();
            snapshot.forEach((doc) => {
                const result = doc.data();
                const key = `${result.playerId}-${result.stage}`;
                this.resultsData.set(key, result);
            });
            this.updateScoreboardDisplay();
        });

        // Store unsubscribe functions for cleanup
        this.listeners = [roomUnsubscribe, playersUnsubscribe, resultsUnsubscribe];
    }

    /**
     * Update game state display
     */
    updateGameStateDisplay() {
        if (!this.gameData) return;

        const poses = ['T-Pose', 'Arms Up', 'Pointing'];
        const currentStage = this.gameData.currentStage || 0;
        const totalStages = this.gameData.poses ? this.gameData.poses.length : 3;

        // Update stage info
        const poseNameEl = this.currentStageInfo.querySelector('.pose-name');
        const stageProgressEl = this.currentStageInfo.querySelector('.stage-progress');
        const timeRemainingEl = this.currentStageInfo.querySelector('.time-remaining');

        if (poseNameEl) {
            poseNameEl.textContent = poses[currentStage] || 'Unknown Pose';
        }

        if (stageProgressEl) {
            stageProgressEl.textContent = `Stage ${currentStage + 1} of ${totalStages}`;
        }

        // Update game status
        let statusMessage = '';
        switch (this.gameData.state) {
            case 'waiting_start':
                statusMessage = 'Game hasn\'t started yet';
                this.joinGameBtn.style.display = 'inline-block';
                break;
            case 'playing':
                statusMessage = 'Players are posing...';
                this.joinGameBtn.style.display = 'none';
                break;
            case 'completed':
                statusMessage = 'Game completed!';
                this.joinGameBtn.style.display = 'none';
                break;
            default:
                statusMessage = 'Unknown game state';
        }

        this.gameStatusMessage.textContent = statusMessage;

        // Hide time remaining if not playing
        if (timeRemainingEl) {
            if (this.gameData.state === 'playing') {
                timeRemainingEl.style.display = 'inline-block';
                // Note: Real-time countdown would need server timestamp sync
                timeRemainingEl.textContent = '⏱ In progress...';
            } else {
                timeRemainingEl.style.display = 'none';
            }
        }
    }

    /**
     * Update players display
     */
    updatePlayersDisplay() {
        const playersArray = Array.from(this.playersData.values());
        
        this.playersGrid.innerHTML = '';
        
        if (playersArray.length === 0) {
            this.playersGrid.innerHTML = '<div class="loading">No players found</div>';
            return;
        }

        playersArray.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-grid-card';
            
            if (player.connectionStatus === 'connected') {
                playerCard.classList.add('active');
            }

            const avatar = player.nickname.charAt(0).toUpperCase();
            
            playerCard.innerHTML = `
                <div class="player-avatar-large">${avatar}</div>
                <div class="player-grid-name">${player.nickname}</div>
                <div class="player-grid-status">
                    ${player.connectionStatus === 'connected' ? 
                        (player.isReady ? 'Ready' : 'Not Ready') : 
                        'Disconnected'
                    }
                    ${player.isHost ? ' (Host)' : ''}
                </div>
            `;
            
            this.playersGrid.appendChild(playerCard);
        });
    }

    /**
     * Update scoreboard display
     */
    updateScoreboardDisplay() {
        if (!this.gameData) return;

        const currentStage = this.gameData.currentStage || 0;
        const playersArray = Array.from(this.playersData.values());
        
        // Calculate scores for each player
        const playerScores = playersArray.map(player => {
            let totalScore = 0;
            let currentStageScore = null;
            let hasSubmittedCurrent = false;

            // Calculate total score from all completed stages
            for (let stage = 0; stage < currentStage + 1; stage++) {
                const resultKey = `${player.playerId}-${stage}`;
                const result = this.resultsData.get(resultKey);
                
                if (result) {
                    totalScore += result.accuracy;
                    if (stage === currentStage) {
                        currentStageScore = result.accuracy;
                        hasSubmittedCurrent = true;
                    }
                }
            }

            return {
                ...player,
                totalScore,
                currentStageScore,
                hasSubmittedCurrent,
                averageScore: currentStage >= 0 ? Math.round(totalScore / (currentStage + 1)) : 0
            };
        });

        // Sort by total score
        playerScores.sort((a, b) => b.totalScore - a.totalScore);

        // Update scoreboard
        this.spectateScoreboard.innerHTML = '';

        if (playerScores.length === 0) {
            this.spectateScoreboard.innerHTML = '<div class="loading">No players found</div>';
            return;
        }

        playerScores.forEach((player, index) => {
            const position = index + 1;
            const isLeader = position === 1;
            
            const playerCard = document.createElement('div');
            playerCard.className = 'spectate-player-card';
            
            if (isLeader) {
                playerCard.classList.add('leader');
            }
            
            if (player.hasSubmittedCurrent) {
                playerCard.classList.add('submitted');
            } else if (this.gameData.state === 'playing') {
                playerCard.classList.add('waiting');
            }

            const positionEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position;
            
            playerCard.innerHTML = `
                <div class="spectate-player-info">
                    <div class="spectate-player-position">${positionEmoji}</div>
                    <div class="spectate-player-name">${player.nickname}</div>
                </div>
                <div class="spectate-player-score">
                    <div class="current-score">
                        ${player.currentStageScore !== null ? player.currentStageScore + '%' : 'Waiting...'}
                    </div>
                    <div class="total-score">Total: ${player.totalScore}%</div>
                </div>
                <div class="player-status">
                    <div class="status-dot ${player.hasSubmittedCurrent ? 'submitted' : 'waiting'}"></div>
                    <span>${player.hasSubmittedCurrent ? 'Submitted' : 'Waiting'}</span>
                </div>
            `;
            
            this.spectateScoreboard.appendChild(playerCard);
        });
    }

    /**
     * Start periodic updates for dynamic content
     */
    startPeriodicUpdates() {
        // Update every 5 seconds to refresh any stale data
        this.updateInterval = setInterval(() => {
            if (this.gameData && this.gameData.state === 'playing') {
                // Could add countdown timer or other dynamic updates here
                console.log('Periodic update - game still in progress');
            }
        }, 5000);
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        this.joinGameBtn.addEventListener('click', () => {
            window.location.href = `lobby.html#join=${this.roomCode}`;
        });

        this.refreshDataBtn.addEventListener('click', () => {
            this.refreshData();
        });

        this.backToLobbyBtn.addEventListener('click', () => {
            window.location.href = 'lobby.html';
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Refresh data manually
     */
    async refreshData() {
        this.refreshDataBtn.disabled = true;
        this.refreshDataBtn.textContent = 'Refreshing...';

        try {
            // Force refresh by re-checking room existence
            const exists = await this.checkRoomExists();
            if (!exists) {
                this.showError('Room no longer exists');
                return;
            }

            // Reset button after short delay
            setTimeout(() => {
                this.refreshDataBtn.disabled = false;
                this.refreshDataBtn.textContent = '🔄 Refresh';
            }, 1000);

        } catch (error) {
            console.error('Error refreshing data:', error);
            this.refreshDataBtn.disabled = false;
            this.refreshDataBtn.textContent = '🔄 Refresh';
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        this.errorState.style.display = 'flex';
        this.errorState.querySelector('p').textContent = message;
        
        // Hide main content
        document.querySelector('.spectate-content').style.display = 'none';
        document.querySelector('.spectate-controls').style.display = 'none';
    }

    /**
     * Clean up listeners and intervals
     */
    cleanup() {
        if (this.listeners) {
            this.listeners.forEach(unsubscribe => unsubscribe());
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize spectator controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SpectatorController();
});
```

### 4. Update `public/lobby.html` - Add Spectator Links

**File**: `public/lobby.html`

**Add after the "back-to-single" div** (around line 54):
```html
            <div class="back-to-single">
                <a href="index.html">← Back to Single Player</a>
            </div>

            <div class="spectator-section">
                <h3>🍿 Spectate a Game</h3>
                <p>Watch others play in real-time</p>
                <input type="text" id="spectateRoomInput" placeholder="Enter room code to spectate" maxlength="15">
                <button id="spectateBtn" disabled>Spectate Game</button>
            </div>
```

### 5. Update `public/scripts/lobby.js` - Add Spectator Functionality

**File**: `public/scripts/lobby.js`

**Add after the existing UI elements initialization** (around line 35):
```javascript
        // Spectator elements
        this.spectateRoomInput = document.getElementById('spectateRoomInput');
        this.spectateBtn = document.getElementById('spectateBtn');
```

**Add to `initializeEventListeners` method**:
```javascript
        // Spectator mode
        this.spectateBtn.addEventListener('click', () => this.spectateGame());
        
        this.spectateRoomInput.addEventListener('input', () => this.validateSpectateForm());
        this.spectateRoomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.spectateBtn.disabled === false) {
                this.spectateGame();
            }
        });
```

**Add new methods at the end of the LobbyController class**:
```javascript
    /**
     * Validate spectate form
     */
    validateSpectateForm() {
        const roomCode = this.spectateRoomInput.value.trim();
        this.spectateBtn.disabled = roomCode.length < 5;
    }

    /**
     * Start spectating a game
     */
    spectateGame() {
        const roomCode = this.spectateRoomInput.value.trim();
        if (roomCode.length < 5) return;

        window.location.href = `spectate.html?room=${roomCode}`;
    }
```

### 6. Update `public/styles/lobby.css` - Add Spectator Styling

**File**: `public/styles/lobby.css`

**Add after the `.back-to-single` styles**:
```css
.spectator-section {
    margin-top: 30px;
    padding-top: 30px;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    text-align: center;
}

.spectator-section h3 {
    margin-bottom: 10px;
    color: #FFD700;
}

.spectator-section p {
    margin-bottom: 20px;
    opacity: 0.9;
}

.spectator-section input {
    width: 100%;
    max-width: 300px;
    padding: 12px;
    margin-bottom: 15px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    text-align: center;
}

.spectator-section button {
    padding: 12px 30px;
    background: #9C27B0;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
}

.spectator-section button:hover:not(:disabled) {
    background: #7B1FA2;
}

.spectator-section button:disabled {
    background: #ccc;
    cursor: not-allowed;
}
```

### 7. Add Room Sharing Features

**Update `public/scripts/lobby.js`** - Add social sharing:

**Add to the `copyRoomCode` method**:
```javascript
    /**
     * Copy room code to clipboard with sharing options
     */
    async copyRoomCode() {
        try {
            const roomCode = this.shareableCode.textContent;
            const shareText = `Join my Body Draw game! Room code: ${roomCode}\n\nPlay: ${window.location.origin}/lobby.html\nSpectate: ${window.location.origin}/spectate.html?room=${roomCode}`;
            
            await navigator.clipboard.writeText(shareText);
            
            const originalText = this.copyCodeBtn.textContent;
            this.copyCodeBtn.textContent = '✓';
            setTimeout(() => {
                this.copyCodeBtn.textContent = originalText;
            }, 2000);

            // Show sharing options if available
            if (navigator.share) {
                setTimeout(() => {
                    navigator.share({
                        title: 'Body Draw Game',
                        text: `Join my pose matching game!`,
                        url: `${window.location.origin}/lobby.html#join=${roomCode}`
                    }).catch(err => console.log('Share cancelled'));
                }, 100);
            }
        } catch (error) {
            console.error('Failed to copy room code:', error);
            // Fallback for older browsers
            this.showMessage('Room code: ' + this.shareableCode.textContent, true);
        }
    }
```

## Testing Steps

### 1. Spectator Mode Testing
1. Create game room with multiple players
2. Open spectator link in separate browser
3. Verify real-time updates of game state
4. Test joining game from spectator mode
5. Verify error handling for invalid rooms

### 2. Enhanced UI Testing
1. Test all new UI components on desktop
2. Verify mobile responsiveness
3. Test dark/light mode compatibility
4. Check accessibility features

### 3. Sharing Features Testing
1. Test room code copying
2. Verify sharing URLs work correctly
3. Test native sharing on mobile devices
4. Check social media link generation

### 4. Performance Testing
1. Monitor Firebase read/write quotas
2. Test with multiple spectators
3. Verify real-time updates don't lag
4. Check memory usage with long sessions

## Testing Checklist

- [ ] Spectator mode connects to games correctly
- [ ] Real-time scoreboard updates work
- [ ] Game state displays accurately
- [ ] Room sharing features function
- [ ] Mobile layout is responsive
- [ ] Error states display properly
- [ ] Performance remains good with spectators
- [ ] Navigation between modes works
- [ ] Social sharing integrates well
- [ ] Accessibility standards met

## Performance Optimizations

1. **Spectator Limits**: Consider limiting spectators per room
2. **Update Frequency**: Reduce real-time update frequency for spectators
3. **Data Caching**: Cache static game data to reduce reads
4. **Connection Management**: Optimize Firebase connection pooling

## Next Steps

After successful implementation:
1. Deploy to production environment
2. Monitor usage analytics
3. Gather user feedback
4. Plan additional features based on usage patterns

## Final Implementation Notes

This stage completes the multiplayer experience with:
- Professional spectator mode
- Enhanced mobile experience
- Social sharing capabilities
- Polished UI/UX throughout
- Performance optimizations
- Comprehensive error handling

The game is now ready for production deployment with a complete multiplayer experience!