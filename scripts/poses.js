class TargetPoses {
    constructor() {
        this.canvas = document.getElementById('targetCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.visualizationCanvas = document.getElementById('visualizationCanvas');
        this.visualizationCtx = this.visualizationCanvas.getContext('2d');
        
        this.currentPose = 'tpose';
        this.targetKeypoints = [];
        this.targetImage = null;
        this.roboflow = null; // Will be injected from game.js
        
        // Define available poses with placeholder descriptions
        this.poses = {
            tpose: {
                name: 'T-Pose',
                description: 'Stand with arms extended horizontally',
                image: 'assets/targets/1.webp',
                keypoints: []
            },
            celebration: {
                name: 'Arms Up',
                description: 'Raise both arms up in celebration',
                image: 'assets/targets/1.webp', // Using same image for now
                keypoints: []
            },
            pointing: {
                name: 'Pointing',
                description: 'Point with one arm extended',
                image: 'assets/targets/1.webp', // Using same image for now
                keypoints: []
            },
            sitting: {
                name: 'Sitting',
                description: 'Sitting position with hands on knees',
                image: 'assets/targets/1.webp', // Using same image for now
                keypoints: []
            }
        };
    }

    setRoboflowInstance(roboflowInstance) {
        this.roboflow = roboflowInstance;
    }

    async loadTargetPose(poseName) {
        if (!this.poses[poseName]) {
            console.error('Pose not found:', poseName);
            return false;
        }

        this.currentPose = poseName;
        const pose = this.poses[poseName];

        try {
            // Clear canvases
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.visualizationCtx.clearRect(0, 0, this.visualizationCanvas.width, this.visualizationCanvas.height);

            // For now, create a placeholder target image
            this.drawPlaceholderTarget(pose);

            // If we have a target image file, process it with Roboflow
            if (this.roboflow) {
                await this.processTargetImage(pose);
            }

            return true;
        } catch (error) {
            console.error('Error loading target pose:', error);
            return false;
        }
    }

    drawPlaceholderTarget(pose) {
        // Draw a placeholder representation of the target pose
        this.ctx.fillStyle = '#4caf50';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        
        // Draw pose name
        this.ctx.fillText(pose.name, this.canvas.width / 2, 30);
        
        // Draw description
        this.ctx.font = '12px Arial';
        this.ctx.fillText(pose.description, this.canvas.width / 2, 50);
        
        // Draw a simple stick figure representation
        this.drawStickFigure(pose.name);
    }

    drawStickFigure(poseName) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.strokeStyle = '#4caf50';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        // Head
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - 60, 15, 0, 2 * Math.PI);
        this.ctx.stroke();

        // Body
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - 45);
        this.ctx.lineTo(centerX, centerY + 30);
        this.ctx.stroke();

        // Draw different arm positions based on pose
        switch (poseName) {
            case 'T-Pose':
                // Arms horizontal
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - 40, centerY - 20);
                this.ctx.lineTo(centerX + 40, centerY - 20);
                this.ctx.stroke();
                break;
            
            case 'Arms Up':
                // Arms up
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - 20);
                this.ctx.lineTo(centerX - 25, centerY - 50);
                this.ctx.moveTo(centerX, centerY - 20);
                this.ctx.lineTo(centerX + 25, centerY - 50);
                this.ctx.stroke();
                break;
            
            case 'Pointing':
                // One arm pointing
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - 20);
                this.ctx.lineTo(centerX + 40, centerY - 30);
                this.ctx.moveTo(centerX, centerY - 20);
                this.ctx.lineTo(centerX - 15, centerY - 10);
                this.ctx.stroke();
                break;
            
            case 'Sitting':
                // Arms on knees
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - 10);
                this.ctx.lineTo(centerX - 20, centerY + 10);
                this.ctx.moveTo(centerX, centerY - 10);
                this.ctx.lineTo(centerX + 20, centerY + 10);
                this.ctx.stroke();
                break;
        }

        // Legs
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY + 30);
        this.ctx.lineTo(centerX - 20, centerY + 70);
        this.ctx.moveTo(centerX, centerY + 30);
        this.ctx.lineTo(centerX + 20, centerY + 70);
        this.ctx.stroke();
    }

    async processTargetImage(pose) {
        // This would process an actual target image with Roboflow
        // For now, create mock keypoints based on the pose type
        this.targetKeypoints = this.generateMockKeypoints(pose.name);
        
        // If we had a real image file, we would:
        // 1. Load the image
        // 2. Convert to base64
        // 3. Send to Roboflow API
        // 4. Extract keypoints and visualization
        
        console.log(`Processed target pose: ${pose.name}`, this.targetKeypoints);
    }

    generateMockKeypoints(poseName) {
        // Generate mock keypoints for different poses
        // These represent the COCO pose keypoint format (17 keypoints)
        const baseKeypoints = [
            { x: 150, y: 90, confidence: 0.9, name: 'nose' },           // 0
            { x: 145, y: 85, confidence: 0.9, name: 'left_eye' },      // 1
            { x: 155, y: 85, confidence: 0.9, name: 'right_eye' },     // 2
            { x: 140, y: 90, confidence: 0.9, name: 'left_ear' },      // 3
            { x: 160, y: 90, confidence: 0.9, name: 'right_ear' },     // 4
            { x: 130, y: 130, confidence: 0.9, name: 'left_shoulder' }, // 5
            { x: 170, y: 130, confidence: 0.9, name: 'right_shoulder' }, // 6
            { x: 110, y: 150, confidence: 0.9, name: 'left_elbow' },   // 7
            { x: 190, y: 150, confidence: 0.9, name: 'right_elbow' },  // 8
            { x: 90, y: 170, confidence: 0.9, name: 'left_wrist' },    // 9
            { x: 210, y: 170, confidence: 0.9, name: 'right_wrist' },  // 10
            { x: 140, y: 190, confidence: 0.9, name: 'left_hip' },     // 11
            { x: 160, y: 190, confidence: 0.9, name: 'right_hip' },    // 12
            { x: 135, y: 230, confidence: 0.9, name: 'left_knee' },    // 13
            { x: 165, y: 230, confidence: 0.9, name: 'right_knee' },   // 14
            { x: 130, y: 270, confidence: 0.9, name: 'left_ankle' },   // 15
            { x: 170, y: 270, confidence: 0.9, name: 'right_ankle' }   // 16
        ];

        // Modify keypoints based on pose type
        switch (poseName) {
            case 'T-Pose':
                // Arms horizontal
                baseKeypoints[7].x = 90;  // left_elbow
                baseKeypoints[7].y = 130; // same height as shoulders
                baseKeypoints[8].x = 210; // right_elbow
                baseKeypoints[8].y = 130;
                baseKeypoints[9].x = 70;  // left_wrist
                baseKeypoints[9].y = 130;
                baseKeypoints[10].x = 230; // right_wrist
                baseKeypoints[10].y = 130;
                break;
                
            case 'Arms Up':
                // Arms raised up
                baseKeypoints[7].x = 120; // left_elbow
                baseKeypoints[7].y = 100;
                baseKeypoints[8].x = 180; // right_elbow
                baseKeypoints[8].y = 100;
                baseKeypoints[9].x = 110; // left_wrist
                baseKeypoints[9].y = 70;
                baseKeypoints[10].x = 190; // right_wrist
                baseKeypoints[10].y = 70;
                break;
                
            case 'Pointing':
                // Right arm pointing
                baseKeypoints[8].x = 200; // right_elbow
                baseKeypoints[8].y = 120;
                baseKeypoints[10].x = 230; // right_wrist
                baseKeypoints[10].y = 110;
                // Left arm down
                baseKeypoints[7].x = 120; // left_elbow
                baseKeypoints[7].y = 160;
                baseKeypoints[9].x = 115; // left_wrist
                baseKeypoints[9].y = 180;
                break;
        }

        return baseKeypoints;
    }

    getCurrentPose() {
        return this.currentPose;
    }

    getTargetKeypoints() {
        return this.targetKeypoints;
    }

    // Calculate similarity between player pose and target pose
    calculatePoseSimilarity(playerKeypoints) {
        if (!playerKeypoints || playerKeypoints.length === 0 || !this.targetKeypoints || this.targetKeypoints.length === 0) {
            return 0;
        }

        let totalDistance = 0;
        let validComparisons = 0;
        const maxDistance = 100; // Maximum acceptable distance for full score

        // Compare corresponding keypoints
        for (let i = 0; i < Math.min(playerKeypoints.length, this.targetKeypoints.length); i++) {
            const playerPoint = playerKeypoints[i];
            const targetPoint = this.targetKeypoints[i];

            if (playerPoint.confidence > 0.5 && targetPoint.confidence > 0.5) {
                const distance = Math.sqrt(
                    Math.pow(playerPoint.x - targetPoint.x, 2) + 
                    Math.pow(playerPoint.y - targetPoint.y, 2)
                );
                
                totalDistance += Math.min(distance, maxDistance);
                validComparisons++;
            }
        }

        if (validComparisons === 0) return 0;

        const averageDistance = totalDistance / validComparisons;
        const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        
        return Math.round(similarity);
    }

    // Display the keypoint visualization from API
    displayVisualization(base64Image) {
        if (!base64Image) return;

        const img = new Image();
        img.onload = () => {
            // Clear canvas and draw the visualization image
            this.visualizationCtx.clearRect(0, 0, this.visualizationCanvas.width, this.visualizationCanvas.height);
            
            // Scale image to fit canvas
            const scale = Math.min(
                this.visualizationCanvas.width / img.width,
                this.visualizationCanvas.height / img.height
            );
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (this.visualizationCanvas.width - scaledWidth) / 2;
            const y = (this.visualizationCanvas.height - scaledHeight) / 2;
            
            this.visualizationCtx.drawImage(img, x, y, scaledWidth, scaledHeight);
        };
        
        img.src = `data:image/jpeg;base64,${base64Image}`;
    }
}