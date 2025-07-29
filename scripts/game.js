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
            thickness: 10,
            phase: 'idle' // idle, preparing, matching, results
        };

        this.elements = {
            startButton: document.getElementById('startGame'),
            nextTargetButton: document.getElementById('nextTarget'),
            calibrateButton: document.getElementById('calibrate'),
            targetSelector: document.getElementById('targetSelector'),
            thicknessSlider: document.getElementById('thicknessSlider'),
            thicknessValue: document.getElementById('thicknessValue'),
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
        this.elements.calibrateButton.addEventListener('click', () => this.calibrate());
        
        this.elements.targetSelector.addEventListener('change', (e) => {
            this.poses.loadTargetPose(e.target.value);
        });
        
        this.elements.thicknessSlider.addEventListener('input', (e) => {
            this.gameState.thickness = parseInt(e.target.value);
            this.elements.thicknessValue.textContent = this.gameState.thickness;
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
            this.updateStatus('Initializing camera...');
            
            const cameraReady = await this.camera.initialize();
            if (!cameraReady) {
                return;
            }

            this.updateStatus('Testing API connection...');
            const apiReady = await this.roboflow.testConnection();
            if (!apiReady) {
                this.updateStatus('API connection failed. Please check your internet connection.');
                return;
            }

            // Load initial target pose
            await this.poses.loadTargetPose(this.elements.targetSelector.value);

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
        this.updateStatus('Get ready! Game starts in 3 seconds...');
        let countdown = 3;
        
        const countdownInterval = setInterval(() => {
            if (countdown > 0) {
                this.updateStatus(`Get ready! Game starts in ${countdown} seconds...`);
                countdown--;
            } else {
                clearInterval(countdownInterval);
                this.startMatchingPhase();
            }
        }, 1000);
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
                // Capture pose BEFORE ending game
                await this.captureFinalPose();
                this.endGame();
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
                return;
            }
            
            // Process with Roboflow API
            const result = await this.roboflow.detectPose(imageData, this.gameState.thickness);
            const keypoints = this.roboflow.extractKeypoints(result);
            const visualization = this.roboflow.extractVisualizationImage(result);
            
            // Display the visualization
            if (visualization) {
                this.poses.displayVisualization(visualization);
            }
            
            if (keypoints.length > 0) {
                // Calculate final accuracy
                const accuracy = this.poses.calculatePoseSimilarity(keypoints);
                this.gameState.currentAccuracy = accuracy;
                this.gameState.bestAccuracy = accuracy; // Single shot, so current = best
                
                this.updateDebugInfo(`Final pose captured! Accuracy: ${accuracy}%`);
            } else {
                this.updateDebugInfo('No pose detected in final capture');
                this.gameState.currentAccuracy = 0;
                this.gameState.bestAccuracy = 0;
            }
            
        } catch (error) {
            console.error('Error capturing final pose:', error);
            this.updateStatus('Failed to evaluate pose');
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
        
        this.camera.stop();
        this.updateStatus('Game stopped.');
        this.updateUI();
    }

    endGame() {
        this.gameState.phase = 'results';
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Calculate final score based on best accuracy and consistency
        const timeBonus = Math.max(0, this.gameState.timeRemaining * 2);
        const finalScore = this.gameState.bestAccuracy + timeBonus;
        this.gameState.score = finalScore;
        
        this.updateStatus(`Time's up! Final score: ${finalScore} (Best accuracy: ${this.gameState.bestAccuracy}%)`);
        this.updateUI();
        
        // Auto-restart option after 5 seconds
        setTimeout(() => {
            if (this.gameState.phase === 'results') {
                this.gameState.isPlaying = false;
                this.gameState.phase = 'idle';
                this.updateStatus('Click "Start Game" to play again!');
                this.updateUI();
            }
        }, 5000);
    }



    nextTarget() {
        const currentIndex = Array.from(this.elements.targetSelector.options)
            .findIndex(option => option.selected);
        const nextIndex = (currentIndex + 1) % this.elements.targetSelector.options.length;
        
        this.elements.targetSelector.selectedIndex = nextIndex;
        this.poses.loadTargetPose(this.elements.targetSelector.value);
        
        this.updateStatus(`New target: ${this.elements.targetSelector.value}`);
    }

    async calibrate() {
        this.updateStatus('Calibrating... Stand in T-pose for 3 seconds.');
        
        // Simple calibration - could be enhanced
        setTimeout(() => {
            this.updateStatus('Calibration complete!');
        }, 3000);
    }

    updateUI() {
        // Update button states based on game phase
        if (this.gameState.phase === 'idle') {
            this.elements.startButton.textContent = 'Start Game';
            this.elements.startButton.disabled = false;
            this.elements.nextTargetButton.disabled = false;
            this.elements.targetSelector.disabled = false;
        } else if (this.gameState.phase === 'preparing') {
            this.elements.startButton.textContent = 'Stop Game';
            this.elements.startButton.disabled = false;
            this.elements.nextTargetButton.disabled = true;
            this.elements.targetSelector.disabled = true;
        } else if (this.gameState.phase === 'matching') {
            this.elements.startButton.textContent = 'Stop Game';
            this.elements.startButton.disabled = false;
            this.elements.nextTargetButton.disabled = true;
            this.elements.targetSelector.disabled = true;
        } else if (this.gameState.phase === 'results') {
            this.elements.startButton.textContent = 'Start Game';
            this.elements.startButton.disabled = false;
            this.elements.nextTargetButton.disabled = false;
            this.elements.targetSelector.disabled = false;
        }
        
        this.elements.calibrateButton.disabled = !this.gameState.isPlaying;
        
        // Update timer display
        this.elements.gameTimer.textContent = this.gameState.timeRemaining;
        
        // Update score and accuracy
        this.elements.score.textContent = Math.round(this.gameState.score);
        
        // Hide accuracy during matching phase
        if (this.gameState.phase === 'matching') {
            this.elements.accuracy.textContent = 'Posing...';
            this.elements.accuracy.style.color = '#ffeb3b'; // Yellow
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
    }

    updateStatus(message) {
        this.elements.statusMessage.textContent = message;
        console.log('Status:', message);
    }

    updateDebugInfo(info) {
        this.elements.debugInfo.textContent = info;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const game = new PoseMatchingGame();
    
    // Set initial target pose (roboflow instance is already set in constructor)
    await game.poses.loadTargetPose('tpose');
    
    console.log('Visionary2 Pose Matching Game initialized');
});