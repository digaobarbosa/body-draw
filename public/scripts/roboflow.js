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
            console.log('=== EXTRACTKEYPOINTS CALLED ===');
            console.log('API Response structure:', apiResponse ? Object.keys(apiResponse) : 'null');
            
            // New API structure: keypoint_predictions.predictions[0].keypoints
            if (apiResponse && apiResponse.keypoint_predictions && 
                apiResponse.keypoint_predictions.predictions &&
                apiResponse.keypoint_predictions.predictions.length > 0) {
                
                const prediction = apiResponse.keypoint_predictions.predictions[0];
                if (prediction && prediction.keypoints) {
                    console.log('🎯 DEBUG: Found keypoints in direct structure:', prediction.keypoints.length);
                    return prediction.keypoints.map(kp => ({
                        x: kp.x,
                        y: kp.y,
                        confidence: kp.confidence || 1.0,
                        class: kp.class
                    }));
                }
            }

            // Handle outputs structure which might contain new or old format
            if (apiResponse && apiResponse.outputs && apiResponse.outputs.length > 0) {
                const output = apiResponse.outputs[0];
                console.log('🔍 ROBOFLOW DEBUG: Found outputs[0], keys:', Object.keys(output));
                
                // Check if outputs[0] contains new API structure
                if (output.keypoint_predictions && 
                    output.keypoint_predictions.predictions &&
                    output.keypoint_predictions.predictions.length > 0) {
                    
                    console.log('🔍 ROBOFLOW DEBUG: Found keypoint_predictions.predictions:', output.keypoint_predictions.predictions.length);
                    const prediction = output.keypoint_predictions.predictions[0];
                    if (prediction && prediction.keypoints) {
                        console.log('🎯 ROBOFLOW DEBUG: SUCCESS! Found keypoints:', prediction.keypoints.length);
                        return prediction.keypoints.map(kp => ({
                            x: kp.x,
                            y: kp.y,
                            confidence: kp.confidence || 1.0,
                            class: kp.class
                        }));
                    } else {
                        console.log('❌ ROBOFLOW DEBUG: prediction exists but no keypoints');
                    }
                } else {
                    console.log('❌ ROBOFLOW DEBUG: No keypoint_predictions found in outputs[0]');
                }
                
                // Check for direct predictions structure (current keypoints.json format)
                if (output.predictions && output.predictions.length > 0) {
                    console.log('🔍 DEBUG: Found direct predictions:', output.predictions.length);
                    const prediction = output.predictions[0];
                    if (prediction && prediction.keypoints) {
                        console.log('🎯 DEBUG: Found keypoints in direct predictions structure:', prediction.keypoints.length);
                        return prediction.keypoints.map(kp => ({
                            x: kp.x,
                            y: kp.y,
                            confidence: kp.confidence || 1.0,
                            class: kp.class
                        }));
                    }
                } else {
                    console.log('⚠️ DEBUG: No direct predictions found in outputs[0]');
                }
                
                // Check for keypoints in model_predictions structure (old format)
                if (output.model_predictions && output.model_predictions.predictions) {
                    const prediction = output.model_predictions.predictions;
                    if (prediction && prediction[0] && prediction[0].keypoints) {
                        return prediction[0].keypoints.map(kp => ({
                            x: kp.x,
                            y: kp.y,
                            confidence: kp.confidence || 1.0,
                            class: kp.class
                        }));
                    }
                }

                // Look for keypoints directly in output (old format)
                if (output.keypoints) {
                    return output.keypoints.map(kp => ({
                        x: kp.x,
                        y: kp.y,
                        confidence: kp.confidence || 1.0,
                        class: kp.class
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
            // Current API structure: outputs[0].visualization.value
            if (apiResponse && apiResponse.outputs && apiResponse.outputs.length > 0) {
                const output = apiResponse.outputs[0];
                
                if (output.visualization && output.visualization.value) {
                    // Remove the data:image/jpeg;base64, prefix if present
                    let base64Data = output.visualization.value;
                    if (base64Data.startsWith('data:image/')) {
                        base64Data = base64Data.split(',')[1];
                    }
                    return base64Data;
                }
                
                // Legacy fallback for keypoint_visualization structure
                if (output.keypoint_visualization && output.keypoint_visualization.value) {
                    // Remove the data:image/jpeg;base64, prefix if present
                    let base64Data = output.keypoint_visualization.value;
                    if (base64Data.startsWith('data:image/')) {
                        base64Data = base64Data.split(',')[1];
                    }
                    return base64Data;
                }
            }

            // Fallback for keypoint_predictions.visualizations structure
            if (apiResponse && apiResponse.keypoint_predictions && 
                apiResponse.keypoint_predictions.visualizations &&
                apiResponse.keypoint_predictions.visualizations.length > 0) {
                
                let base64Data = apiResponse.keypoint_predictions.visualizations[0];
                // Remove the data:image/jpeg;base64, prefix if present
                if (base64Data.startsWith('data:image/')) {
                    base64Data = base64Data.split(',')[1];
                }
                return base64Data;
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

    extractHandPredictions(apiResponse) {
        try {
            // New API structure: hand_predictions.predictions[0]
            if (apiResponse && apiResponse.hand_predictions && 
                apiResponse.hand_predictions.predictions &&
                apiResponse.hand_predictions.predictions.length > 0) {
                
                return apiResponse.hand_predictions.predictions[0];
            }
            
            return null;
            
        } catch (error) {
            console.error('Error extracting hand predictions:', error);
            return null;
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