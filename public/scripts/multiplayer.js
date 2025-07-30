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
        this.where = window.firebase.where;
        this.orderBy = window.firebase.orderBy;
        this.limit = window.firebase.limit;
        this.doc = window.firebase.doc;
        this.setDoc = window.firebase.setDoc;
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
        return 'player_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Create a new multiplayer room
     * @param {string} hostNickname - The nickname of the host
     * @param {string} customRoomName - Optional custom room name
     */
    async createRoom(hostNickname, customRoomName = null) {
        try {
            const roomCode = customRoomName ? `room-${customRoomName}` : this.generateRoomCode();
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

            // Add room to Firestore using setDoc with specific roomCode as document ID
            await this.setDoc(this.doc(this.db, 'rooms', roomCode), roomData);
            
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
     * Update room state (e.g., start game)
     */
    async updateRoomState(newState) {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            const roomRef = this.doc(this.db, 'rooms', this.currentRoom);
            await this.updateDoc(roomRef, {
                state: newState,
                startTime: newState === 'playing' ? new Date() : null
            });

            console.log(`Room state updated to: ${newState}`);
            return { success: true };

        } catch (error) {
            console.error('Error updating room state:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Listen for room state changes
     */
    listenForRoomChanges(callback) {
        if (!this.currentRoom) return;

        const roomRef = this.doc(this.db, 'rooms', this.currentRoom);
        const unsubscribe = this.onSnapshot(roomRef, 
            (doc) => {
                if (doc.exists()) {
                    const roomData = doc.data();
                    callback(roomData);
                }
            },
            (error) => {
                console.error('Room listener error:', error);
                // Could implement retry logic here if needed
            }
        );

        this.roomListeners.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Listen for player changes in the room
     */
    listenForPlayerChanges(callback) {
        if (!this.currentRoom) return;

        const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
        const unsubscribe = this.onSnapshot(playersRef, 
            (snapshot) => {
                const players = [];
                snapshot.forEach((doc) => {
                    players.push({ id: doc.id, ...doc.data() });
                });
                callback(players);
            },
            (error) => {
                console.error('Player listener error:', error);
                // Could implement retry logic here if needed
            }
        );

        this.roomListeners.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Update game state (admin only)
     */
    async updateGameState(currentPose, phase) {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            const gameStateRef = this.doc(this.db, 'rooms', this.currentRoom, 'gameState', 'current');
            await this.setDoc(gameStateRef, {
                currentPose: currentPose,
                phase: phase, // "playing" or "waiting"
                lastUpdate: new Date()
            });

            console.log(`Game state updated: pose ${currentPose}, phase ${phase}`);
            return { success: true };

        } catch (error) {
            console.error('Error updating game state:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Listen for game state changes
     */
    listenForGameStateChanges(callback) {
        if (!this.currentRoom) return;

        const gameStateRef = this.doc(this.db, 'rooms', this.currentRoom, 'gameState', 'current');
        const unsubscribe = this.onSnapshot(gameStateRef, 
            (doc) => {
                if (doc.exists()) {
                    const gameState = doc.data();
                    callback(gameState);
                }
            },
            (error) => {
                console.error('Game state listener error:', error);
            }
        );

        this.roomListeners.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Submit player result for current pose
     */
    async submitPlayerResult(poseIndex, accuracy, nickname) {
        if (!this.currentRoom || !this.playerId) {
            throw new Error('Not in a room');
        }

        try {
            const playerResultRef = this.doc(this.db, 'rooms', this.currentRoom, 'playerResults', this.playerId);
            
            // Get existing results or create new
            const existingDoc = await this.getDocs(this.query(
                this.collection(this.db, 'rooms', this.currentRoom, 'playerResults'),
                this.where('playerId', '==', this.playerId)
            ));

            let scores = [];
            if (!existingDoc.empty) {
                scores = existingDoc.docs[0].data().scores || [];
            }

            // Determine player status
            let status = 'playing';
            if (poseIndex === -1) {
                // Special index indicates game completion
                status = 'done';
            } else {
                // Update the score for this pose index
                scores[poseIndex] = Math.round(accuracy);
                status = 'waiting'; // waiting for next phase
            }

            await this.setDoc(playerResultRef, {
                playerId: this.playerId,
                nickname: nickname,
                scores: scores,
                status: status,
                lastUpdate: new Date()
            });

            if (poseIndex === -1) {
                console.log(`Player marked as done: ${nickname}`);
            } else {
                console.log(`Result submitted for pose ${poseIndex}: ${accuracy}%`);
            }
            return { success: true };

        } catch (error) {
            console.error('Error submitting player result:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all player statuses (for admin)
     */
    async getPlayerStatuses() {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            console.log('Getting player statuses for room:', this.currentRoom);
            
            const playersSnapshot = await this.getDocs(
                this.collection(this.db, 'rooms', this.currentRoom, 'playerResults')
            );
            
            console.log('Player results snapshot size:', playersSnapshot.size);
            
            const statuses = [];
            playersSnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Player result document:', doc.id, data);
                statuses.push({
                    playerId: data.playerId,
                    nickname: data.nickname,
                    status: data.status || 'playing',
                    scores: data.scores || []
                });
            });

            console.log('Final player statuses:', statuses);
            return statuses;

        } catch (error) {
            console.error('Error getting player statuses:', error);
            return [];
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