class TargetPoses {
    constructor() {
        this.canvas = document.getElementById('targetCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.visualizationCanvas = document.getElementById('visualizationCanvas');
        this.visualizationCtx = this.visualizationCanvas.getContext('2d');
        
        this.currentPose = 'tpose';
        this.targetKeypoints = [];
        this.currentTargetImage = null;
        this.roboflow = null; // Will be injected from game.js
        
        // Define available poses - all use 1.webp for now
        this.poses = {
            tpose: {
                name: 'T-Pose',
                description: 'Stand with arms extended horizontally',
                image: 'assets/targets/1.webp'
            },
            celebration: {
                name: 'Arms Up',
                description: 'Raise both arms up in celebration',
                image: 'assets/targets/1.webp'
            },
            pointing: {
                name: 'Pointing',
                description: 'Point with one arm extended',
                image: 'assets/targets/1.webp'
            },
            sitting: {
                name: 'Sitting',
                description: 'Sitting position with hands on knees',
                image: 'assets/targets/1.webp'
            }
        };
    }

    setRoboflowInstance(roboflowInstance) {
        console.log('🔗 Setting Roboflow instance in TargetPoses');
        this.roboflow = roboflowInstance;
        
        // If we have a current pose loaded but no target keypoints, process it now
        if (this.currentTargetImage && this.targetKeypoints.length === 0) {
            console.log('🔄 Roboflow instance set - processing current target image retroactively');
            this.processTargetImage();
        } else if (this.targetKeypoints.length > 0) {
            console.log('✅ Target keypoints already populated:', this.targetKeypoints.length);
        } else {
            console.log('⏳ No target image loaded yet');
        }
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

            // Load and display the target image
            const imageLoaded = await this.loadAndDisplayImage(pose.image);
            if (!imageLoaded) {
                console.error('Failed to load target image:', pose.image);
                return false;
            }

            // Process the image with Roboflow API if available
            if (this.roboflow && this.currentTargetImage) {
                console.log('Processing target image with Roboflow API...');
                await this.processTargetImage();
            } else {
                console.log('Roboflow API not available yet - target keypoints will be processed later');
            }

            return true;
        } catch (error) {
            console.error('Error loading target pose:', error);
            return false;
        }
    }

    async loadAndDisplayImage(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                // Store the loaded image
                this.currentTargetImage = img;
                
                // Display the image on target canvas
                this.displayImageOnCanvas(img, this.ctx, this.canvas);
                
                console.log('Target image loaded and displayed:', imagePath);
                resolve(true);
            };

            img.onerror = (error) => {
                console.error('Failed to load image:', imagePath, error);
                resolve(false);
            };

            img.src = imagePath;
        });
    }

    displayImageOnCanvas(img, ctx, canvas) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scaling to fit image in canvas while maintaining aspect ratio
        const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
        );
        
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        // Draw the image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }

    async processTargetImage() {
        if (!this.currentTargetImage || !this.roboflow) {
            console.error('Cannot process target image: missing image or Roboflow instance');
            return;
        }

        try {
            console.log('Converting target image to base64...');
            // Convert image to base64
            const base64Image = await this.imageToBase64(this.currentTargetImage);
            
            console.log('Calling Roboflow API for target image...');
            // Call Roboflow API
            const result = await this.roboflow.processTargetImage(base64Image, 10);
            
            if (result.keypoints && result.keypoints.length > 0) {
                // Store the keypoints for comparison
                this.targetKeypoints = result.keypoints;
                console.log(`✅ Target pose keypoints extracted: ${this.targetKeypoints.length} keypoints`);
                console.log('First keypoint:', this.targetKeypoints[0]);
            } else {
                console.warn('⚠️ No keypoints extracted from target image');
            }

            if (result.visualization) {
                // Replace the target canvas with the API visualization
                this.displayVisualizationOnTarget(result.visualization);
                console.log('✅ Target image replaced with API visualization');
            } else {
                console.warn('⚠️ No visualization received from API');
            }

        } catch (error) {
            console.error('❌ Error processing target image with Roboflow:', error);
        }
    }

    async imageToBase64(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            // Convert to base64 JPEG
            const base64Data = canvas.toDataURL('image/jpeg', 0.8);
            resolve(base64Data);
        });
    }

    displayVisualizationOnTarget(base64Image) {
        if (!base64Image) return;

        const img = new Image();
        img.onload = () => {
            // Replace the target canvas content with the API visualization
            this.displayImageOnCanvas(img, this.ctx, this.canvas);
        };
        
        img.src = `data:image/jpeg;base64,${base64Image}`;
    }

    displayVisualization(base64Image) {
        if (!base64Image) return;

        const img = new Image();
        img.onload = () => {
            // Display on the visualization canvas (for player pose detection)
            this.displayImageOnCanvas(img, this.visualizationCtx, this.visualizationCanvas);
        };
        
        img.src = `data:image/jpeg;base64,${base64Image}`;
    }

    getCurrentPose() {
        return this.currentPose;
    }

    getTargetKeypoints() {
        return this.targetKeypoints;
    }

    // Calculate similarity between player pose and target pose
    calculatePoseSimilarity(playerKeypoints) {
        // Add detailed logging for debugging pose comparison issues
        if (!playerKeypoints || playerKeypoints.length === 0) {
            console.log('🚫 No player keypoints provided for comparison');
            return 0;
        }
        
        if (!this.targetKeypoints || this.targetKeypoints.length === 0) {
            console.log('🚫 No target keypoints available for comparison (target keypoints:', this.targetKeypoints?.length || 0, ')');
            return 0;
        }
        
        console.log(`🔍 Comparing poses: Player=${playerKeypoints.length} vs Target=${this.targetKeypoints.length} keypoints`);

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

        if (validComparisons === 0) {
            console.log('🚫 No valid keypoint comparisons found');
            return 0;
        }

        const averageDistance = totalDistance / validComparisons;
        const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        
        console.log(`📊 Pose similarity: ${Math.round(similarity)}% (${validComparisons} valid comparisons, avg distance: ${averageDistance.toFixed(2)})`);
        
        return Math.round(similarity);
    }
}