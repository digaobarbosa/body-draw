# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start local development server (Python HTTP server on port 3000)
- `npm run preview` - Preview production build locally (port 8080)
- `npm test` - Run Jest tests
- `npm test:watch` - Run Jest tests in watch mode
- `npm test -- --testNamePattern="pattern"` - Run specific test by name pattern

## Core Architecture

This is a real-time pose matching game using webcam input and Roboflow's YOLOv8m pose detection API. The architecture consists of four main classes that work together:

### Class Orchestration Pattern

**PoseMatchingGame** (scripts/game.js) - Central orchestrator that:
- Manages game state phases: `idle` → `preparing` → `matching` → `results`
- Coordinates between CameraManager, RoboflowAPI, and TargetPoses instances
- Handles timer-based game loop with 7-second matching phases
- Processes frames every 200ms during active gameplay

**Key connection**: `this.poses.setRoboflowInstance(this.roboflow)` - The poses instance needs the Roboflow API connection to process target images and extract keypoints for comparison.

### Enhanced Pose Comparison System

**PoseComparison** (scripts/pose-comparison.js) - Advanced angle-based pose matching:
- Uses **weighted angle comparison** (80%) + position similarity (20%)
- **Selective keypoint filtering**: Only nose (not eyes/ears), averaged hip positions
- **Confidence threshold**: 0.04 (lowered to include more arm keypoints)
- **Arm angle weighting**: 5x weight for left_arm/right_arm angles vs other body parts
- **Exponential penalty**: Larger angle differences get penalized more severely

**Integration**: TargetPoses.calculatePoseSimilarity() checks for `typeof PoseComparison !== 'undefined'` and falls back to simple distance-based comparison if not available.

### API Configuration

**RoboflowAPI** (scripts/roboflow.js):
- **Development**: Points to `localhost:9001` (local Roboflow server)
- **Production**: Should use `https://serverless.roboflow.com`
- **Workflow**: `rodrigo-xn5xn/keypoints-test`
- **Cache**: 15-minute memory cache for API responses

### Target Pose System

**TargetPoses** (scripts/poses.js):
- Manages 4 predefined poses: tpose, celebration, pointing, sitting
- **Two-phase loading**: 1) Load image display, 2) Process with Roboflow API for keypoints
- **Keypoint extraction**: Target poses must be processed through Roboflow API before player comparison can work
- **Dependency injection**: Requires Roboflow instance to be set before target processing

## Testing Strategy

### Real Pose Data Validation
The test suite uses actual keypoint data captured from the Roboflow API:

- **Good poses**: `targetKeypoints` + `playerKeypoints` arrays - must achieve ≥80% similarity
- **Bad poses**: `bad_playerKeypoints` array - should score 40-70% similarity
- **Arms up pose**: `targetKeypointsArms` array - additional test data for arm-focused poses

### Test Data Structure
Keypoint format: `{x: number, y: number, confidence: number, class: string}`
Classes follow COCO pose format: nose, left_eye, right_eye, left_shoulder, etc.

### Running Specific Tests
```bash
npm test -- --testNamePattern="should achieve at least 80% similarity"
npm test -- --testNamePattern="bad poses"
```

## Game State Management

### Phase Transitions
1. **idle**: Waiting for user to start
2. **preparing**: 3-second countdown 
3. **matching**: 7-second pose matching window
4. **results**: Score display and auto-restart after 5 seconds

### Scoring Algorithm
- **Real-time accuracy**: 0-100% based on pose similarity
- **Best accuracy tracking**: Stores highest score during matching phase
- **Final score**: `bestAccuracy + (timeRemaining * 2)` time bonus

## Critical Implementation Notes

1. **Script load order matters**: pose-comparison.js must load before poses.js for enhanced algorithm to be available

2. **Canvas coordination**: Two canvases work together:
   - `targetCanvas`: Shows target pose image with API-generated keypoint overlay
   - `visualizationCanvas`: Shows live player pose detection from camera

3. **API Response Processing**: The Roboflow API returns both keypoints data and visualization images - both are used in the UI

4. **Confidence filtering**: Many pose keypoints have very low confidence (<0.1) and are filtered out, but arm keypoints are critical for matching so threshold is kept low (0.04)

## File Dependencies

- **index.html**: Must include pose-comparison.js before poses.js
- **jest.config.js**: Configured for Node.js environment, tests in tests/ directory
- **styles/main.css**: Uses CSS Grid with camera/detection views side-by-side
- **assets/targets/**: Contains target pose reference images (1.webp, 2.png, 3.png)