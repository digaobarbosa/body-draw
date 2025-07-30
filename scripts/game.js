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

            // Load initial target pose when game starts
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
        
        // Hide target canvas and show placeholder when game stops
        this.toggleTargetDisplay(false);
        
        // Clear the result visualization
        this.poses.clearVisualization();
        
        this.updateStatus('Game stopped.');
        this.updateUI();
    }

    endGame() {
        this.gameState.phase = 'results';
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Calculate final score (since it's single-shot, no time bonus needed)
        const finalScore = this.gameState.bestAccuracy;
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


    updateUI() {
        // Update button states based on game phase
        const phaseConfig = {
            'idle': { buttonText: 'Start Game', canChangeTarget: true },
            'preparing': { buttonText: 'Stop Game', canChangeTarget: false },
            'matching': { buttonText: 'Stop Game', canChangeTarget: false },
            'results': { buttonText: 'Start Game', canChangeTarget: true }
        };
        
        const config = phaseConfig[this.gameState.phase] || phaseConfig['idle'];
        
        this.elements.startButton.textContent = config.buttonText;
        this.elements.startButton.disabled = false;
        this.elements.nextTargetButton.disabled = !config.canChangeTarget;
        this.elements.targetSelector.disabled = !config.canChangeTarget;
        
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