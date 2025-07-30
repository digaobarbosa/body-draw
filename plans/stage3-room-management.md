# Stage 3: Room Management - Detailed Implementation Plan

⚠️ **IMPORTANT**: This plan must be thoroughly reviewed before execution. Verify all code changes, test individual components, and ensure Firebase rules are properly configured.

## Overview
Create the user interface for room creation, joining, and player management. Add lobby functionality where players can see each other and ready up before starting the game.

## Prerequisites
- Stage 2 (Firebase Integration) must be completed
- MultiplayerManager class functional
- Firebase connection working

## Files to Create/Modify

### 1. Create `public/lobby.html` - Multiplayer Lobby Interface

**Create New File**: `public/lobby.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Body Draw - Multiplayer Lobby</title>
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/lobby.css">
</head>
<body>
    <div class="lobby-container">
        <header>
            <h1>Body Draw - Multiplayer</h1>
            <p>Match poses with friends!</p>
        </header>

        <!-- Room Selection Screen -->
        <div id="roomSelection" class="room-selection">
            <div class="room-options">
                <div class="option-card">
                    <h3>🎮 Create Room</h3>
                    <p>Start a new game and invite friends</p>
                    <input type="text" id="hostNickname" placeholder="Enter your nickname" maxlength="20">
                    <button id="createRoomBtn" disabled>Create Room</button>
                </div>

                <div class="option-divider">OR</div>

                <div class="option-card">
                    <h3>🔗 Join Room</h3>
                    <p>Enter a room code to join friends</p>
                    <input type="text" id="joinNickname" placeholder="Enter your nickname" maxlength="20">
                    <input type="text" id="roomCodeInput" placeholder="Enter room code (e.g., room-tiger)" maxlength="15">
                    <button id="joinRoomBtn" disabled>Join Room</button>
                </div>
            </div>

            <div class="back-to-single">
                <a href="index.html">← Back to Single Player</a>
            </div>
        </div>

        <!-- Lobby Screen -->
        <div id="lobbyScreen" class="lobby-screen" style="display: none;">
            <div class="lobby-header">
                <div class="room-info">
                    <h2 id="roomTitle">Room: room-tiger</h2>
                    <div class="room-code-share">
                        <span>Share this code: </span>
                        <strong id="shareableCode">room-tiger</strong>
                        <button id="copyCodeBtn" title="Copy room code">📋</button>
                    </div>
                </div>
                <button id="leaveRoomBtn" class="leave-btn">Leave Room</button>
            </div>

            <div class="lobby-content">
                <div class="players-section">
                    <h3>Players (<span id="playerCount">1</span>/4)</h3>
                    <div id="playersList" class="players-list">
                        <!-- Players will be dynamically added here -->
                    </div>
                </div>

                <div class="game-settings">
                    <h3>Game Settings</h3>
                    <div class="setting-item">
                        <label>Poses to play:</label>
                        <span>T-Pose, Arms Up, Pointing</span>
                    </div>
                    <div class="setting-item">
                        <label>Time per pose:</label>
                        <span>7 seconds</span>
                    </div>
                </div>

                <div class="lobby-controls">
                    <button id="readyBtn" class="ready-btn">Ready</button>
                    <button id="startGameBtn" class="start-btn" style="display: none;" disabled>Start Game</button>
                </div>
            </div>

            <div class="lobby-status">
                <div id="lobbyStatusMessage">Waiting for players to join...</div>
            </div>
        </div>

        <!-- Error/Loading Messages -->
        <div id="messageModal" class="message-modal" style="display: none;">
            <div class="message-content">
                <div id="messageText">Loading...</div>
                <button id="messageClose" style="display: none;">OK</button>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script type="module" src="scripts/firebase-config.js"></script>
    <script src="scripts/multiplayer.js"></script>
    <script src="scripts/lobby.js"></script>
</body>
</html>
```

### 2. Create `public/styles/lobby.css` - Lobby Styling

**Create New File**: `public/styles/lobby.css`

```css
/* Lobby-specific styles */
.lobby-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.room-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
}

.room-options {
    display: flex;
    gap: 40px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
}

.option-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 30px;
    text-align: center;
    min-width: 280px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.option-card h3 {
    margin-bottom: 10px;
    font-size: 1.5rem;
}

.option-card p {
    margin-bottom: 20px;
    opacity: 0.9;
}

.option-card input {
    width: 100%;
    padding: 12px;
    margin-bottom: 15px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
}

.option-card input::placeholder {
    color: #666;
}

.option-card button {
    width: 100%;
    padding: 12px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
}

.option-card button:hover:not(:disabled) {
    background: #45a049;
}

.option-card button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.option-divider {
    font-size: 1.2rem;
    font-weight: bold;
    opacity: 0.7;
    margin: 0 20px;
}

.back-to-single {
    margin-top: 40px;
}

.back-to-single a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-size: 1.1rem;
}

.back-to-single a:hover {
    color: white;
    text-decoration: underline;
}

/* Lobby Screen Styles */
.lobby-screen {
    max-width: 600px;
    margin: 0 auto;
}

.lobby-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.room-info h2 {
    margin: 0;
    font-size: 1.8rem;
}

.room-code-share {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.room-code-share strong {
    background: rgba(255, 255, 255, 0.2);
    padding: 5px 10px;
    border-radius: 5px;
    font-family: monospace;
}

#copyCodeBtn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 5px;
    border-radius: 3px;
    transition: background 0.3s;
}

#copyCodeBtn:hover {
    background: rgba(255, 255, 255, 0.2);
}

.leave-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
}

.leave-btn:hover {
    background: #d32f2f;
}

.lobby-content {
    display: grid;
    gap: 30px;
}

.players-section h3,
.game-settings h3 {
    margin-bottom: 15px;
    color: #fff;
}

.players-list {
    display: grid;
    gap: 10px;
}

.player-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 2px solid transparent;
    transition: border-color 0.3s;
}

.player-card.ready {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.2);
}

.player-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
}

.player-name {
    font-weight: bold;
}

.player-host {
    background: #FFD700;
    color: #333;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: bold;
}

.player-status {
    display: flex;
    align-items: center;
    gap: 5px;
}

.status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #f44336;
}

.status-indicator.ready {
    background: #4CAF50;
}

.game-settings {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 20px;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.lobby-controls {
    text-align: center;
    margin-top: 20px;
}

.ready-btn, .start-btn {
    padding: 15px 40px;
    border: none;
    border-radius: 10px;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.ready-btn {
    background: #2196F3;
    color: white;
}

.ready-btn:hover {
    background: #1976D2;
}

.ready-btn.ready {
    background: #4CAF50;
}

.ready-btn.ready:hover {
    background: #45a049;
}

.start-btn {
    background: #FF9800;
    color: white;
}

.start-btn:hover:not(:disabled) {
    background: #F57C00;
}

.start-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.lobby-status {
    margin-top: 30px;
    text-align: center;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}

/* Message Modal */
.message-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.message-content {
    background: white;
    color: #333;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    max-width: 400px;
    width: 90%;
}

.message-content button {
    margin-top: 20px;
    padding: 10px 30px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
}

/* Responsive Design */
@media (max-width: 768px) {
    .room-options {
        flex-direction: column;
        gap: 20px;
    }
    
    .option-divider {
        margin: 10px 0;
    }
    
    .lobby-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }
    
    .room-code-share {
        flex-wrap: wrap;
    }
}
```

### 3. Create `public/scripts/lobby.js` - Lobby Logic

**Create New File**: `public/scripts/lobby.js`

```javascript
/**
 * Lobby Interface Controller
 * Handles UI interactions for room creation, joining, and player management
 */

class LobbyController {
    constructor() {
        this.multiplayer = null;
        this.currentPlayers = new Map();
        this.isReady = false;
        this.isHost = false;
        
        // UI Elements
        this.roomSelection = document.getElementById('roomSelection');
        this.lobbyScreen = document.getElementById('lobbyScreen');
        this.messageModal = document.getElementById('messageModal');
        
        // Room Selection Elements
        this.hostNickname = document.getElementById('hostNickname');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinNickname = document.getElementById('joinNickname');
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        
        // Lobby Elements
        this.roomTitle = document.getElementById('roomTitle');
        this.shareableCode = document.getElementById('shareableCode');
        this.copyCodeBtn = document.getElementById('copyCodeBtn');
        this.leaveRoomBtn = document.getElementById('leaveRoomBtn');
        this.playersList = document.getElementById('playersList');
        this.playerCount = document.getElementById('playerCount');
        this.readyBtn = document.getElementById('readyBtn');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.lobbyStatusMessage = document.getElementById('lobbyStatusMessage');
        
        // Message Modal Elements
        this.messageText = document.getElementById('messageText');
        this.messageClose = document.getElementById('messageClose');
        
        this.initializeEventListeners();
        this.waitForMultiplayer();
    }

    /**
     * Wait for multiplayer manager to be available
     */
    waitForMultiplayer() {
        const checkMultiplayer = () => {
            if (window.MultiplayerManager && window.firebase) {
                this.multiplayer = new MultiplayerManager();
                console.log('Lobby controller initialized with multiplayer support');
                this.enableUI();
            } else {
                setTimeout(checkMultiplayer, 500);
            }
        };
        checkMultiplayer();
    }

    /**
     * Enable UI controls once multiplayer is ready
     */
    enableUI() {
        // Enable nickname validation
        this.hostNickname.addEventListener('input', () => this.validateCreateForm());
        this.joinNickname.addEventListener('input', () => this.validateJoinForm());
        this.roomCodeInput.addEventListener('input', () => this.validateJoinForm());
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Room creation
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        
        // Room joining
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        
        // Lobby controls
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.copyCodeBtn.addEventListener('click', () => this.copyRoomCode());
        this.readyBtn.addEventListener('click', () => this.toggleReady());
        this.startGameBtn.addEventListener('click', () => this.startGame());
        
        // Message modal
        this.messageClose.addEventListener('click', () => this.hideMessage());
        
        // Enter key handling
        this.hostNickname.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.createRoomBtn.disabled === false) {
                this.createRoom();
            }
        });
        
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.joinRoomBtn.disabled === false) {
                this.joinRoom();
            }
        });
    }

    /**
     * Validate create room form
     */
    validateCreateForm() {
        const nickname = this.hostNickname.value.trim();
        this.createRoomBtn.disabled = nickname.length < 2;
    }

    /**
     * Validate join room form
     */
    validateJoinForm() {
        const nickname = this.joinNickname.value.trim();
        const roomCode = this.roomCodeInput.value.trim();
        this.joinRoomBtn.disabled = nickname.length < 2 || roomCode.length < 5;
    }

    /**
     * Create a new room
     */
    async createRoom() {
        const nickname = this.hostNickname.value.trim();
        if (nickname.length < 2) return;

        this.showMessage('Creating room...', false);

        try {
            const result = await this.multiplayer.createRoom(nickname);
            
            if (result.success) {
                this.isHost = true;
                this.showLobby(result.roomCode);
                this.hideMessage();
            } else {
                this.showMessage(`Failed to create room: ${result.error}`, true);
            }
        } catch (error) {
            this.showMessage(`Error creating room: ${error.message}`, true);
        }
    }

    /**
     * Join an existing room
     */
    async joinRoom() {
        const nickname = this.joinNickname.value.trim();
        const roomCode = this.roomCodeInput.value.trim();
        
        if (nickname.length < 2 || roomCode.length < 5) return;

        this.showMessage('Joining room...', false);

        try {
            const result = await this.multiplayer.joinRoom(roomCode, nickname);
            
            if (result.success) {
                this.isHost = false;
                this.showLobby(result.roomCode);
                this.hideMessage();
            } else {
                this.showMessage(`Failed to join room: ${result.error}`, true);
            }
        } catch (error) {
            this.showMessage(`Error joining room: ${error.message}`, true);
        }
    }

    /**
     * Show lobby screen
     */
    showLobby(roomCode) {
        this.roomSelection.style.display = 'none';
        this.lobbyScreen.style.display = 'block';
        
        this.roomTitle.textContent = `Room: ${roomCode}`;
        this.shareableCode.textContent = roomCode;
        
        // Show start button only for host
        if (this.isHost) {
            this.startGameBtn.style.display = 'inline-block';
        }
        
        // TODO: Set up real-time listeners for players (Stage 4)
        this.updatePlayersList();
        this.updateLobbyStatus();
    }

    /**
     * Leave current room
     */
    leaveRoom() {
        if (confirm('Are you sure you want to leave the room?')) {
            this.multiplayer.cleanup();
            
            this.lobbyScreen.style.display = 'none';
            this.roomSelection.style.display = 'block';
            
            // Reset form values
            this.hostNickname.value = '';
            this.joinNickname.value = '';
            this.roomCodeInput.value = '';
            this.validateCreateForm();
            this.validateJoinForm();
            
            // Reset state
            this.isReady = false;
            this.isHost = false;
            this.currentPlayers.clear();
        }
    }

    /**
     * Copy room code to clipboard
     */
    async copyRoomCode() {
        try {
            await navigator.clipboard.writeText(this.shareableCode.textContent);
            
            const originalText = this.copyCodeBtn.textContent;
            this.copyCodeBtn.textContent = '✓';
            setTimeout(() => {
                this.copyCodeBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy room code:', error);
        }
    }

    /**
     * Toggle ready state
     */
    toggleReady() {
        this.isReady = !this.isReady;
        
        if (this.isReady) {
            this.readyBtn.textContent = 'Not Ready';
            this.readyBtn.classList.add('ready');
        } else {
            this.readyBtn.textContent = 'Ready';
            this.readyBtn.classList.remove('ready');
        }
        
        // TODO: Update ready state in Firebase (Stage 4)
        this.updateLobbyStatus();
    }

    /**
     * Start the game (host only)
     */
    startGame() {
        if (!this.isHost) return;
        
        // TODO: Implement game start logic (Stage 4)
        this.showMessage('Starting game...', false);
        
        // Redirect to game with room parameter
        setTimeout(() => {
            window.location.href = `index.html?room=${this.multiplayer.currentRoom}&mode=multiplayer`;
        }, 1000);
    }

    /**
     * Update players list display
     */
    updatePlayersList() {
        // TODO: This will be replaced with real-time Firebase data in Stage 4
        // For now, show placeholder data
        
        const mockPlayers = [
            {
                playerId: this.multiplayer?.playerId || 'player1',
                nickname: this.multiplayer?.playerNickname || 'You',
                isHost: this.isHost,
                isReady: this.isReady,
                connectionStatus: 'connected'
            }
        ];
        
        this.playersList.innerHTML = '';
        
        mockPlayers.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.isReady ? 'ready' : ''}`;
            
            const avatar = player.nickname.charAt(0).toUpperCase();
            
            playerCard.innerHTML = `
                <div class="player-info">
                    <div class="player-avatar">${avatar}</div>
                    <div>
                        <div class="player-name">${player.nickname}</div>
                        ${player.isHost ? '<span class="player-host">HOST</span>' : ''}
                    </div>
                </div>
                <div class="player-status">
                    <div class="status-indicator ${player.isReady ? 'ready' : ''}"></div>
                    <span>${player.isReady ? 'Ready' : 'Not Ready'}</span>
                </div>
            `;
            
            this.playersList.appendChild(playerCard);
        });
        
        this.playerCount.textContent = mockPlayers.length;
    }

    /**
     * Update lobby status message
     */
    updateLobbyStatus() {
        // TODO: Calculate based on real player data in Stage 4
        const allReady = this.isReady; // Simplified for now
        const minPlayers = 2;
        const currentCount = 1;
        
        if (currentCount < minPlayers) {
            this.lobbyStatusMessage.textContent = `Waiting for more players (${currentCount}/${minPlayers} minimum)`;
            this.startGameBtn.disabled = true;
        } else if (!allReady) {
            this.lobbyStatusMessage.textContent = 'Waiting for all players to be ready';
            this.startGameBtn.disabled = true;
        } else {
            this.lobbyStatusMessage.textContent = 'All players ready! Host can start the game.';
            this.startGameBtn.disabled = !this.isHost;
        }
    }

    /**
     * Show message modal
     */
    showMessage(text, showClose = false) {
        this.messageText.textContent = text;
        this.messageClose.style.display = showClose ? 'block' : 'none';
        this.messageModal.style.display = 'flex';
    }

    /**
     * Hide message modal
     */
    hideMessage() {
        this.messageModal.style.display = 'none';
    }
}

// Initialize lobby controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LobbyController();
});
```

### 4. Update `public/index.html` - Add Multiplayer Link

**File**: `public/index.html`

**Add After Line 14** (after header p tag):
```html
        <header>
            <h1>Body Draw</h1>
            <p>Match poses with your body!</p>
            <div class="game-modes">
                <a href="lobby.html" class="multiplayer-link">🎮 Play with Friends</a>
            </div>
        </header>
```

### 5. Update `public/styles/main.css` - Add Multiplayer Link Styling

**File**: `public/styles/main.css`

**Add at the end of the file**:
```css
/* Multiplayer link styling */
.game-modes {
    margin-top: 15px;
    text-align: center;
}

.multiplayer-link {
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    text-decoration: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: bold;
    transition: background 0.3s;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.multiplayer-link:hover {
    background: rgba(255, 255, 255, 0.3);
    text-decoration: none;
}
```

### 6. Update `public/scripts/multiplayer.js` - Add Missing Firebase Methods

**File**: `public/scripts/multiplayer.js`

**Add After Line 18** (after existing Firebase method assignments):
```javascript
        // Initialize Firebase references
        this.db = window.firebase.db;
        this.collection = window.firebase.collection;
        this.addDoc = window.firebase.addDoc;
        this.getDocs = window.firebase.getDocs;
        this.query = window.firebase.query;
        this.where = window.firebase.where;  // Add this line
        this.orderBy = window.firebase.orderBy;
        this.limit = window.firebase.limit;
        this.doc = window.firebase.doc;
        this.updateDoc = window.firebase.updateDoc;
        this.deleteDoc = window.firebase.deleteDoc;
        this.onSnapshot = window.firebase.onSnapshot;
        this.serverTimestamp = window.firebase.serverTimestamp;
```

## Testing Steps

### 1. Visual Testing
1. Open `http://localhost:3001/lobby.html`
2. Verify room selection screen displays correctly
3. Test responsive design on mobile

### 2. Form Validation Testing
1. Try creating room with empty nickname (should be disabled)
2. Try joining with empty fields (should be disabled)
3. Test enter key functionality

### 3. Room Creation Testing
1. Enter nickname and create room
2. Verify lobby screen appears
3. Check room code generation
4. Test copy room code functionality

### 4. Room Joining Testing
1. Open lobby in second browser/tab
2. Try joining with invalid room code
3. Try joining valid room code
4. Verify error handling

### 5. UI Interaction Testing
1. Test ready/not ready toggle
2. Verify host controls (start button visibility)
3. Test leave room functionality
4. Check back to single player link

## Testing Checklist

- [ ] Lobby page loads without errors
- [ ] Room creation form validation works
- [ ] Room joining form validation works
- [ ] Room code generation uses correct format
- [ ] Copy room code functionality works
- [ ] Player cards display correctly
- [ ] Ready state toggles properly
- [ ] Host controls appear for room creator
- [ ] Leave room functionality works
- [ ] Responsive design works on mobile
- [ ] Back to single player link works

## Common Issues & Solutions

1. **Firebase Not Available**: Ensure firebase-config.js loads before multiplayer scripts
2. **Room Creation Fails**: Check Firestore rules allow room-[animal] format
3. **Styling Issues**: Verify lobby.css loads after main.css
4. **Copy Clipboard Fails**: Requires HTTPS in production

## Next Steps

After successful implementation and testing:
1. Proceed to Stage 4: Real-time Synchronization
2. Add Firestore listeners for live player updates
3. Implement game state synchronization
4. Handle player disconnections

## Dependencies for Next Stage

Stage 4 will require:
- Working lobby interface (this stage)
- Player list display functional (this stage)
- Ready state management (this stage)
- Real-time Firebase listeners (Stage 4)