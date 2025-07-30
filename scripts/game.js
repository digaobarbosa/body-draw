class PoseMatchingGame {
    constructor() {
        this.camera = new CameraManager();
        this.roboflow = new RoboflowAPI();
        this.poses = new TargetPoses();
        
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
        this.updateUI();
    }

    initializeEventListeners() {
        this.elements.startButton.addEventListener('click', () => this.toggleGame());
        this.elements.nextTargetButton.addEventListener('click', () => this.nextTarget());
        
        this.elements.targetSelector.addEventListener('change', (e) => {
            this.poses.loadTargetPose(e.target.value);
        });
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
        
        // Clear the visualization canvas so player can't see previous attempts
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

    endGame() {
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
        this.updateStatus(`${currentPoseName} completed! Score: ${poseScore}%`);
        
        // Set phase to results to prevent re-entry
        this.gameState.phase = 'results';
        
        // Check if there are more poses to play
        this.gameState.currentPoseIndex++;
        
        if (this.gameState.currentPoseIndex < this.poseQueue.length) {
            // Move to next pose after a short delay
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
        } else {
            // All poses completed, show final results
            this.showFinalResults();
        }
        
        this.updateUI();
    }

    showFinalResults() {
        // Ensure timers are cleared
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.gameState.phase = 'final-results';
        this.gameState.isPlaying = false;
        
        // Show target selector again
        this.hideTargetSelector(false);
        
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
        this.updateUI();
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
    
    // Initialize camera immediately on page load
    await game.camera.initialize();
    
    // Don't load target pose until game starts
    
    console.log('Visionary2 Pose Matching Game initialized');
});