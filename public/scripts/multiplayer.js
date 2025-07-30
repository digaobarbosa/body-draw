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
        return 'player_' + Math.random().toString(36).substr(2, 9);
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
        const unsubscribe = this.onSnapshot(roomRef, (doc) => {
            if (doc.exists()) {
                const roomData = doc.data();
                callback(roomData);
            }
        });

        this.roomListeners.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * Listen for player changes in the room
     */
    listenForPlayerChanges(callback) {
        if (!this.currentRoom) return;

        const playersRef = this.collection(this.db, 'rooms', this.currentRoom, 'players');
        const unsubscribe = this.onSnapshot(playersRef, (snapshot) => {
            const players = [];
            snapshot.forEach((doc) => {
                players.push({ id: doc.id, ...doc.data() });
            });
            callback(players);
        });

        this.roomListeners.push(unsubscribe);
        return unsubscribe;
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