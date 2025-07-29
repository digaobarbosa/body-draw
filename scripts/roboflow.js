class RoboflowAPI {
    constructor() {
        this.apiUrl = 'https://serverless.roboflow.com';
        this.apiKey = 'SLt1HjDiKA4nAQcHml4K';
        this.workspaceName = 'rodrigo-xn5xn';
        this.workflowId = 'keypoints-test';
        this.cache = new Map();
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
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

            const response = await fetch(`https://serverless.roboflow.com/infer/workflows/${this.workspaceName}/${this.workflowId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    inputs: {
                        "image": {"type": "base64", "value": imageBase64},
                        "thickness": thickness
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
                    if (prediction.keypoints) {
                        return prediction.keypoints.map(kp => ({
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

    // Method to test API connectivity
    async testConnection() {
        try {
            // Create a simple test image (1x1 pixel)
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            const ctx = testCanvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 1, 1);
            
            const testImage = testCanvas.toDataURL('image/jpeg');
            
            const response = await this.detectPose(testImage, 10);
            console.log('API connection test successful:', response);
            return true;
            
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
}