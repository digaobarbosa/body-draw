class RoboflowAPINode {
    constructor() {
        // For Node.js, we'll call the Roboflow API directly
        this.apiKey = process.env.ROBOFLOW_API_KEY;
        this.baseUrl = "https://serverless.roboflow.com/infer/workflows/rodrigo-xn5xn/keypoints-test-2";
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

            // Remove data URL prefix if present
            const base64Image = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

            // Call Roboflow API directly
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    inputs: {
                        "image": {"type": "base64", "value": base64Image},
                        "thickness": thickness
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Roboflow API request failed: ${response.status} ${response.statusText}`);
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
            // New API structure: keypoint_predictions.predictions[0].keypoints
            if (apiResponse && apiResponse.keypoint_predictions && 
                apiResponse.keypoint_predictions.predictions &&
                apiResponse.keypoint_predictions.predictions.length > 0) {
                
                const prediction = apiResponse.keypoint_predictions.predictions[0];
                if (prediction && prediction.keypoints) {
                    return prediction.keypoints.map(kp => ({
                        x: kp.x,
                        y: kp.y,
                        confidence: kp.confidence || 1.0,
                        class: kp.class
                    }));
                }
            }

            return [];
            
        } catch (error) {
            console.error('Error extracting keypoints:', error);
            return [];
        }
    }

    extractVisualizationImage(apiResponse) {
        try {
            // New API structure: keypoint_predictions.visualizations[0]
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
}

module.exports = { RoboflowAPI: RoboflowAPINode };