// Test script to verify keypoint extraction logic
const fs = require('fs');

// Load the actual keypoints.json data
const keypointsData = JSON.parse(fs.readFileSync('public/assets/targets/keypoints.json', 'utf8'));

// Get the first pose data
const firstPoseData = keypointsData['1.webp'];

console.log('Keys in 1.webp:', Object.keys(firstPoseData));
console.log('Keys in outputs[0]:', Object.keys(firstPoseData.outputs[0]));
console.log('Keys in keypoint_predictions:', Object.keys(firstPoseData.outputs[0].keypoint_predictions));
console.log('predictions length:', firstPoseData.outputs[0].keypoint_predictions.predictions.length);
console.log('Keys in predictions[0]:', Object.keys(firstPoseData.outputs[0].keypoint_predictions.predictions[0]));
console.log('keypoints length:', firstPoseData.outputs[0].keypoint_predictions.predictions[0].keypoints.length);
console.log('First keypoint:', JSON.stringify(firstPoseData.outputs[0].keypoint_predictions.predictions[0].keypoints[0], null, 2));

// Test the structure that my extractKeypoints method expects
function testExtractKeypoints(apiResponse) {
    console.log('\n=== Testing extractKeypoints logic ===');
    
    // Current API structure: outputs[0].keypoint_predictions.predictions[0].keypoints
    if (apiResponse && apiResponse.outputs && apiResponse.outputs.length > 0) {
        const output = apiResponse.outputs[0];
        console.log('✅ Found outputs[0]');
        
        // Check if outputs[0] contains new API structure
        if (output.keypoint_predictions && 
            output.keypoint_predictions.predictions &&
            output.keypoint_predictions.predictions.length > 0) {
            
            console.log('✅ Found keypoint_predictions.predictions');
            const prediction = output.keypoint_predictions.predictions[0];
            if (prediction && prediction.keypoints) {
                console.log('✅ Found keypoints in outputs structure:', prediction.keypoints.length);
                return prediction.keypoints.map(kp => ({
                    x: kp.x,
                    y: kp.y,
                    confidence: kp.confidence || 1.0,
                    class: kp.class
                }));
            } else {
                console.log('❌ No keypoints in prediction');
            }
        } else {
            console.log('❌ No keypoint_predictions.predictions found');
        }
        
        // Check for direct predictions structure
        if (output.predictions && output.predictions.length > 0) {
            console.log('✅ Found direct predictions');
            const prediction = output.predictions[0];
            if (prediction && prediction.keypoints) {
                console.log('✅ Found keypoints in direct predictions structure:', prediction.keypoints.length);
                return prediction.keypoints.map(kp => ({
                    x: kp.x,
                    y: kp.y,
                    confidence: kp.confidence || 1.0,
                    class: kp.class
                }));
            }
        } else {
            console.log('❌ No direct predictions found');
        }
    } else {
        console.log('❌ No outputs found');
    }
    
    console.log('❌ No keypoints found');
    return [];
}

const result = testExtractKeypoints(firstPoseData);
console.log('\n=== Final result ===');
console.log('Extracted keypoints:', result.length);
if (result.length > 0) {
    console.log('First extracted keypoint:', JSON.stringify(result[0], null, 2));
}