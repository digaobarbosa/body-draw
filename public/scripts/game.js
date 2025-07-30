class PoseMatchingGame {
    constructor() {
        this.camera = new CameraManager();
        this.roboflow = new RoboflowAPI();
        this.poses = new TargetPoses();
        this.multiplayer = null; // Will be initialized when Firebase loads
        
        // Parse URL parameters for multiplayer mode
        this.urlParams = new URLSearchParams(window.location.search);
        this.isMultiplayer = this.urlParams.get('mode') === 'multiplayer';
        this.isAdmin = this.urlParams.get('admin') === 'true';
        this.roomId = this.urlParams.get('room');
        
        console.log('Game mode:', this.isMultiplayer ? 'Multiplayer' : 'Single Player');
        if (this.isMultiplayer) {
            console.log('Room:', this.roomId, 'Admin:', this.isAdmin);
        }
        
        this.gameState = {
            isPlaying: false,
            isPreparing: false,
            timeRemaining: 7,
            score: 0,
            currentAccuracy: 0,
            bestAccuracy: 0,
            phase: 'idle', // idle, preparing, matching, results, final-results
            currentPoseIndex: 0,
            totalScore: 0,
            poseScores: [] // Array to store individual pose scores
        };

        // Constant thickness value for API calls
        this.THICKNESS = 10;

        // Define the sequence of poses to play through
        this.poseQueue = ['tpose', 'celebration', 'pointing'];

        this.elements = {
            startButton: document.getElementById('startGame'),
            nextTargetButton: document.getElementById('nextTarget'),
            targetSelector: document.getElementById('targetSelector'),
            gameTimer: document.getElementById('gameTimer'),
            score: document.getElementById('score'),
            accuracy: document.getElementById('accuracy'),
            statusMessage: document.getElementById('statusMessage'),
            debugInfo: document.getElementById('debugInfo')
        };

        this.timerInterval = null;

        // Connect poses with roboflow instance
        this.poses.setRoboflowInstance(this.roboflow);

        this.initializeEventListeners();
        this.initializeMultiplayerUI();
        this.updateUI();
        
        // Hide controls in multiplayer mode since game flows automatically
        if (this.isMultiplayer) {
            this.hideMultiplayerControls();
            this.scheduleAutoStart();
        }
    }

    initializeEventListeners() {
        this.elements.startButton.addEventListener('click', () => this.toggleGame());
        this.elements.nextTargetButton.addEventListener('click', () => this.nextTarget());
        
        this.elements.targetSelector.addEventListener('change', (e) => {
            this.poses.loadTargetPose(e.target.value);
        });
    }

    /**
     * Hide all manual controls in multiplayer mode
     */
    hideMultiplayerControls() {
        // Hide all control buttons and selectors
        if (this.elements.startButton) {
            this.elements.startButton.style.display = 'none';
        }
        if (this.elements.nextTargetButton) {
            this.elements.nextTargetButton.style.display = 'none';
        }
        if (this.elements.targetSelector) {
            this.elements.targetSelector.style.display = 'none';
        }
        
        // Hide the entire controls div if needed
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            controlsDiv.style.display = 'none';
        }
    }

    /**
     * Schedule auto-start for multiplayer mode
     */
    scheduleAutoStart() {
        // Wait for camera, API, and multiplayer to be ready, then auto-start
        setTimeout(async () => {
            if (this.camera.isActive && this.multiplayer) {
                // For admin, update room state to trigger player redirects
                if (this.isAdmin) {
                    await this.multiplayer.updateRoomState('playing');
                }
                await this.startGame();
            } else {
                // Try again in 2 seconds if not ready
                setTimeout(() => this.scheduleAutoStart(), 2000);
            }
        }, 3000); // Initial 3 second delay
    }

    initializeMultiplayerUI() {
        if (!this.isMultiplayer) return;

        const adminPanel = document.getElementById('adminPanel');
        const waitingScreen = document.getElementById('waitingScreen');

        if (this.isAdmin) {
            // Show admin panel
            adminPanel.style.display = 'block';
            
            // Set up admin control elements
            const toggleAdminPanel = document.getElementById('toggleAdminPanel');
            const adminContent = document.querySelector('.admin-content');
            const nextPhaseBtn = document.getElementById('nextPhaseBtn');
            const endGameBtn = document.getElementById('endGameBtn');
            const backToLobbyBtn = document.getElementById('backToLobbyBtn');
            const adminRoomId = document.getElementById('adminRoomId');
            const adminCurrentPose = document.getElementById('adminCurrentPose');

            // Display room information
            if (adminRoomId) adminRoomId.textContent = this.roomId || 'unknown';
            if (adminCurrentPose) adminCurrentPose.textContent = '1';

            // Admin panel toggle functionality
            if (toggleAdminPanel && adminContent) {
                toggleAdminPanel.addEventListener('click', () => {
                    const isCollapsed = adminContent.style.display === 'none';
                    adminContent.style.display = isCollapsed ? 'block' : 'none';
                    toggleAdminPanel.textContent = isCollapsed ? '▼' : '▲';
                });
            }

            // Admin control buttons
            if (nextPhaseBtn) {
                nextPhaseBtn.style.display = 'none'; // Hide since game flows automatically
            }
            if (endGameBtn) {
                endGameBtn.addEventListener('click', () => this.endMultiplayerGame());
            }
            if (backToLobbyBtn) {
                backToLobbyBtn.addEventListener('click', () => this.backToLobby());
            }

            // Set up periodic player status updates
            this.startAdminStatusUpdates();

        } else {
            // Player mode - hide admin panel but keep basic game state listeners for lobby redirect
            adminPanel.style.display = 'none';
            if (waitingScreen) {
                waitingScreen.style.display = 'none';
            }
            // Still need game state listeners for initial lobby-to-game transition
            this.setupPlayerGameStateListeners();
        }
    }

    startAdminStatusUpdates() {
        // Update player statuses every 3 seconds
        const updateStatuses = async () => {
            if (this.multiplayer && this.isAdmin) {
                try {
                    const statuses = await this.multiplayer.getPlayerStatuses();
                    this.updateAdminPlayerList(statuses);
                } catch (error) {
                    console.error('Error getting player statuses:', error);
                }
            }
        };

        // Initial update
        setTimeout(updateStatuses, 2000);
        
        // Periodic updates
        this.adminStatusInterval = setInterval(updateStatuses, 3000);
    }

    updateAdminPlayerList(playerStatuses) {
        const adminPlayerList = document.getElementById('adminPlayerList');
        if (!adminPlayerList) return;

        adminPlayerList.innerHTML = '';

        // Add admin first
        const adminItem = document.createElement('div');
        adminItem.className = 'admin-player-item';
        adminItem.innerHTML = `
            <span class="admin-player-name">Admin (You)</span>
            <span class="admin-player-status playing">Admin</span>
        `;
        adminPlayerList.appendChild(adminItem);

        // Add other players
        playerStatuses.forEach(player => {
            if (player.playerId !== this.multiplayer.playerId) {
                const playerItem = document.createElement('div');
                playerItem.className = 'admin-player-item';
                
                const status = player.status || 'playing';
                const statusClass = status === 'waiting' ? 'waiting' : 
                                  status === 'done' ? 'done' : 'playing';
                
                playerItem.innerHTML = `
                    <span class="admin-player-name">${player.nickname}</span>
                    <span class="admin-player-status ${statusClass}">${status}</span>
                `;
                adminPlayerList.appendChild(playerItem);
            }
        });
    }

    setupPlayerGameStateListeners() {
        // Wait for multiplayer to be ready
        const setupListeners = () => {
            if (this.multiplayer && this.multiplayer.listenForGameStateChanges) {
                this.multiplayer.listenForGameStateChanges((gameState) => {
                    this.handleGameStateChange(gameState);
                });
            } else {
                setTimeout(setupListeners, 1000);
            }
        };
        setupListeners();
    }

    handleGameStateChange(gameState) {
        // Player receives game state updates from admin
        if (gameState.phase === 'waiting') {
            this.showWaitingScreen();
        } else if (gameState.phase === 'playing') {
            this.hideWaitingScreen();
            
            // Load the new pose if different
            const poseIndex = gameState.currentPose || 0;
            if (poseIndex < this.poseQueue.length) {
                const poseName = this.poseQueue[poseIndex];
                this.poses.loadTargetPose(poseName);
                this.gameState.currentPoseIndex = poseIndex;
            }
        }
    }

    showWaitingScreen() {
        const waitingScreen = document.getElementById('waitingScreen');
        const waitingRoomId = document.getElementById('waitingRoomId');
        
        if (waitingScreen) {
            waitingScreen.style.display = 'flex';
        }
        
        if (waitingRoomId) {
            waitingRoomId.textContent = this.roomId || 'unknown';
        }
    }

    hideWaitingScreen() {
        const waitingScreen = document.getElementById('waitingScreen');
        if (waitingScreen) {
            waitingScreen.style.display = 'none';
        }
    }

    async forceNextPhase() {
        if (!this.isAdmin || !this.multiplayer) return;

        try {
            // Move to next pose
            this.gameState.currentPoseIndex++;
            
            if (this.gameState.currentPoseIndex < this.poseQueue.length) {
                // Update admin UI
                const adminCurrentPose = document.getElementById('adminCurrentPose');
                if (adminCurrentPose) {
                    adminCurrentPose.textContent = (this.gameState.currentPoseIndex + 1).toString();
                }

                // Update game state for all players
                await this.multiplayer.updateGameState(this.gameState.currentPoseIndex, 'playing');
                
                // Load next pose locally for admin
                const nextPose = this.poseQueue[this.gameState.currentPoseIndex];
                await this.poses.loadTargetPose(nextPose);
                
                // Reset admin's game state for next pose
                this.gameState.score = 0;
                this.gameState.bestAccuracy = 0;
                this.gameState.currentAccuracy = 0;
                this.gameState.phase = 'preparing';
                
                this.startPreparationCountdown();
                this.updateUI();
                
            } else {
                // All poses completed
                this.endMultiplayerGame();
            }
        } catch (error) {
            console.error('Error forcing next phase:', error);
        }
    }

    async endMultiplayerGame() {
        if (!this.isAdmin || !this.multiplayer) return;

        try {
            // Update game state to indicate game ended
            await this.multiplayer.updateGameState(-1, 'ended');
            
            // Show final results
            this.showFinalResults();
            
            // Clean up admin status updates
            if (this.adminStatusInterval) {
                clearInterval(this.adminStatusInterval);
                this.adminStatusInterval = null;
            }
        } catch (error) {
            console.error('Error ending multiplayer game:', error);
        }
    }

    backToLobby() {
        if (!this.isAdmin) return;

        const confirmLeave = confirm('Return to lobby? This will end the game for all players.');
        if (confirmLeave) {
            // Clean up and redirect
            if (this.adminStatusInterval) {
                clearInterval(this.adminStatusInterval);
                this.adminStatusInterval = null;
            }
            
            window.location.href = `create-room.html`;
        }
    }

    async toggleGame() {
        if (!this.gameState.isPlaying) {
            await this.startGame();
        } else {
            this.stopGame();
        }
    }

    async startGame() {
        try {
            // Camera is already initialized on page load
            if (!this.camera.isActive) {
                this.updateStatus('Camera not available. Please refresh the page.');
                return;
            }

            this.updateStatus('Testing API connection...');
            const apiReady = await this.roboflow.testConnection();
            if (!apiReady) {
                this.updateStatus('API connection failed. Please check your internet connection.');
                return;
            }

            // Initialize game state for continuous play
            this.gameState.currentPoseIndex = 0;
            this.gameState.totalScore = 0;
            this.gameState.poseScores = [];
            
            // Hide target selector during gameplay
            this.hideTargetSelector(true);

            // Load first pose in the sequence
            const firstPose = this.poseQueue[0];
            await this.poses.loadTargetPose(firstPose);

            // Start preparation phase
            this.gameState.phase = 'preparing';
            this.gameState.isPlaying = true;
            this.gameState.score = 0;
            this.gameState.bestAccuracy = 0;
            
            this.startPreparationCountdown();
            this.updateUI();
            
        } catch (error) {
            console.error('Error starting game:', error);
            this.updateStatus('Failed to start game. Please try again.');
        }
    }

    startPreparationCountdown() {
        this.startCountdown(3, 
            (remaining) => this.updateStatus(`Get ready! Game starts in ${remaining} seconds...`),
            () => this.startMatchingPhase()
        );
    }

    startCountdown(seconds, onTick, onComplete) {
        let remaining = seconds;
        onTick(remaining);
        
        const interval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                onTick(remaining);
            } else {
                clearInterval(interval);
                onComplete();
            }
        }, 1000);
        
        return interval;
    }

    startMatchingPhase() {
        this.gameState.phase = 'matching';
        this.gameState.timeRemaining = 7; // Changed to 7 seconds
        
        // Switch to live video view for the matching phase
        this.poses.clearVisualization();
        
        this.updateStatus('Strike your pose! Hold it for 7 seconds.');
        
        // Hide accuracy during matching phase
        this.gameState.currentAccuracy = 0;
        this.gameState.bestAccuracy = 0;
        
        // Single-shot capture mode - pose will be captured when timer expires
        this.startTimer();
        this.updateUI();
    }

    startTimer() {
        this.timerInterval = setInterval(async () => {
            this.gameState.timeRemaining--;
            
            if (this.gameState.timeRemaining <= 0) {
                // Clear the timer immediately to prevent multiple calls
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                
                // Capture pose BEFORE ending game
                await this.captureFinalPose();
                this.endGame();
                return; // Exit early to prevent further execution
            }
            
            this.updateUI();
        }, 1000);
    }

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
            
        } catch (error) {
            console.error('Error capturing final pose:', error);
            this.updateStatus('Failed to evaluate pose - API timeout or error');
            this.gameState.currentAccuracy = 0;
            this.gameState.bestAccuracy = 0;
        }
    }

    stopGame() {
        this.gameState.isPlaying = false;
        this.gameState.phase = 'idle';
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Show target selector again
        this.hideTargetSelector(false);
        
        // Hide target canvas and show placeholder when game stops
        this.toggleTargetDisplay(false);
        
        // Clear the result visualization
        this.poses.clearVisualization();
        
        this.updateStatus('Game stopped.');
        this.updateUI();
    }

    hideTargetSelector(hide) {
        const controls = document.querySelector('.controls');
        const targetSelector = this.elements.targetSelector;
        const nextTargetButton = this.elements.nextTargetButton;
        
        if (hide) {
            // Hide target selector and next target button during gameplay
            if (targetSelector) targetSelector.style.display = 'none';
            if (nextTargetButton) nextTargetButton.style.display = 'none';
        } else {
            // Show target selector and next target button when not playing
            if (targetSelector) targetSelector.style.display = 'inline-block';
            if (nextTargetButton) nextTargetButton.style.display = 'inline-block';
        }
    }

    async endGame() {
        // Prevent multiple executions
        if (this.gameState.phase === 'results' || this.gameState.phase === 'final-results') {
            return;
        }
        
        // Ensure timer is cleared
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Validate currentPoseIndex is within bounds
        if (this.gameState.currentPoseIndex >= this.poseQueue.length) {
            console.error('currentPoseIndex out of bounds:', this.gameState.currentPoseIndex);
            this.showFinalResults();
            return;
        }
        
        // Store the current pose score
        const poseScore = this.gameState.bestAccuracy;
        this.gameState.poseScores.push(poseScore);
        this.gameState.totalScore += poseScore;
        
        const currentPoseName = this.poseQueue[this.gameState.currentPoseIndex];
        if (this.isMultiplayer) {
            this.updateStatus(`${currentPoseName} completed! Score: ${poseScore}% - Next pose starting soon...`);
        } else {
            this.updateStatus(`${currentPoseName} completed! Score: ${poseScore}%`);
        }
        
        // Set phase to results to prevent re-entry
        this.gameState.phase = 'results';
        
        // Submit score to Firebase if in multiplayer mode
        if (this.isMultiplayer && this.multiplayer) {
            try {
                await this.multiplayer.submitPlayerResult(
                    this.gameState.currentPoseIndex, 
                    poseScore, 
                    this.multiplayer.playerNickname || 'Player'
                );
                console.log(`Score submitted to Firebase: ${poseScore}% for pose ${this.gameState.currentPoseIndex}`);
            } catch (error) {
                console.error('Error submitting score to Firebase:', error);
            }
        }
        
        // Check if there are more poses to play
        this.gameState.currentPoseIndex++;
        
        if (this.gameState.currentPoseIndex < this.poseQueue.length) {
            if (this.isMultiplayer) {
                // In multiplayer mode, all players continue automatically - no synchronization needed
                setTimeout(async () => {
                    if (this.gameState.isPlaying && this.gameState.phase === 'results') {
                        const nextPose = this.poseQueue[this.gameState.currentPoseIndex];
                        await this.poses.loadTargetPose(nextPose);
                        
                        // Reset for next pose
                        this.gameState.score = 0;
                        this.gameState.bestAccuracy = 0;
                        this.gameState.currentAccuracy = 0;
                        
                        // Start preparation for next pose
                        this.gameState.phase = 'preparing';
                        this.startPreparationCountdown();
                        this.updateUI();
                    }
                }, 3000); // 3 second delay between poses for multiplayer
                
            } else {
                // Single player mode - continue automatically
                setTimeout(async () => {
                    if (this.gameState.isPlaying && this.gameState.phase === 'results') {
                        const nextPose = this.poseQueue[this.gameState.currentPoseIndex];
                        await this.poses.loadTargetPose(nextPose);
                        
                        // Reset for next pose
                        this.gameState.score = 0;
                        this.gameState.bestAccuracy = 0;
                        this.gameState.currentAccuracy = 0;
                        
                        // Start preparation for next pose
                        this.gameState.phase = 'preparing';
                        this.startPreparationCountdown();
                        this.updateUI();
                    }
                }, 2000); // 2 second delay between poses
            }
        } else {
            // All poses completed
            if (this.isMultiplayer && this.multiplayer) {
                // Mark player as done in Firebase
                try {
                    await this.multiplayer.submitPlayerResult(
                        -1, // Special index to indicate game completion
                        0,  // No score for completion marker
                        this.multiplayer.playerNickname || 'Player'
                    );
                } catch (error) {
                    console.error('Error marking player as done:', error);
                }
            }
            
            this.showFinalResults();
        }
        
        this.updateUI();
    }

    async showFinalResults() {
        // Ensure timers are cleared
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.gameState.phase = 'final-results';
        this.gameState.isPlaying = false;
        
        // Show target selector again
        this.hideTargetSelector(false);
        
        if (this.isMultiplayer && this.multiplayer) {
            await this.showMultiplayerResults();
        } else {
            this.showSinglePlayerResults();
        }
        
        this.updateUI();
    }

    showSinglePlayerResults() {
        // Ensure scores are valid numbers
        const validScores = this.gameState.poseScores.filter(score => !isNaN(score) && isFinite(score));
        const totalScore = validScores.reduce((sum, score) => sum + score, 0);
        
        // Create detailed results message
        let resultsMessage = `🎉 All poses completed!\n\nTotal Score: ${Math.round(totalScore)}%\n\nIndividual Scores:\n`;
        validScores.forEach((score, index) => {
            if (index < this.poseQueue.length) {
                const poseName = this.poseQueue[index];
                resultsMessage += `${poseName}: ${Math.round(score)}%\n`;
            }
        });
        resultsMessage += '\nClick "Start Game" to play again!';
        
        this.updateStatus(resultsMessage);
    }

    async showMultiplayerResults() {
        try {
            // Get all player results
            const playerStatuses = await this.multiplayer.getPlayerStatuses();
            
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
                    status: player.status || 'unknown'
                };
            }).sort((a, b) => b.total - a.total); // Sort by total score descending

            // Create results message
            let resultsMessage = `🏆 Game Complete! Final Results:\n\n`;
            
            // Leaderboard
            resultsMessage += `LEADERBOARD:\n`;
            leaderboard.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '   ';
                resultsMessage += `${medal} ${player.nickname}: ${player.total}% (avg: ${player.average}%)\n`;
            });
            
            resultsMessage += `\nDETAILED SCORES:\n`;
            leaderboard.forEach(player => {
                resultsMessage += `\n${player.nickname}:\n`;
                player.scores.forEach((score, poseIndex) => {
                    if (poseIndex < this.poseQueue.length) {
                        const poseName = this.poseQueue[poseIndex];
                        resultsMessage += `  ${poseName}: ${Math.round(score || 0)}%\n`;
                    }
                });
            });

            // Check if not all players are done
            const donePlayers = playerStatuses.filter(p => p.status === 'done').length;
            const totalPlayers = playerStatuses.length;
            
            if (donePlayers < totalPlayers) {
                resultsMessage += `\n⏳ Waiting for ${totalPlayers - donePlayers} more player(s) to finish...\n`;
                
                // For admin, show option to end game for everyone
                if (this.isAdmin) {
                    resultsMessage += `\nAs admin, you can use "End Game" to finish for all players.`;
                }
            } else {
                resultsMessage += `\n🎮 All players completed!`;
                
                if (this.isAdmin) {
                    resultsMessage += ` You can return to lobby to start a new game.`;
                }
            }
            
            this.updateStatus(resultsMessage);
            
        } catch (error) {
            console.error('Error showing multiplayer results:', error);
            this.updateStatus('Error loading multiplayer results. Please try again.');
        }
    }



    nextTarget() {
        const currentIndex = Array.from(this.elements.targetSelector.options)
            .findIndex(option => option.selected);
        const nextIndex = (currentIndex + 1) % this.elements.targetSelector.options.length;
        
        this.elements.targetSelector.selectedIndex = nextIndex;
        this.poses.loadTargetPose(this.elements.targetSelector.value);
        
        this.updateStatus(`New target: ${this.elements.targetSelector.value}`);
    }


    updateUI() {
        // Update button states based on game phase
        const phaseConfig = {
            'idle': { buttonText: 'Start Game', canChangeTarget: true },
            'preparing': { buttonText: 'Stop Game', canChangeTarget: false },
            'matching': { buttonText: 'Stop Game', canChangeTarget: false },
            'results': { buttonText: 'Stop Game', canChangeTarget: false },
            'final-results': { buttonText: 'Start Game', canChangeTarget: true }
        };
        
        const config = phaseConfig[this.gameState.phase] || phaseConfig['idle'];
        
        this.elements.startButton.textContent = config.buttonText;
        this.elements.startButton.disabled = false;
        this.elements.nextTargetButton.disabled = !config.canChangeTarget;
        this.elements.targetSelector.disabled = !config.canChangeTarget;
        
        // Update timer display
        this.elements.gameTimer.textContent = this.gameState.timeRemaining;
        
        // Update score display based on game phase
        if (this.gameState.phase === 'final-results') {
            this.elements.score.textContent = Math.round(this.gameState.totalScore);
        } else if (this.gameState.isPlaying && this.gameState.poseScores.length > 0) {
            // Show current total during gameplay
            const currentTotal = this.gameState.poseScores.reduce((sum, score) => sum + score, 0) + this.gameState.score;
            this.elements.score.textContent = Math.round(currentTotal);
        } else {
            this.elements.score.textContent = Math.round(this.gameState.score);
        }
        
        // Update accuracy display
        if (this.gameState.phase === 'matching') {
            this.elements.accuracy.textContent = 'Posing...';
            this.elements.accuracy.style.color = '#ffeb3b'; // Yellow
        } else if (this.gameState.phase === 'final-results') {
            // Show average accuracy in final results
            const avgAccuracy = Math.round(this.gameState.totalScore / this.poseQueue.length);
            this.elements.accuracy.textContent = `Avg: ${avgAccuracy}%`;
            this.elements.accuracy.style.color = avgAccuracy >= 70 ? '#4caf50' : (avgAccuracy >= 40 ? '#ff9800' : '#f44336');
        } else {
            this.elements.accuracy.textContent = `${this.gameState.currentAccuracy}%`;
            
            // Update accuracy color
            if (this.gameState.currentAccuracy >= 70) {
                this.elements.accuracy.style.color = '#4caf50'; // Green
            } else if (this.gameState.currentAccuracy >= 40) {
                this.elements.accuracy.style.color = '#ff9800'; // Orange
            } else {
                this.elements.accuracy.style.color = '#f44336'; // Red
            }
        }

        // Update timer color based on time remaining
        if (this.gameState.timeRemaining <= 5) {
            this.elements.gameTimer.style.color = '#f44336'; // Red
        } else if (this.gameState.timeRemaining <= 10) {
            this.elements.gameTimer.style.color = '#ff9800'; // Orange
        } else {
            this.elements.gameTimer.style.color = '#ffeb3b'; // Yellow
        }

        // Show progress indicator during gameplay
        if (this.gameState.isPlaying && this.gameState.phase !== 'final-results') {
            const currentPose = this.gameState.currentPoseIndex + 1;
            const totalPoses = this.poseQueue.length;
            
            // Ensure currentPoseIndex is within bounds
            if (this.gameState.currentPoseIndex < this.poseQueue.length) {
                const currentPoseName = this.poseQueue[this.gameState.currentPoseIndex];
                document.title = `Pose ${currentPose}/${totalPoses}: ${currentPoseName} - Body Draw`;
            } else {
                document.title = 'Body Draw';
            }
        } else {
            document.title = 'Body Draw';
        }
    }

    updateStatus(message) {
        this.elements.statusMessage.textContent = message;
        console.log('Status:', message);
    }

    updateDebugInfo(info) {
        this.elements.debugInfo.textContent = info;
    }

    toggleTargetDisplay(showTarget) {
        const targetCanvas = document.getElementById('targetCanvas');
        const placeholder = document.getElementById('targetPlaceholder');
        
        if (targetCanvas) {
            targetCanvas.style.display = showTarget ? 'block' : 'none';
        }
        if (placeholder) {
            placeholder.style.display = showTarget ? 'none' : 'flex';
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const game = new PoseMatchingGame();
    window.game = game; // Make game accessible globally for debugging
    
    // Initialize camera immediately on page load
    await game.camera.initialize();
    
    // Initialize multiplayer when Firebase is ready (only if in multiplayer mode)
    if (game.isMultiplayer) {
        setTimeout(() => {
            if (window.MultiplayerManager && window.firebase) {
                game.multiplayer = new MultiplayerManager();
                // Connect to the room specified in URL
                if (game.roomId) {
                    game.multiplayer.currentRoom = game.roomId;
                    console.log('Multiplayer game initialized for room:', game.roomId);
                }
            } else {
                console.warn('Firebase or MultiplayerManager not available for multiplayer mode');
            }
        }, 1000); // Give Firebase time to load
    }
    
    // Don't load target pose until game starts
    
    console.log('Visionary2 Pose Matching Game initialized');
});