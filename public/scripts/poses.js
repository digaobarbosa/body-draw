console.log('🚨 POSES.JS LOADED - FILE UPDATED! 🚨');

class TargetPoses {
    constructor() {
        this.canvas = document.getElementById('targetCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resultCanvas = document.getElementById('resultCanvas');
        this.resultCtx = this.resultCanvas.getContext('2d');
        
        this.currentPose = 'tpose';
        this.targetKeypoints = [];
        this.currentTargetImage = null;
        this.roboflow = null; // Will be injected from game.js
        this.preloadedKeypoints = null; // Will store cached keypoints data
        this.targetPhotoResult = null; // Store full API response for hand-aware comparison
        
        // Try to load pre-calculated keypoints on initialization
        this.loadPreCalculatedKeypoints();
        
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
                image: 'assets/targets/2.png'
            },
            pointing: {
                name: 'Pointing',
                description: 'Point with one arm extended',
                image: 'assets/targets/3.png'
            },
        };
    }

    async loadPreCalculatedKeypoints() {
        try {
            const response = await fetch('assets/targets/keypoints.json');
            if (response.ok) {
                this.preloadedKeypoints = await response.json();
                console.log('✅ Pre-calculated keypoints loaded successfully');
            }
        } catch (error) {
            console.log('⚠️ Could not load pre-calculated keypoints, will use API calls:', error.message);
        }
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
            // Show the target canvas and hide placeholder when loading a pose
            this.toggleTargetDisplay(true);
            
            // Clear canvases
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);

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
        if (!this.currentTargetImage) {
            console.error('Cannot process target image: missing image');
            return;
        }

        // Get the filename from the current pose's image path
        const imagePath = this.poses[this.currentPose].image;
        const filename = imagePath.split('/').pop();

        // Check if we have pre-calculated data for this image
        if (this.preloadedKeypoints && this.preloadedKeypoints[filename]) {
            console.log(`🔄 Using pre-calculated keypoints for ${filename}`);
            
            const cachedResult = this.preloadedKeypoints[filename];
            
            // Store the full API response for hand-aware comparison
            this.targetPhotoResult = cachedResult;
            console.log('✅ Stored pre-calculated full API response for hand-aware comparison');
            
            // Extract keypoints using the same logic as RoboflowAPI
            console.log('🔍 SIMPLE DEBUG: About to extract keypoints from cached result');
            console.log('🔍 DEBUG: this.roboflow exists?', !!this.roboflow);
            console.log('🔍 DEBUG: this.roboflow.extractKeypoints exists?', this.roboflow && typeof this.roboflow.extractKeypoints === 'function');
            
            const keypoints = this.roboflow ? this.roboflow.extractKeypoints(cachedResult) : [];
            console.log('🔍 DEBUG: extractKeypoints returned:', keypoints.length, 'keypoints');
            if (keypoints.length > 0) {
                this.targetKeypoints = keypoints;
                console.log(`✅ Pre-calculated keypoints loaded: ${this.targetKeypoints.length} keypoints`);
            } else {
                console.warn('⚠️ No keypoints found in pre-calculated data');
            }

            // Extract and display visualization
            const visualization = this.roboflow ? this.roboflow.extractVisualizationImage(cachedResult) : null;
            if (visualization) {
                this.displayVisualizationOnTarget(visualization);
                console.log('✅ Target image replaced with pre-calculated visualization');
            }
            
            return;
        }

        // Fallback to API call if no cached data or no Roboflow instance
        if (!this.roboflow) {
            console.error('Cannot process target image: missing Roboflow instance and no cached data');
            return;
        }

        try {
            console.log('Converting target image to base64...');
            // Convert image to base64
            const base64Image = await this.imageToBase64(this.currentTargetImage);
            
            console.log('Calling Roboflow API for target image...');
            // Call Roboflow API
            const result = await this.roboflow.processTargetImage(base64Image, 10);
            
            // Store the full API response for hand-aware comparison
            if (result.rawResponse) {
                this.targetPhotoResult = result.rawResponse;
                console.log('✅ Stored full target API response for hand-aware comparison');
            }
            
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
        this.displayBase64ImageOnCanvas(base64Image, this.ctx, this.canvas);
    }

    displayVisualization(base64Image) {
        console.log('🖼️ displayVisualization called with image:', !!base64Image);
        console.log('🖼️ Image data length:', base64Image ? base64Image.length : 0);
        
        this.displayBase64ImageOnCanvas(base64Image, this.resultCtx, this.resultCanvas, () => {
            console.log('🖼️ Image loaded, switching video to result canvas');
            // Hide video and show result canvas after image loads
            const video = document.getElementById('webcam');
            const resultCanvas = document.getElementById('resultCanvas');
            if (video && resultCanvas) {
                video.style.display = 'none';
                resultCanvas.style.display = 'block';
                console.log('✅ Successfully switched to result canvas');
            } else {
                console.log('🚫 Could not find video or result canvas elements');
            }
        });
    }

    displayBase64ImageOnCanvas(base64Image, ctx, canvas, onLoad) {
        if (!base64Image) return;

        const img = new Image();
        img.onload = () => {
            this.displayImageOnCanvas(img, ctx, canvas);
            if (onLoad) onLoad();
        };
        
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    }

    clearVisualization() {
        this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        
        // Show video and hide result canvas
        const video = document.getElementById('webcam');
        const resultCanvas = document.getElementById('resultCanvas');
        if (video && resultCanvas) {
            video.style.display = 'block';
            resultCanvas.style.display = 'none';
        }
    }

    getCurrentPose() {
        return this.currentPose;
    }

    getTargetKeypoints() {
        return this.targetKeypoints;
    }

    getTargetPhotoResult() {
        return this.targetPhotoResult;
    }

    // Calculate similarity between player pose and target pose using enhanced algorithm
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
        console.log("playerKeypoints", playerKeypoints);
        console.log("targetKeypoints", this.targetKeypoints);

        // Use the enhanced pose comparison algorithm
        if (typeof PoseComparison !== 'undefined') {
            const poseComparison = new PoseComparison();
            const similarity = poseComparison.calculatePoseSimilarity(playerKeypoints, this.targetKeypoints);
            console.log(`📊 Enhanced pose similarity: ${similarity}%`);
            return similarity;
        } else {
            // Fallback to simple distance-based comparison if PoseComparison is not available
            console.log('⚠️ PoseComparison not available, using fallback algorithm');
            return this.calculateSimpleDistanceSimilarity(playerKeypoints);
        }
    }

    // Calculate similarity using hand-aware algorithm with full API responses
    calculateHandAwareSimilarity(playerPhotoResult, handWeight = 0.1, excludedKeypoints = []) {
        console.log('🔍 calculateHandAwareSimilarity called with:', {
            playerPhotoResult: !!playerPhotoResult,
            targetPhotoResult: !!this.targetPhotoResult,
            handWeight,
            excludedKeypoints
        });
        
        if (!playerPhotoResult || !this.targetPhotoResult) {
            console.log('🚫 Missing photo results for hand-aware comparison');
            console.log('Player result:', !!playerPhotoResult);
            console.log('Target result:', !!this.targetPhotoResult);
            return 0;
        }

        console.log('🔍 Checking PoseComparison availability:', typeof PoseComparison !== 'undefined');
        
        if (typeof PoseComparison !== 'undefined') {
            console.log('🔍 Creating PoseComparison with hand-aware-angle strategy');
            const poseComparison = new PoseComparison('hand-aware-angle');
            const handAwareStrategy = poseComparison.strategy;
            
            console.log('🔍 Strategy created:', !!handAwareStrategy);
            console.log('🔍 calculateSimilarity method available:', typeof handAwareStrategy.calculateSimilarity === 'function');
            
            if (handAwareStrategy && typeof handAwareStrategy.calculateSimilarity === 'function') {
                console.log('🔍 Calling handAwareStrategy.calculateSimilarity with:', {
                    targetResult: !!this.targetPhotoResult,
                    playerResult: !!playerPhotoResult,
                    handWeight,
                    excludedKeypoints
                });
                
                const similarity = handAwareStrategy.calculateSimilarity(
                    this.targetPhotoResult,
                    playerPhotoResult,
                    handWeight,
                    excludedKeypoints
                );
                console.log(`📊 Hand-aware pose similarity: ${similarity}% (hand weight: ${handWeight})`);
                return similarity;
            } else {
                console.log('🚫 handAwareStrategy or calculateSimilarity method not available');
            }
        } else {
            console.log('🚫 PoseComparison not available globally');
        }
        
        // Fallback to regular pose comparison if hand-aware not available
        console.log('⚠️ Hand-aware comparison not available, falling back to regular comparison');
        const playerKeypoints = this.extractKeypoints(playerPhotoResult);
        return this.calculatePoseSimilarity(playerKeypoints);
    }

    // Helper method to extract keypoints from photo result
    extractKeypoints(photoResult) {
        if (!photoResult || !photoResult.keypoint_predictions || 
            !photoResult.keypoint_predictions.predictions ||
            !photoResult.keypoint_predictions.predictions.length) {
            return [];
        }

        const prediction = photoResult.keypoint_predictions.predictions[0];
        return prediction.keypoints || [];
    }

    // Fallback simple distance-based comparison
    calculateSimpleDistanceSimilarity(playerKeypoints) {
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
        
        console.log(`📊 Simple pose similarity: ${Math.round(similarity)}% (${validComparisons} valid comparisons, avg distance: ${averageDistance.toFixed(2)})`);
        
        return Math.round(similarity);
    }

    toggleTargetDisplay(showTarget) {
        if (this.canvas) {
            this.canvas.style.display = showTarget ? 'block' : 'none';
        }
        const placeholder = document.getElementById('targetPlaceholder');
        if (placeholder) {
            placeholder.style.display = showTarget ? 'none' : 'flex';
        }
    }
}