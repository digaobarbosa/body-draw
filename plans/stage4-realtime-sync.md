# Stage 4: Real-time Synchronization - Detailed Implementation Plan

⚠️ **IMPORTANT**: This plan must be thoroughly reviewed before execution. Verify all code changes, test individual components, and ensure Firebase rules are properly configured.

## Overview
Implement real-time synchronization using Firestore listeners. Players will see live updates of other players joining/leaving, ready states, and game progression. Add robust disconnection handling and game state management.

## Prerequisites
- Stage 3 (Room Management) must be completed
- Lobby interface functional
- Player management UI working

## Files to Modify

### 1. Update `public/scripts/multiplayer.js` - Add Real-time Listeners

**File**: `public/scripts/multiplayer.js`

**Add After Line 164** (after cleanup method):
```javascript
    /**
     * Set up real-time listeners for room and player updates
     */
    setupRoomListeners(onPlayersUpdate, onRoomUpdate) {
        if (!this.currentRoom) {
            console.error('No current room to listen to');
            return;
        }

        try {
            // Listen to players collection
            const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
            const playersUnsubscribe = this.onSnapshot(playersRef, (snapshot) => {
                const players = [];
                snapshot.forEach((doc) => {
                    players.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                console.log('Players updated:', players);
                if (onPlayersUpdate) onPlayersUpdate(players);
            }, (error) => {
                console.error('Error listening to players:', error);
            });

            // Listen to room document
            const roomQuery = this.query(
                this.collection(this.db, 'rooms'),
                this.where('roomId', '==', this.currentRoom)
            );
            
            const roomUnsubscribe = this.onSnapshot(roomQuery, (snapshot) => {
                if (!snapshot.empty) {
                    const roomData = snapshot.docs[0].data();
                    console.log('Room updated:', roomData);
                    if (onRoomUpdate) onRoomUpdate(roomData);
                }
            }, (error) => {
                console.error('Error listening to room:', error);
            });

            // Store unsubscribe functions
            this.roomListeners.push(playersUnsubscribe);
            this.roomListeners.push(roomUnsubscribe);

            console.log('Real-time listeners set up for room:', this.currentRoom);

        } catch (error) {
            console.error('Error setting up room listeners:', error);
        }
    }

    /**
     * Update player ready state
     */
    async updatePlayerReady(isReady) {
        if (!this.currentRoom || !this.playerId) {
            throw new Error('Not in a room');
        }

        try {
            // Find player document
            const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
            const playerQuery = this.query(playersRef, this.where('playerId', '==', this.playerId));
            const playerSnapshot = await this.getDocs(playerQuery);

            if (playerSnapshot.empty) {
                throw new Error('Player not found in room');
            }

            const playerDocRef = playerSnapshot.docs[0].ref;
            
            await this.updateDoc(playerDocRef, {
                isReady: isReady,
                lastActivity: new Date()
            });

            console.log(`Player ready state updated: ${isReady}`);
            return { success: true };

        } catch (error) {
            console.error('Error updating player ready state:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update room game state
     */
    async updateRoomState(newState, additionalData = {}) {
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

            const roomDocRef = roomSnapshot.docs[0].ref;
            
            const updateData = {
                state: newState,
                ...additionalData
            };

            await this.updateDoc(roomDocRef, updateData);

            console.log(`Room state updated to: ${newState}`);
            return { success: true };

        } catch (error) {
            console.error('Error updating room state:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove player from room (when leaving)
     */
    async leaveRoom() {
        if (!this.currentRoom || !this.playerId) {
            return { success: true }; // Already not in a room
        }

        try {
            // Find and remove player document
            const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
            const playerQuery = this.query(playersRef, this.where('playerId', '==', this.playerId));
            const playerSnapshot = await this.getDocs(playerQuery);

            if (!playerSnapshot.empty) {
                await this.deleteDoc(playerSnapshot.docs[0].ref);
                console.log('Player removed from room');
            }

            // Clean up listeners
            this.cleanup();

            return { success: true };

        } catch (error) {
            console.error('Error leaving room:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Start game (host only)
     */
    async startGame() {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            const result = await this.updateRoomState('playing', {
                startTime: new Date(),
                currentStage: 0
            });

            if (result.success) {
                console.log('Game started successfully');
            }

            return result;

        } catch (error) {
            console.error('Error starting game:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle player disconnection (call on page unload)
     */
    async handleDisconnection() {
        if (!this.currentRoom || !this.playerId) {
            return;
        }

        try {
            // Update connection status instead of removing player
            const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
            const playerQuery = this.query(playersRef, this.where('playerId', '==', this.playerId));
            const playerSnapshot = await this.getDocs(playerQuery);

            if (!playerSnapshot.empty) {
                await this.updateDoc(playerSnapshot.docs[0].ref, {
                    connectionStatus: 'disconnected',
                    lastActivity: new Date()
                });
            }

        } catch (error) {
            console.error('Error handling disconnection:', error);
        }
    }

    /**
     * Reconnect player (call on page load if room data exists)
     */
    async reconnectPlayer() {
        if (!this.currentRoom || !this.playerId) {
            return { success: false, error: 'No room data to reconnect' };
        }

        try {
            // Update connection status back to connected
            const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
            const playerQuery = this.query(playersRef, this.where('playerId', '==', this.playerId));
            const playerSnapshot = await this.getDocs(playerQuery);

            if (!playerSnapshot.empty) {
                await this.updateDoc(playerSnapshot.docs[0].ref, {
                    connectionStatus: 'connected',
                    lastActivity: new Date()
                });

                console.log('Player reconnected successfully');
                return { success: true };
            } else {
                return { success: false, error: 'Player not found in room' };
            }

        } catch (error) {
            console.error('Error reconnecting player:', error);
            return { success: false, error: error.message };
        }
    }
```

### 2. Update `public/scripts/lobby.js` - Integrate Real-time Updates

**File**: `public/scripts/lobby.js`

**Replace the `showLobby` method** (around line 170):
```javascript
    /**
     * Show lobby screen and set up real-time listeners
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
        
        // Set up real-time listeners
        this.multiplayer.setupRoomListeners(
            (players) => this.onPlayersUpdate(players),
            (roomData) => this.onRoomUpdate(roomData)
        );
        
        this.updateLobbyStatus();
    }
```

**Replace the `leaveRoom` method** (around line 185):
```javascript
    /**
     * Leave current room
     */
    async leaveRoom() {
        if (confirm('Are you sure you want to leave the room?')) {
            // Leave room in Firebase
            await this.multiplayer.leaveRoom();
            
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
```

**Replace the `toggleReady` method** (around line 220):
```javascript
    /**
     * Toggle ready state
     */
    async toggleReady() {
        const newReadyState = !this.isReady;
        
        try {
            const result = await this.multiplayer.updatePlayerReady(newReadyState);
            
            if (result.success) {
                this.isReady = newReadyState;
                
                if (this.isReady) {
                    this.readyBtn.textContent = 'Not Ready';
                    this.readyBtn.classList.add('ready');
                } else {
                    this.readyBtn.textContent = 'Ready';
                    this.readyBtn.classList.remove('ready');
                }
            } else {
                this.showMessage(`Failed to update ready state: ${result.error}`, true);
            }
        } catch (error) {
            this.showMessage(`Error updating ready state: ${error.message}`, true);
        }
    }
```

**Replace the `startGame` method** (around line 240):
```javascript
    /**
     * Start the game (host only)
     */
    async startGame() {
        if (!this.isHost) return;
        
        this.showMessage('Starting game...', false);
        
        try {
            const result = await this.multiplayer.startGame();
            
            if (result.success) {
                // Game start will be handled by room state listener
                setTimeout(() => {
                    window.location.href = `index.html?room=${this.multiplayer.currentRoom}&mode=multiplayer`;
                }, 1000);
            } else {
                this.showMessage(`Failed to start game: ${result.error}`, true);
            }
        } catch (error) {
            this.showMessage(`Error starting game: ${error.message}`, true);
        }
    }
```

**Add After Line 290** (after hideMessage method):
```javascript
    /**
     * Handle real-time player updates
     */
    onPlayersUpdate(players) {
        this.currentPlayers.clear();
        
        // Update local player data
        players.forEach(player => {
            this.currentPlayers.set(player.playerId, player);
            
            // Update local state if this is current player
            if (player.playerId === this.multiplayer.playerId) {
                this.isReady = player.isReady;
                this.updateReadyButton();
            }
        });
        
        this.updatePlayersList();
        this.updateLobbyStatus();
    }

    /**
     * Handle real-time room updates
     */
    onRoomUpdate(roomData) {
        console.log('Room state updated:', roomData.state);
        
        // Handle game state changes
        if (roomData.state === 'playing') {
            // Game started - redirect to game page
            window.location.href = `index.html?room=${this.multiplayer.currentRoom}&mode=multiplayer`;
        }
        
        // Handle other room state changes as needed
        this.updateLobbyStatus();
    }

    /**
     * Update ready button based on current state
     */
    updateReadyButton() {
        if (this.isReady) {
            this.readyBtn.textContent = 'Not Ready';
            this.readyBtn.classList.add('ready');
        } else {
            this.readyBtn.textContent = 'Ready';
            this.readyBtn.classList.remove('ready');
        }
    }
```

**Replace the `updatePlayersList` method** (around line 250):
```javascript
    /**
     * Update players list display with real-time data
     */
    updatePlayersList() {
        this.playersList.innerHTML = '';
        
        if (this.currentPlayers.size === 0) {
            // Show loading state
            this.playersList.innerHTML = '<div style="text-align: center; opacity: 0.7;">Loading players...</div>';
            return;
        }
        
        // Convert Map to Array and sort (host first)
        const playersArray = Array.from(this.currentPlayers.values())
            .sort((a, b) => {
                if (a.isHost && !b.isHost) return -1;
                if (!a.isHost && b.isHost) return 1;
                return a.joinedAt - b.joinedAt;
            });
        
        playersArray.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.isReady ? 'ready' : ''}`;
            
            // Add disconnected styling
            if (player.connectionStatus === 'disconnected') {
                playerCard.style.opacity = '0.6';
            }
            
            const avatar = player.nickname.charAt(0).toUpperCase();
            
            playerCard.innerHTML = `
                <div class="player-info">
                    <div class="player-avatar">${avatar}</div>
                    <div>
                        <div class="player-name">
                            ${player.nickname}
                            ${player.connectionStatus === 'disconnected' ? ' (disconnected)' : ''}
                        </div>
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
        
        this.playerCount.textContent = this.currentPlayers.size;
    }
```

**Replace the `updateLobbyStatus` method** (around line 275):
```javascript
    /**
     * Update lobby status message based on real data
     */
    updateLobbyStatus() {
        const connectedPlayers = Array.from(this.currentPlayers.values())
            .filter(p => p.connectionStatus === 'connected');
        
        const allReady = connectedPlayers.length > 0 && 
                        connectedPlayers.every(p => p.isReady);
        
        const minPlayers = 2;
        const currentCount = connectedPlayers.length;
        
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
```

### 3. Add Disconnection Handling to Lobby

**File**: `public/scripts/lobby.js`

**Add After Line 55** (after waitForMultiplayer method):
```javascript
    /**
     * Handle page unload - mark player as disconnected
     */
    handlePageUnload() {
        // Use sendBeacon for reliable disconnection handling
        if (this.multiplayer && this.multiplayer.currentRoom) {
            navigator.sendBeacon(
                '/api/disconnect', // This would need a server endpoint
                JSON.stringify({
                    room: this.multiplayer.currentRoom,
                    player: this.multiplayer.playerId
                })
            );
            
            // Fallback - try async disconnect
            this.multiplayer.handleDisconnection();
        }
    }

    /**
     * Try to reconnect if player data exists in localStorage
     */
    tryReconnect() {
        const savedRoomData = localStorage.getItem('bodyDrawRoom');
        if (savedRoomData) {
            try {
                const roomData = JSON.parse(savedRoomData);
                if (roomData.roomId && roomData.playerId && roomData.nickname) {
                    this.multiplayer.currentRoom = roomData.roomId;
                    this.multiplayer.playerId = roomData.playerId;
                    this.multiplayer.playerNickname = roomData.nickname;
                    
                    // Try to reconnect
                    this.multiplayer.reconnectPlayer()
                        .then(result => {
                            if (result.success) {
                                this.showLobby(roomData.roomId);
                                this.showMessage('Reconnected to room!', true);
                            } else {
                                localStorage.removeItem('bodyDrawRoom');
                            }
                        });
                }
            } catch (error) {
                localStorage.removeItem('bodyDrawRoom');
            }
        }
    }

    /**
     * Save room data for reconnection
     */
    saveRoomData() {
        if (this.multiplayer && this.multiplayer.currentRoom) {
            const roomData = {
                roomId: this.multiplayer.currentRoom,
                playerId: this.multiplayer.playerId,
                nickname: this.multiplayer.playerNickname
            };
            localStorage.setItem('bodyDrawRoom', JSON.stringify(roomData));
        }
    }
```

**Update the `enableUI` method** (around line 72):
```javascript
    /**
     * Enable UI controls once multiplayer is ready
     */
    enableUI() {
        // Enable nickname validation
        this.hostNickname.addEventListener('input', () => this.validateCreateForm());
        this.joinNickname.addEventListener('input', () => this.validateJoinForm());
        
        // Set up disconnection handling
        window.addEventListener('beforeunload', () => this.handlePageUnload());
        
        // Try to reconnect if room data exists
        this.tryReconnect();
    }
```

**Update both createRoom and joinRoom success handlers to save room data**:

In `createRoom` method, after `this.showLobby(result.roomCode);`:
```javascript
                this.isHost = true;
                this.showLobby(result.roomCode);
                this.saveRoomData(); // Add this line
                this.hideMessage();
```

In `joinRoom` method, after `this.showLobby(result.roomCode);`:
```javascript
                this.isHost = false;
                this.showLobby(result.roomCode);
                this.saveRoomData(); // Add this line
                this.hideMessage();
```

### 4. Update `public/scripts/firebase-config.js` - Ensure All Methods Available

**File**: `public/scripts/firebase-config.js`

**Verify the import statement includes all needed methods** (around line 13):
```javascript
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
```

## Testing Steps

### 1. Real-time Player Updates Testing
1. Open lobby in two browser tabs/windows
2. Create room in first tab
3. Join room in second tab
4. Verify both tabs show updated player count
5. Toggle ready state in one tab
6. Verify ready state updates in other tab

### 2. Disconnection Testing
1. Join room with two players
2. Close one browser tab abruptly
3. Verify other player sees "disconnected" status
4. Reopen tab and verify reconnection

### 3. Game Start Testing
1. Have multiple players join and ready up
2. Host clicks start game
3. Verify all players redirect to game page

### 4. Lobby State Testing
1. Test with different player counts
2. Verify ready state requirements
3. Test host-only start button

### 5. Error Handling Testing
1. Disconnect internet during room operations
2. Test invalid room codes
3. Verify error messages display correctly

## Testing Checklist

- [ ] Real-time player list updates work
- [ ] Ready state synchronizes across browsers
- [ ] Player disconnection shows correctly
- [ ] Page refresh reconnects properly
- [ ] Game start redirects all players
- [ ] Host controls work correctly
- [ ] Error handling functions properly
- [ ] LocalStorage persistence works
- [ ] Firestore listeners clean up properly
- [ ] Multiple simultaneous operations work

## Performance Considerations

1. **Listener Cleanup**: Ensure all Firestore listeners are properly unsubscribed
2. **Rate Limiting**: Avoid rapid ready state changes
3. **Offline Handling**: Firebase handles offline scenarios automatically
4. **Memory Management**: Clean up player data when leaving rooms

## Common Issues & Solutions

1. **Listeners Not Working**: Check Firebase rules allow read access
2. **Reconnection Fails**: Verify localStorage data format
3. **Ready State Out of Sync**: Check for proper async handling
4. **Performance Issues**: Monitor number of active listeners

## Next Steps

After successful implementation and testing:
1. Proceed to Stage 5: Scoring and Leaderboard
2. Implement result submission system
3. Add real-time score updates
4. Create final game results display

## Dependencies for Next Stage

Stage 5 will require:
- Working real-time synchronization (this stage)
- Game state management (this stage)
- Player ready state handling (this stage)
- Result submission system (Stage 5)