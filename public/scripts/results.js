/**
 * Results Page Controller - Displays final game scores and leaderboard
 */

class Logger {
    static isDebugEnabled = window.location.hostname === 'localhost' || window.localStorage.getItem('debug') === 'true';
    
    static debug(message, data = null) {
        if (this.isDebugEnabled) {
            console.log(`[Results] ${message}`, data || '');
        }
    }
    
    static error(message, error = null) {
        console.error(`[Results] ${message}`, error || '');
    }
}

class ResultsController {
    constructor() {
        this.multiplayer = null;
        this.roomId = null;
        this.playerId = null;
        this.username = null;
        
        // Get data from session storage
        this.loadSessionData();
        
        // Initialize elements
        this.initializeElements();
        
        // Wait for multiplayer to be ready
        this.waitForMultiplayer();
    }

    /**
     * Load player and room data from session storage
     */
    loadSessionData() {
        const sessionData = {
            roomId: sessionStorage.getItem('roomId'),
            playerId: sessionStorage.getItem('playerId'),
            username: sessionStorage.getItem('username')
        };
        
        Logger.debug('Session data loaded', sessionData);
        
        this.roomId = sessionData.roomId;
        this.playerId = sessionData.playerId;
        this.username = sessionData.username;
        
        // If session storage is empty, try to get from URL as fallback
        if (!this.roomId || !this.username) {
            const urlParams = new URLSearchParams(window.location.search);
            if (!this.roomId) {
                this.roomId = urlParams.get('room');
                Logger.debug('Using fallback roomId from URL', this.roomId);
            }
            if (!this.username) {
                this.username = urlParams.get('username');
                Logger.debug('Using fallback username from URL', this.username);
            }
        }
        
        if (!this.roomId || !this.playerId) {
            Logger.debug('Missing session data', { roomId: this.roomId, playerId: this.playerId });
            this.showError('Session data missing. Please complete a multiplayer game first.');
            return;
        }
        
        // Update room info display
        const roomInfo = document.getElementById('roomInfo');
        if (roomInfo) {
            roomInfo.textContent = `Room: ${this.roomId}`;
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.leaderboard = document.getElementById('leaderboard');
        this.detailedScores = document.getElementById('detailedScores');
        this.errorScreen = document.getElementById('errorScreen');
        this.retryBtn = document.getElementById('retryBtn');
        
        // Set up retry button
        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', () => {
                this.hideError();
                this.loadResults();
            });
        }
    }

    /**
     * Wait for multiplayer manager to be available
     */
    waitForMultiplayer() {
        const checkMultiplayer = () => {
            if (window.MultiplayerManager && window.firebase) {
                this.multiplayer = new MultiplayerManager();
                this.multiplayer.currentRoom = this.roomId;
                this.multiplayer.playerId = this.playerId;
                this.multiplayer.playerNickname = this.username;
                
                Logger.debug('Results controller initialized with Firebase');
                this.loadResults();
            } else {
                setTimeout(checkMultiplayer, 500);
            }
        };
        checkMultiplayer();
    }

    /**
     * Load and display game results
     */
    async loadResults() {
        try {
            Logger.debug('Loading results', { roomId: this.roomId, playerId: this.playerId, username: this.username });
            
            const playerStatuses = await this.validateAndLoadResults();
            if (!playerStatuses) return; // Error already handled in validation
            
            // Process and display results
            this.displayLeaderboard(playerStatuses);
            this.displayDetailedScores(playerStatuses);
            
        } catch (error) {
            Logger.error('Failed to load game results', error);
            this.showError(`Failed to load game results: ${error.message}`);
        }
    }

    /**
     * Validate room and load player results
     */
    async validateAndLoadResults() {
        // Set up multiplayer connection
        this.multiplayer.currentRoom = this.roomId;
        
        // Get player results
        const playerStatuses = await this.multiplayer.getPlayerStatuses();
        Logger.debug('Player statuses from Firebase', playerStatuses);
        
        if (playerStatuses.length === 0) {
            const roomExists = await this.checkRoomExists();
            const errorMessage = roomExists 
                ? 'No game results found. Players may still be playing or no scores were recorded.'
                : 'Room not found. The game may not have been completed yet.';
            this.showError(errorMessage);
            return null;
        }
        
        return playerStatuses;
    }

    /**
     * Check if the room exists in Firebase
     */
    async checkRoomExists() {
        try {
            const roomQuery = this.multiplayer.query(
                this.multiplayer.collection(this.multiplayer.db, 'rooms'),
                this.multiplayer.where('roomId', '==', this.roomId)
            );
            const roomSnapshot = await this.multiplayer.getDocs(roomQuery);
            return !roomSnapshot.empty;
        } catch (error) {
            Logger.error('Error checking room existence', error);
            return false;
        }
    }

    /**
     * Transform and sort player data for display
     */
    processPlayerData(playerStatuses) {
        return playerStatuses.map(player => {
            const scores = player.scores || [];
            const total = scores.reduce((sum, score) => sum + (score || 0), 0);
            const average = scores.length > 0 ? Math.round(total / scores.length) : 0;
            
            return {
                nickname: player.nickname || 'Unknown',
                total: Math.round(total),
                average: average,
                scores: scores,
                isCurrentPlayer: player.playerId === this.playerId
            };
        }).sort((a, b) => b.total - a.total);
    }

    /**
     * Display the main leaderboard
     */
    displayLeaderboard(playerStatuses) {
        const leaderboard = this.processPlayerData(playerStatuses);

        // Clear loading message and create leaderboard items
        this.leaderboard.innerHTML = '';
        leaderboard.forEach((player, index) => {
            const rank = index + 1;
            const leaderboardItem = this.createLeaderboardItem(player, rank);
            this.leaderboard.appendChild(leaderboardItem);
        });
    }

    /**
     * DOM creation utilities
     */
    createElement(tag, className, innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    applyCurrentPlayerStyling(element) {
        element.style.background = 'rgba(76, 175, 80, 0.2)';
        element.style.border = '1px solid #4caf50';
    }

    getRankingDisplay(rank) {
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        return medals[rank] || `#${rank}`;
    }

    /**
     * Create a leaderboard item element
     */
    createLeaderboardItem(player, rank) {
        const item = this.createElement('div', `leaderboard-item rank-${rank <= 3 ? rank : ''}`);
        
        if (player.isCurrentPlayer) {
            this.applyCurrentPlayerStyling(item);
        }
        
        const medal = this.getRankingDisplay(rank);
        
        item.innerHTML = `
            <div class="player-info">
                <div class="rank-medal">${medal}</div>
                <div class="player-name">
                    ${player.nickname}
                    ${player.isCurrentPlayer ? ' (You)' : ''}
                </div>
            </div>
            <div class="player-score">
                <div class="total-score">${player.total}%</div>
                <div class="average-score">avg: ${player.average}%</div>
            </div>
        `;
        
        return item;
    }

    /**
     * Display detailed pose-by-pose scores
     */
    displayDetailedScores(playerStatuses) {
        // Determine game mode based on number of scores
        const maxScores = Math.max(...playerStatuses.map(p => (p.scores || []).length));
        const gameMode = maxScores === 4 ? 'multiplayer' : 'singleplayer';
        
        // Get poses for the detected game mode
        const poses = getPosesForMode(gameMode);
        const poseNames = poses.map(pose => pose.name);
        
        const sortedPlayers = this.processPlayerData(playerStatuses);

        // Clear existing content and create detailed cards
        this.detailedScores.innerHTML = '';
        sortedPlayers.forEach(player => {
            const card = this.createDetailedScoreCard(player, poseNames);
            this.detailedScores.appendChild(card);
        });
    }

    /**
     * Create a detailed score card for a player
     */
    createDetailedScoreCard(player, poseNames) {
        const card = this.createElement('div', 'player-detailed-card');
        
        // Add highlight for current player
        if (player.isCurrentPlayer) {
            this.applyCurrentPlayerStyling(card);
        }
        
        // Create header
        const header = this.createElement('div', 'player-detailed-header');
        const nameDiv = this.createElement('div', 'player-detailed-name', 
            `${player.nickname}${player.isCurrentPlayer ? ' (You)' : ''}`);
        const totalDiv = this.createElement('div', 'player-detailed-total', `Total: ${player.total}%`);
        
        header.appendChild(nameDiv);
        header.appendChild(totalDiv);
        
        // Create pose scores container
        const poseScoresContainer = this.createElement('div', 'pose-scores');
        
        poseNames.forEach((poseName, index) => {
            const score = player.scores[index];
            const poseItem = this.createElement('div', 'pose-score-item');
            const poseNameDiv = this.createElement('div', 'pose-name', poseName);
            
            // Handle missing scores gracefully
            let poseScoreDiv;
            if (score !== undefined && score !== null) {
                poseScoreDiv = this.createElement('div', 'pose-score', `${Math.round(score)}%`);
            } else {
                poseScoreDiv = this.createElement('div', 'pose-score', 'N/A');
                poseScoreDiv.style.opacity = '0.5';
            }
            
            poseItem.appendChild(poseNameDiv);
            poseItem.appendChild(poseScoreDiv);
            poseScoresContainer.appendChild(poseItem);
        });
        
        card.appendChild(header);
        card.appendChild(poseScoresContainer);
        
        return card;
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (this.errorScreen) {
            this.errorScreen.style.display = 'flex';
        }
        
        // Hide other content
        if (this.leaderboard) {
            this.leaderboard.style.display = 'none';
        }
        if (this.detailedScores) {
            this.detailedScores.style.display = 'none';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        if (this.errorScreen) {
            this.errorScreen.style.display = 'none';
        }
        
        // Show other content
        if (this.leaderboard) {
            this.leaderboard.style.display = 'block';
        }
        if (this.detailedScores) {
            this.detailedScores.style.display = 'block';
        }
    }
}

// Initialize results controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    const resultsController = new ResultsController();
    window.resultsController = resultsController; // Make accessible for debugging
});