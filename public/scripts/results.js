/**
 * Results Page Controller - Displays final game scores and leaderboard
 */

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
        console.log('All sessionStorage keys:', Object.keys(sessionStorage));
        console.log('sessionStorage roomId:', sessionStorage.getItem('roomId'));
        console.log('sessionStorage playerId:', sessionStorage.getItem('playerId'));
        console.log('sessionStorage username:', sessionStorage.getItem('username'));
        
        this.roomId = sessionStorage.getItem('roomId');
        this.playerId = sessionStorage.getItem('playerId');
        this.username = sessionStorage.getItem('username');
        
        // If session storage is empty, try to get from URL as fallback
        if (!this.roomId || !this.username) {
            const urlParams = new URLSearchParams(window.location.search);
            if (!this.roomId) {
                this.roomId = urlParams.get('room');
                console.log('Fallback roomId from URL:', this.roomId);
            }
            if (!this.username) {
                this.username = urlParams.get('username');
                console.log('Fallback username from URL:', this.username);
            }
        }
        
        if (!this.roomId || !this.playerId) {
            console.log('Missing session data - roomId:', this.roomId, 'playerId:', this.playerId);
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
                
                console.log('Results controller initialized with Firebase');
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
            console.log('Loading results for room:', this.roomId);
            console.log('Player ID:', this.playerId);
            console.log('Username:', this.username);
            
            // Get all player results from Firebase - bypassing the currentRoom check
            this.multiplayer.currentRoom = this.roomId; // Set the room ID so getPlayerStatuses works
            const playerStatuses = await this.multiplayer.getPlayerStatuses();
            console.log('Player statuses from Firebase:', playerStatuses);
            
            if (playerStatuses.length === 0) {
                console.log('No player statuses found, checking if room exists...');
                
                // Try to check if room exists at all
                const roomQuery = this.multiplayer.query(
                    this.multiplayer.collection(this.multiplayer.db, 'rooms'),
                    this.multiplayer.where('roomId', '==', this.roomId)
                );
                const roomSnapshot = await this.multiplayer.getDocs(roomQuery);
                
                if (roomSnapshot.empty) {
                    this.showError('Room not found. The game may not have been completed yet.');
                } else {
                    console.log('Room exists but no playerResults. Checking what collections exist...');
                    
                    // Let's also check if there are any players in the regular players collection
                    const playersQuery = this.multiplayer.query(
                        this.multiplayer.collection(this.multiplayer.db, 'rooms', this.roomId, 'players')
                    );
                    const playersSnapshot = await this.multiplayer.getDocs(playersQuery);
                    console.log('Regular players collection size:', playersSnapshot.size);
                    
                    playersSnapshot.forEach((doc) => {
                        console.log('Player document:', doc.id, doc.data());
                    });
                    
                    this.showError('No game results found. Players may still be playing or no scores were recorded.');
                }
                return;
            }
            
            // Process and display results
            this.displayLeaderboard(playerStatuses);
            this.displayDetailedScores(playerStatuses);
            
        } catch (error) {
            console.error('Error loading results:', error);
            this.showError(`Failed to load game results: ${error.message}`);
        }
    }

    /**
     * Display the main leaderboard
     */
    displayLeaderboard(playerStatuses) {
        // Calculate totals and create leaderboard
        const leaderboard = playerStatuses.map(player => {
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
        }).sort((a, b) => b.total - a.total); // Sort by total score descending

        // Clear loading message
        this.leaderboard.innerHTML = '';

        // Create leaderboard items
        leaderboard.forEach((player, index) => {
            const rank = index + 1;
            const leaderboardItem = this.createLeaderboardItem(player, rank);
            this.leaderboard.appendChild(leaderboardItem);
        });
    }

    /**
     * Create a leaderboard item element
     */
    createLeaderboardItem(player, rank) {
        const item = document.createElement('div');
        item.className = `leaderboard-item rank-${rank <= 3 ? rank : ''}`;
        
        // Add highlight for current player
        if (player.isCurrentPlayer) {
            item.style.background = 'rgba(76, 175, 80, 0.2)';
            item.style.border = '1px solid #4caf50';
        }
        
        // Get medal emoji
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `#${rank}`;
        
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
        // Define pose names (should match game.js poseQueue)
        const poseNames = ['T-Pose', 'Arms Up', 'Pointing'];
        
        // Sort players by total score
        const sortedPlayers = playerStatuses.map(player => {
            const scores = player.scores || [];
            const total = scores.reduce((sum, score) => sum + (score || 0), 0);
            
            return {
                nickname: player.nickname || 'Unknown',
                total: Math.round(total),
                scores: scores,
                isCurrentPlayer: player.playerId === this.playerId
            };
        }).sort((a, b) => b.total - a.total);

        // Clear existing content
        this.detailedScores.innerHTML = '';

        // Create detailed cards for each player
        sortedPlayers.forEach(player => {
            const card = this.createDetailedScoreCard(player, poseNames);
            this.detailedScores.appendChild(card);
        });
    }

    /**
     * Create a detailed score card for a player
     */
    createDetailedScoreCard(player, poseNames) {
        const card = document.createElement('div');
        card.className = 'player-detailed-card';
        
        // Add highlight for current player
        if (player.isCurrentPlayer) {
            card.style.border = '1px solid #4caf50';
        }
        
        // Create pose score items
        const poseScoreItems = poseNames.map((poseName, index) => {
            const score = player.scores[index] || 0;
            return `
                <div class="pose-score-item">
                    <div class="pose-name">${poseName}</div>
                    <div class="pose-score">${Math.round(score)}%</div>
                </div>
            `;
        }).join('');
        
        card.innerHTML = `
            <div class="player-detailed-header">
                <div class="player-detailed-name">
                    ${player.nickname}
                    ${player.isCurrentPlayer ? ' (You)' : ''}
                </div>
                <div class="player-detailed-total">Total: ${player.total}%</div>
            </div>
            <div class="pose-scores">
                ${poseScoreItems}
            </div>
        `;
        
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