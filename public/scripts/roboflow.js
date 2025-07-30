class RoboflowAPI {
    constructor() {
        // Use Firebase Function endpoint instead of direct Roboflow API
        this.functionUrl = this.getFunctionUrl();
        this.cache = new Map();
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    }

    getFunctionUrl() {
        // Use the same domain as the hosting with /api/ prefix
        // This works both in development and production via Firebase Hosting rewrites
        return '/api/detectPose';
    }

    async detectPose(imageBase64, thickness = 10) {
        try {
            const cacheKey = `${imageBase64.substring(imageBase64.length - 100, imageBase64.length)}_${thickness}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
                this.cache.delete(cacheKey);
            }

            // Call Firebase Function instead of direct Roboflow API
            const response = await fetch(this.functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageBase64: imageBase64,
                    thickness: thickness
                })
            });

            if (!response.ok) {
                throw new Error(`Firebase Function request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
            
        } catch (error) {
            console.error('Roboflow API error:', error);
            throw error;
        }
    }

    extractKeypoints(apiResponse) {
        try {
            // Based on the sample API response structure
            if (apiResponse && apiResponse.outputs && apiResponse.outputs.length > 0) {
                const output = apiResponse.outputs[0];
                
                // Check for keypoints in model_predictions structure
                if (output.model_predictions && output.model_predictions.predictions) {
                    const prediction = output.model_predictions.predictions;
                    if (prediction && prediction[0].keypoints) {
                        return prediction[0].keypoints.map(kp => ({
                            x: kp.x,
                            y: kp.y,
                            confidence: kp.confidence || 1.0,
                            class: kp.class
                        }));
                    }
                }

                // Look for keypoints directly in output
                if (output.keypoints) {
                    return output.keypoints.map(kp => ({
                        x: kp.x,
                        y: kp.y,
                        confidence: kp.confidence || 1.0
                    }));
                }
            }
            
            // Fallback: look for keypoints in different structure
            if (apiResponse && apiResponse.keypoints) {
                return apiResponse.keypoints.map(kp => ({
                    x: kp.x,
                    y: kp.y,
                    confidence: kp.confidence || 1.0
                }));
            }

            return [];
            
        } catch (error) {
            console.error('Error extracting keypoints:', error);
            return [];
        }
    }

    extractVisualizationImage(apiResponse) {
        try {
            // Extract the keypoint visualization from the API response
            if (apiResponse && apiResponse.outputs && apiResponse.outputs.length > 0) {
                const output = apiResponse.outputs[0];
                
                if (output.keypoint_visualization && output.keypoint_visualization.value) {
                    // Remove the data:image/jpeg;base64, prefix if present
                    let base64Data = output.keypoint_visualization.value;
                    if (base64Data.startsWith('data:image/')) {
                        base64Data = base64Data.split(',')[1];
                    }
                    return base64Data;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Error extracting visualization image:', error);
            return null;
        }
    }

    async processTargetImage(imageBase64, thickness = 10) {
        try {
            // Process target image and return both keypoints and visualization
            const result = await this.detectPose(imageBase64, thickness);
            
            return {
                keypoints: this.extractKeypoints(result),
                visualization: this.extractVisualizationImage(result),
                rawResponse: result
            };
            
        } catch (error) {
            console.error('Error processing target image:', error);
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
    }

    // Method to test API connectivity (browser only - uses document.createElement)
    async testConnection() {
        try {
            // Create a simple test image (1x1 pixel)
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            const ctx = testCanvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 1, 1);
            
            const testImage = testCanvas.toDataURL('image/jpeg').split(',')[1]; // Remove data:image/jpeg;base64, prefix
            
            const response = await this.detectPose(testImage, 10);
            console.log('Firebase Function connection test successful:', response);
            return true;
            
        } catch (error) {
            console.error('Firebase Function connection test failed:', error);
            return false;
        }
    }
}

// Export for Node.js if running in that environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoboflowAPI };
}