# Stage 1: Delayed Pose Capture - Detailed Implementation Plan

## Overview
Transform the game from continuous pose detection (every 200ms) to a single-shot evaluation at the end of the 7-second timer. Players will pose "blind" without seeing their accuracy until the timer expires.

## Current Behavior to Change
- **NOW**: Game captures frames every 200ms and shows real-time accuracy
- **AFTER**: Game captures ONE frame when timer hits 0, then shows the result

## Files to Edit

### 1. scripts/game.js - Main Game Logic Changes

#### Change 1A: Remove Continuous Processing
**Location**: Lines 189-203 (startGameLoop and scheduleNextFrame methods)
**Current Code**:
```javascript
startGameLoop() {
    this.scheduleNextFrame();
}

scheduleNextFrame() {
    this.gameLoop = setTimeout(async () => {
        await this.processFrame();
        
        // Schedule next frame only if game is still running
        if (this.gameState.isPlaying && this.gameState.phase === 'matching') {
            this.scheduleNextFrame();
        }
    }, this.processInterval);
}
```

**Replace With**:
```javascript
startGameLoop() {
    // Do nothing - we'll capture at the end
    console.log('Game loop started - waiting for timer to end');
}

scheduleNextFrame() {
    // This method is no longer used
}
```

#### Change 1B: Modify Timer to Trigger Capture
**Location**: Lines 126-136 (startTimer method)
**Current Code**:
```javascript
startTimer() {
    this.timerInterval = setInterval(() => {
        this.gameState.timeRemaining--;
        
        if (this.gameState.timeRemaining <= 0) {
            this.endGame();
        }
        
        this.updateUI();
    }, 1000);
}
```

**Replace With**:
```javascript
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
```

#### Change 1C: Add New Capture Method
**Location**: Add after line 136 (after startTimer method)
**Add This New Method**:
```javascript
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
```

#### Change 1D: Update Matching Phase Start
**Location**: Lines 116-124 (startMatchingPhase method)
**Current Code**:
```javascript
startMatchingPhase() {
    this.gameState.phase = 'matching';
    this.gameState.timeRemaining = 30;
    this.updateStatus('Match the target pose! You have 30 seconds.');
    
    this.startGameLoop();
    this.startTimer();
    this.updateUI();
}
```

**Replace With**:
```javascript
startMatchingPhase() {
    this.gameState.phase = 'matching';
    this.gameState.timeRemaining = 7; // Changed to 7 seconds
    this.updateStatus('Strike your pose! Hold it for 7 seconds.');
    
    // Hide accuracy during matching phase
    this.gameState.currentAccuracy = 0;
    this.gameState.bestAccuracy = 0;
    
    // Don't start game loop - we'll capture at the end
    this.startTimer();
    this.updateUI();
}
```

### 2. scripts/game.js - UI Updates During Matching

#### Change 2A: Hide Live Accuracy
**Location**: Lines 295-306 (updateUI method, accuracy display section)
**Current Code**:
```javascript
// Update score and accuracy
this.elements.score.textContent = Math.round(this.gameState.score);
this.elements.accuracy.textContent = `${this.gameState.currentAccuracy}%`;

// Update accuracy color
if (this.gameState.currentAccuracy >= 70) {
    this.elements.accuracy.style.color = '#4caf50'; // Green
} else if (this.gameState.currentAccuracy >= 40) {
    this.elements.accuracy.style.color = '#ff9800'; // Orange
} else {
    this.elements.accuracy.style.color = '#f44336'; // Red
}
```

**Replace With**:
```javascript
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
```

### 3. index.html - Update Timer Display

#### Change 3A: Update Initial Timer Value
**Location**: Line 36
**Current Code**:
```html
<div id="gameTimer">30</div>
```

**Replace With**:
```html
<div id="gameTimer">7</div>
```

### 4. Optional: Clear Visualization During Matching

#### Change 4A: Clear Canvas When Starting
**Location**: scripts/game.js, line 116 (in startMatchingPhase)
**Add This Line**:
```javascript
startMatchingPhase() {
    this.gameState.phase = 'matching';
    this.gameState.timeRemaining = 7;
    
    // Clear the visualization canvas so player can't see previous attempts
    this.poses.clearVisualization();
    
    this.updateStatus('Strike your pose! Hold it for 7 seconds.');
    // ... rest of the method
}
```

#### Change 4B: Add Clear Method to TargetPoses
**Location**: scripts/poses.js (add new method)
**Add This Method**:
```javascript
clearVisualization() {
    this.visualizationCtx.clearRect(0, 0, this.visualizationCanvas.width, this.visualizationCanvas.height);
}
```

## Testing the Changes

1. **Start the game** - Should see "Strike your pose! Hold it for 7 seconds."
2. **During 7 seconds** - Accuracy should show "Posing..." in yellow
3. **Timer hits 0** - Should see "Capturing your pose..." message
4. **After capture** - Visualization appears with final accuracy score
5. **Game ends** - Shows final score with accuracy bonus

## Summary of Changes
- Removed continuous frame processing loop
- Added single capture when timer expires
- Changed timer from 30 to 7 seconds
- Hide accuracy display during posing phase
- Clear visualization between rounds
- Update status messages for better user feedback

## Next Steps
After implementing these changes:
1. Test single-player mode thoroughly
2. Verify Roboflow API is called only once per round
3. Ensure smooth transition from posing to results
4. Then proceed to Stage 2: Multi-player room system