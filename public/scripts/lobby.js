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
     * Enable UI controls once multiplayer is ready
     */
    enableUI() {
        if (this.isAdmin) {
            this.validateRoomName();
        } else {
            this.validateUsername();
            // Check if room exists
            this.checkRoomExists();
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
                this.showRoomManagement();
                this.hideMessage();
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
                    window.location.href = `index.html?room=${this.roomId}&mode=multiplayer&admin=true`;
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
     * Update players list (admin view)
     */
    updateAdminPlayersList(players = null) {
        // Use real Firebase data if available, otherwise fallback to mock
        const playerList = players || [
            { nickname: 'Admin', isHost: true, connectionStatus: 'connected' }
        ];
        
        this.playersList.innerHTML = '';
        
        playerList.forEach(player => {
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
            
            this.playersList.appendChild(playerCard);
        });
        
        this.playerCount.textContent = playerList.length;
    }

    /**
     * Update players list (player lobby view)
     */
    updatePlayerLobbyList(players = null) {
        // Use real Firebase data if available, otherwise fallback to mock
        const playerList = players || [
            { nickname: this.username || 'You', connectionStatus: 'connected' }
        ];
        
        this.lobbyPlayersList.innerHTML = '';
        
        playerList.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            
            playerCard.innerHTML = `
                <div class="player-info">
                    <div class="player-avatar">${player.nickname.charAt(0).toUpperCase()}</div>
                    <div class="player-name">${player.nickname}</div>
                    ${player.isHost ? '<span class="player-host">HOST</span>' : ''}
                </div>
                <div class="connection-status ${player.connectionStatus === 'connected' ? 'connected' : ''}">●</div>
            `;
            
            this.lobbyPlayersList.appendChild(playerCard);
        });
        
        this.lobbyPlayerCount.textContent = playerList.length;
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
    
    new LobbyController();
});