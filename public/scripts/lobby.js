/**
 * Lobby Controller - Handles both admin room creation and player lobby joining
 */

class LobbyController {
    constructor() {
        this.multiplayer = null;
        this.currentPlayers = new Map();
        this.isAdmin = window.location.pathname.includes('create-room');
        this.roomId = null;
        this.playerId = null;
        this.username = null;
        
        // Check for room parameter in URL for admin page
        if (this.isAdmin) {
            const urlParams = new URLSearchParams(window.location.search);
            const roomParam = urlParams.get('room');
            if (roomParam) {
                this.roomId = roomParam;
                this.loadExistingRoom = true;
            }
        }
        
        // Determine page type and initialize accordingly
        if (this.isAdmin) {
            this.initializeAdminPage();
        } else {
            this.initializePlayerLobby();
        }
        
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
     * Initialize admin room creation page
     */
    initializeAdminPage() {
        // Admin page elements
        this.createSection = document.getElementById('createSection');
        this.roomManagement = document.getElementById('roomManagement');
        this.roomNameInput = document.getElementById('roomNameInput');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.currentRoomTitle = document.getElementById('currentRoomTitle');
        this.shareableLink = document.getElementById('shareableLink');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.closeRoomBtn = document.getElementById('closeRoomBtn');
        this.playersList = document.getElementById('playersList');
        this.playerCount = document.getElementById('playerCount');
        this.roomStatusMessage = document.getElementById('roomStatusMessage');

        // Admin event listeners
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.copyLinkBtn.addEventListener('click', () => this.copyShareableLink());
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.closeRoomBtn.addEventListener('click', () => this.closeRoom());

        this.roomNameInput.addEventListener('input', () => this.validateRoomName());
        this.roomNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.createRoomBtn.disabled) {
                this.createRoom();
            }
        });
    }

    /**
     * Initialize player lobby page
     */
    initializePlayerLobby() {
        // Player lobby elements
        this.usernameScreen = document.getElementById('usernameScreen');
        this.lobbyScreen = document.getElementById('lobbyScreen');
        this.errorScreen = document.getElementById('errorScreen');
        this.roomDisplay = document.getElementById('roomDisplay');
        this.usernameInput = document.getElementById('usernameInput');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.lobbyRoomTitle = document.getElementById('lobbyRoomTitle');
        this.lobbyPlayersList = document.getElementById('lobbyPlayersList');
        this.lobbyPlayerCount = document.getElementById('lobbyPlayerCount');
        this.retryBtn = document.getElementById('retryBtn');

        // Extract room ID from URL hash
        this.roomId = this.extractRoomFromURL();
        
        if (this.roomId) {
            this.roomDisplay.textContent = this.roomId;
            this.lobbyRoomTitle.textContent = `Room: ${this.roomId}`;
        } else {
            this.showError('Invalid room link. Please check the URL.');
            return;
        }

        // Player event listeners
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.retryBtn.addEventListener('click', () => {
            this.hideError();
            this.usernameScreen.style.display = 'block';
        });

        this.usernameInput.addEventListener('input', () => this.validateUsername());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.joinRoomBtn.disabled) {
                this.joinRoom();
            }
        });
    }

    /**
     * Extract room ID from URL hash (#room-raccoon)
     */
    extractRoomFromURL() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#room-')) {
            return hash.substring(1); // Remove the # symbol
        }
        return null;
    }

    /**
     * Request camera permission for better game experience
     */
    async requestCameraPermission() {
        try {
            this.showMessage('Requesting camera access for the game...', false);
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            
            // Stop the stream immediately since we only needed permission
            stream.getTracks().forEach(track => track.stop());
            
            this.hideMessage();
            this.showMessage('✅ Camera ready! You\'re all set for the game.', true);
            
            setTimeout(() => {
                this.hideMessage();
            }, 3000);
            
        } catch (error) {
            console.error('Camera permission denied:', error);
            
            this.showMessage('⚠️ Camera access denied. You can still join the game, but you\'ll need to allow camera access when the game starts.', true);
            
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }

    /**
     * Enable UI controls once multiplayer is ready
     */
    enableUI() {
        if (this.isAdmin) {
            if (this.loadExistingRoom && this.roomId) {
                // Load existing room data
                this.loadRoomData();
            } else {
                this.validateRoomName();
            }
        } else {
            this.validateUsername();
            // Check if room exists
            this.checkRoomExists();
        }
    }

    /**
     * Load existing room data from URL parameter
     */
    async loadRoomData() {
        try {
            this.showMessage('Connecting to room...', false);
            
            // Check if room exists and get room data
            const roomQuery = this.multiplayer.query(
                this.multiplayer.collection(this.multiplayer.db, 'rooms'),
                this.multiplayer.where('roomId', '==', this.roomId)
            );
            
            const roomSnapshot = await this.multiplayer.getDocs(roomQuery);
            
            if (!roomSnapshot.empty) {
                const roomData = roomSnapshot.docs[0].data();
                
                // Connect to the existing room as admin
                this.multiplayer.currentRoom = this.roomId;
                this.playerId = roomData.hostPlayerId; // Use the original host player ID
                this.multiplayer.playerId = this.playerId;
                this.multiplayer.playerNickname = 'Admin';
                
                // Show room management interface
                this.showRoomManagement();
                this.hideMessage();
                
                console.log('Connected to existing room:', this.roomId);
            } else {
                // Room doesn't exist, show error
                this.showMessage('Room not found. Please create a new room.', true);
                this.createSection.style.display = 'block';
                this.roomManagement.style.display = 'none';
                return;
            }
            
        } catch (error) {
            console.error('Error loading room data:', error);
            this.showMessage('Error loading room. Please try again.', true);
            this.createSection.style.display = 'block';
            this.roomManagement.style.display = 'none';
        }
    }

    /**
     * Validate room name input (admin)
     */
    validateRoomName() {
        if (!this.roomNameInput) return;
        const roomName = this.roomNameInput.value.trim();
        this.createRoomBtn.disabled = roomName.length < 2;
    }

    /**
     * Validate username input (player)
     */
    validateUsername() {
        if (!this.usernameInput) return;
        const username = this.usernameInput.value.trim();
        this.joinRoomBtn.disabled = username.length < 2;
    }

    /**
     * Check if room exists (player)
     */
    async checkRoomExists() {
        if (!this.multiplayer || !this.roomId) return;

        try {
            // Try to query the room to see if it exists
            const roomQuery = this.multiplayer.query(
                this.multiplayer.collection(this.multiplayer.db, 'rooms'),
                this.multiplayer.where('roomId', '==', this.roomId)
            );
            
            const roomSnapshot = await this.multiplayer.getDocs(roomQuery);
            
            if (roomSnapshot.empty) {
                this.showError('Room not found. The room may have been closed or the link is incorrect.');
            }
        } catch (error) {
            console.error('Error checking room:', error);
            this.showError('Error connecting to room. Please try again.');
        }
    }

    /**
     * Create a new room (admin)
     */
    async createRoom() {
        const roomName = this.roomNameInput.value.trim();
        if (roomName.length < 2) return;

        this.showMessage('Creating room...', false);

        try {
            // Create room with custom name
            const result = await this.multiplayer.createRoom('Admin', roomName);
            
            if (result.success) {
                this.roomId = result.roomCode;
                this.playerId = result.playerId;
                this.hideMessage();
                
                // Redirect to room URL to maintain state
                window.location.href = `create-room.html?room=${this.roomId}`;
            } else {
                this.showMessage(`Failed to create room: ${result.error}`, true);
            }
        } catch (error) {
            this.showMessage(`Error creating room: ${error.message}`, true);
        }
    }

    /**
     * Join room (player)
     */
    async joinRoom() {
        const username = this.usernameInput.value.trim();
        if (username.length < 2 || !this.roomId) return;

        this.showMessage('Joining room...', false);

        try {
            const result = await this.multiplayer.joinRoom(this.roomId, username);
            
            if (result.success) {
                this.username = username;
                this.playerId = result.playerId;
                
                // Save to session storage
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('roomId', this.roomId);
                sessionStorage.setItem('playerId', this.playerId);
                
                this.showLobbyScreen();
                this.hideMessage();
                
                // Request camera permission for better game experience
                await this.requestCameraPermission();
            } else {
                this.showMessage(`Failed to join room: ${result.error}`, true);
            }
        } catch (error) {
            this.showMessage(`Error joining room: ${error.message}`, true);
        }
    }

    /**
     * Show room management interface (admin)
     */
    showRoomManagement() {
        this.createSection.style.display = 'none';
        this.roomManagement.style.display = 'block';
        
        this.currentRoomTitle.textContent = `Room: ${this.roomId}`;
        
        // Generate shareable link
        const baseURL = window.location.origin + window.location.pathname.replace('create-room.html', '');
        const shareableURL = `${baseURL}lobby.html#${this.roomId}`;
        this.shareableLink.value = shareableURL;
        
        // Start listening for real-time player updates
        if (this.multiplayer && typeof this.multiplayer.listenForPlayerChanges === 'function') {
            this.multiplayer.listenForPlayerChanges((players) => {
                this.updateAdminPlayersList(players);
                this.updateStartButton(players.length);
            });
        } else {
            // Fallback to placeholder data
            this.updateAdminPlayersList();
            this.updateStartButton();
        }
        
        // Listen for room changes (in case room gets started elsewhere)
        if (this.multiplayer && typeof this.multiplayer.listenForRoomChanges === 'function') {
            this.multiplayer.listenForRoomChanges((roomData) => {
                if (roomData.state === 'playing') {
                    // Open game in new tab while keeping admin page open
                    window.open(`index.html?room=${this.roomId}&mode=multiplayer&admin=true`, '_blank');
                }
            });
        } else {
            console.error('listenForRoomChanges method not available on multiplayer instance');
        }
    }

    /**
     * Show lobby screen (player)
     */
    showLobbyScreen() {
        this.usernameScreen.style.display = 'none';
        this.lobbyScreen.style.display = 'block';
        
        // Start listening for real-time player updates
        if (this.multiplayer && typeof this.multiplayer.listenForPlayerChanges === 'function') {
            this.multiplayer.listenForPlayerChanges((players) => {
                this.updatePlayerLobbyList(players);
            });
        } else {
            // Fallback to placeholder data
            this.updatePlayerLobbyList();
        }
        
        // Listen for game start
        if (this.multiplayer && typeof this.multiplayer.listenForRoomChanges === 'function') {
            this.multiplayer.listenForRoomChanges((roomData) => {
                if (roomData.state === 'playing') {
                    // Redirect player to game
                    window.location.href = `index.html?room=${this.roomId}&mode=multiplayer`;
                }
            });
        } else {
            console.error('listenForRoomChanges method not available on multiplayer instance');
        }
    }

    /**
     * Copy shareable link (admin)
     */
    async copyShareableLink() {
        try {
            await navigator.clipboard.writeText(this.shareableLink.value);
            
            const originalText = this.copyLinkBtn.textContent;
            this.copyLinkBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                this.copyLinkBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    }

    /**
     * Start game (admin only)
     */
    async startGame() {
        this.showMessage('Starting game for all players...', false);
        
        // Update room state to 'playing' in Firebase
        const result = await this.multiplayer.updateRoomState('playing');
        
        if (result.success) {
            // The room state listener will handle the redirect for everyone
            console.log('Game started successfully');
        } else {
            this.showMessage(`Failed to start game: ${result.error}`, true);
        }
    }

    /**
     * Close room (admin)
     */
    closeRoom() {
        if (confirm('Are you sure you want to close this room? All players will be disconnected.')) {
            this.multiplayer.cleanup();
            
            this.roomManagement.style.display = 'none';
            this.createSection.style.display = 'block';
            
            // Reset form
            this.roomNameInput.value = '';
            this.validateRoomName();
        }
    }

    /**
     * Create a player card element
     */
    createPlayerCard(player) {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        playerCard.innerHTML = `
            <div class="player-info">
                <div class="player-avatar">${player.nickname.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="player-name">${player.nickname}</div>
                    ${player.isHost ? '<span class="player-host">HOST</span>' : ''}
                </div>
            </div>
            <div class="connection-status ${player.connectionStatus === 'connected' ? 'connected' : ''}">●</div>
        `;
        
        return playerCard;
    }

    /**
     * Update players list (unified method for both admin and player views)
     */
    updatePlayersList(players = null, isAdmin = false) {
        // Use real Firebase data if available, otherwise fallback to mock
        const playerList = players || this.getMockPlayers(isAdmin);
        const listElement = isAdmin ? this.playersList : this.lobbyPlayersList;
        const countElement = isAdmin ? this.playerCount : this.lobbyPlayerCount;
        
        listElement.innerHTML = '';
        
        playerList.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            listElement.appendChild(playerCard);
        });
        
        countElement.textContent = playerList.length;
    }

    /**
     * Get mock player data for fallback
     */
    getMockPlayers(isAdmin) {
        if (isAdmin) {
            return [{ nickname: 'Admin', isHost: true, connectionStatus: 'connected' }];
        } else {
            return [{ nickname: this.username || 'You', connectionStatus: 'connected' }];
        }
    }

    /**
     * Update players list (admin view) - simplified wrapper
     */
    updateAdminPlayersList(players = null) {
        this.updatePlayersList(players, true);
    }

    /**
     * Update players list (player lobby view) - simplified wrapper
     */
    updatePlayerLobbyList(players = null) {
        this.updatePlayersList(players, false);
    }

    /**
     * Update start button state (admin)
     */
    updateStartButton(playerCount = 1) {
        const minPlayers = 1; // Allow starting with just admin for now
        
        this.startGameBtn.disabled = playerCount < minPlayers;
        
        if (playerCount >= minPlayers) {
            this.roomStatusMessage.textContent = `Ready to start game! (${playerCount} player${playerCount > 1 ? 's' : ''})`;
        } else {
            this.roomStatusMessage.textContent = `Waiting for players (${playerCount}/${minPlayers} minimum)`;
        }
    }

    /**
     * Show error screen (player)
     */
    showError(message) {
        this.usernameScreen.style.display = 'none';
        this.lobbyScreen.style.display = 'none';
        this.errorScreen.style.display = 'block';
        
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }

    /**
     * Hide error screen (player)
     */
    hideError() {
        this.errorScreen.style.display = 'none';
    }

    /**
     * Show message modal
     */
    showMessage(text, showClose = false) {
        const messageModal = document.getElementById('messageModal');
        const messageText = document.getElementById('messageText');
        const messageClose = document.getElementById('messageClose');
        
        if (messageModal && messageText && messageClose) {
            messageText.textContent = text;
            messageClose.style.display = showClose ? 'block' : 'none';
            messageModal.style.display = 'flex';
        }
    }

    /**
     * Hide message modal
     */
    hideMessage() {
        const messageModal = document.getElementById('messageModal');
        if (messageModal) {
            messageModal.style.display = 'none';
        }
    }
}

// Initialize lobby controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Also set up message modal close button
    const messageClose = document.getElementById('messageClose');
    if (messageClose) {
        messageClose.addEventListener('click', () => {
            document.getElementById('messageModal').style.display = 'none';
        });
    }
    
    const lobbyController = new LobbyController();
    
    // Clean up on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => {
        if (lobbyController && lobbyController.multiplayer) {
            lobbyController.multiplayer.cleanup();
        }
    });
});