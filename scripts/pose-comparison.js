/**
 * Enhanced Pose Comparison Algorithm
 * Uses angle-based comparison with selective keypoint filtering
 */

class PoseComparison {
    constructor() {
        // Define keypoint indices for COCO pose format
        this.KEYPOINT_INDICES = {
            nose: 0,
            left_eye: 1,
            right_eye: 2,
            left_ear: 3,
            right_ear: 4,
            left_shoulder: 5,
            right_shoulder: 6,
            left_elbow: 7,
            right_elbow: 8,
            left_wrist: 9,
            right_wrist: 10,
            left_hip: 11,
            right_hip: 12,
            left_knee: 13,
            right_knee: 14,
            left_ankle: 15,
            right_ankle: 16
        };
        
        // Define which keypoints to use for comparison
        this.SELECTED_KEYPOINTS = [
            'nose',
            'left_shoulder', 'right_shoulder',
            'left_elbow', 'right_elbow', 
            'left_wrist', 'right_wrist',
            'left_knee', 'right_knee',
            'left_ankle', 'right_ankle'
        ];
        
        // Minimum confidence threshold (lowered to include more arm keypoints)
        this.MIN_CONFIDENCE = 0.04;
    }

    /**
     * Convert keypoints array to object with class names as keys
     */
    keypointsToObject(keypoints) {
        const keypointObj = {};
        keypoints.forEach(point => {
            if (point.class && point.confidence >= this.MIN_CONFIDENCE) {
                keypointObj[point.class] = point;
            }
        });
        return keypointObj;
    }

    /**
     * Calculate the center hip position from left and right hip
     */
    getCenterHip(keypointObj) {
        const leftHip = keypointObj.left_hip;
        const rightHip = keypointObj.right_hip;
        
        if (!leftHip && !rightHip) return null;
        if (!leftHip) return rightHip;
        if (!rightHip) return leftHip;
        
        return {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            confidence: Math.min(leftHip.confidence, rightHip.confidence),
            class: 'center_hip'
        };
    }

    /**
     * Calculate the body center and scale for normalization
     */
    getBodyCenterAndScale(keypointObj) {
        const nose = keypointObj.nose;
        const centerHip = this.getCenterHip(keypointObj);
        
        if (!nose || !centerHip) {
            // Fallback to shoulder center if nose/hip not available
            const leftShoulder = keypointObj.left_shoulder;
            const rightShoulder = keypointObj.right_shoulder;
            
            if (leftShoulder && rightShoulder) {
                const centerX = (leftShoulder.x + rightShoulder.x) / 2;
                const centerY = (leftShoulder.y + rightShoulder.y) / 2;
                const scale = Math.abs(leftShoulder.x - rightShoulder.x);
                return { centerX, centerY, scale: Math.max(scale, 50) };
            }
            
            return { centerX: 0, centerY: 0, scale: 100 };
        }
        
        const centerX = (nose.x + centerHip.x) / 2;
        const centerY = (nose.y + centerHip.y) / 2;
        const scale = Math.sqrt(
            Math.pow(nose.x - centerHip.x, 2) + 
            Math.pow(nose.y - centerHip.y, 2)
        );
        
        return { centerX, centerY, scale: Math.max(scale, 50) };
    }

    /**
     * Normalize keypoints relative to body center and scale
     */
    normalizeKeypoints(keypointObj) {
        const { centerX, centerY, scale } = this.getBodyCenterAndScale(keypointObj);
        const normalized = {};
        
        Object.keys(keypointObj).forEach(key => {
            const point = keypointObj[key];
            normalized[key] = {
                x: (point.x - centerX) / scale,
                y: (point.y - centerY) / scale,
                confidence: point.confidence,
                class: point.class
            };
        });
        
        // Add center hip if it doesn't exist
        const centerHip = this.getCenterHip(keypointObj);
        if (centerHip) {
            normalized.center_hip = {
                x: (centerHip.x - centerX) / scale,
                y: (centerHip.y - centerY) / scale,
                confidence: centerHip.confidence,
                class: 'center_hip'
            };
        }
        
        return normalized;
    }

    /**
     * Calculate angle between three points (in radians)
     */
    calculateAngle(p1, p2, p3) {
        if (!p1 || !p2 || !p3) return null;
        
        const dx1 = p1.x - p2.x;
        const dy1 = p1.y - p2.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;
        
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        
        let angle = Math.abs(angle1 - angle2);
        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
        }
        
        return angle;
    }

    /**
     * Extract key angles from normalized pose
     */
    extractPoseAngles(normalizedKeypoints) {
        const angles = {};
        
        // Left arm angle (shoulder-elbow-wrist)
        angles.left_arm = this.calculateAngle(
            normalizedKeypoints.left_shoulder,
            normalizedKeypoints.left_elbow,
            normalizedKeypoints.left_wrist
        );
        
        // Right arm angle (shoulder-elbow-wrist)
        angles.right_arm = this.calculateAngle(
            normalizedKeypoints.right_shoulder,
            normalizedKeypoints.right_elbow,
            normalizedKeypoints.right_wrist
        );
        
        // Left leg angle (hip-knee-ankle)
        angles.left_leg = this.calculateAngle(
            normalizedKeypoints.center_hip,
            normalizedKeypoints.left_knee,
            normalizedKeypoints.left_ankle
        );
        
        // Right leg angle (hip-knee-ankle)
        angles.right_leg = this.calculateAngle(
            normalizedKeypoints.center_hip,
            normalizedKeypoints.right_knee,
            normalizedKeypoints.right_ankle
        );
        
        // Shoulder angle (relative to horizontal)
        if (normalizedKeypoints.left_shoulder && normalizedKeypoints.right_shoulder) {
            const dx = normalizedKeypoints.right_shoulder.x - normalizedKeypoints.left_shoulder.x;
            const dy = normalizedKeypoints.right_shoulder.y - normalizedKeypoints.left_shoulder.y;
            angles.shoulder_tilt = Math.atan2(dy, dx);
        }
        
        // Body tilt (nose to center hip)
        if (normalizedKeypoints.nose && normalizedKeypoints.center_hip) {
            const dx = normalizedKeypoints.center_hip.x - normalizedKeypoints.nose.x;
            const dy = normalizedKeypoints.center_hip.y - normalizedKeypoints.nose.y;
            angles.body_tilt = Math.atan2(dy, dx);
        }
        
        return angles;
    }

    /**
     * Calculate distance between two poses using position comparison
     */
    calculatePositionSimilarity(normalizedPlayer, normalizedTarget) {
        let totalDistance = 0;
        let validComparisons = 0;
        
        // Compare selected keypoints
        this.SELECTED_KEYPOINTS.forEach(keypointName => {
            const playerPoint = normalizedPlayer[keypointName];
            const targetPoint = normalizedTarget[keypointName];
            
            if (playerPoint && targetPoint) {
                const distance = Math.sqrt(
                    Math.pow(playerPoint.x - targetPoint.x, 2) + 
                    Math.pow(playerPoint.y - targetPoint.y, 2)
                );
                
                // Weight by confidence
                const weight = Math.min(playerPoint.confidence, targetPoint.confidence);
                totalDistance += distance * weight;
                validComparisons += weight;
            }
        });
        
        // Also compare center hip
        const playerHip = normalizedPlayer.center_hip;
        const targetHip = normalizedTarget.center_hip;
        if (playerHip && targetHip) {
            const distance = Math.sqrt(
                Math.pow(playerHip.x - targetHip.x, 2) + 
                Math.pow(playerHip.y - targetHip.y, 2)
            );
            const weight = Math.min(playerHip.confidence, targetHip.confidence);
            totalDistance += distance * weight;
            validComparisons += weight;
        }
        
        if (validComparisons === 0) return 0;
        
        const averageDistance = totalDistance / validComparisons;
        // Convert to similarity score (0-100)
        const maxDistance = 1.0; // In normalized coordinates
        const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        
        return similarity;
    }

    /**
     * Calculate angle-based similarity between two poses with weighted importance
     */
    calculateAngleSimilarity(playerAngles, targetAngles) {
        let totalWeightedDifference = 0;
        let totalWeight = 0;
        
        // Define weights for different angle types (higher weight = more important)
        const angleWeights = {
            left_arm: 5.0,      // Extremely important - arm pose is key
            right_arm: 5.0,     // Extremely important - arm pose is key
            left_leg: 1.0,      // Less important for upper body poses
            right_leg: 1.0,     // Less important for upper body poses
            shoulder_tilt: 3.0, // Very important for overall posture
            body_tilt: 2.0      // Important for posture
        };
        
        Object.keys(playerAngles).forEach(angleType => {
            const playerAngle = playerAngles[angleType];
            const targetAngle = targetAngles[angleType];
            const weight = angleWeights[angleType] || 1.0;
            
            if (playerAngle !== null && targetAngle !== null) {
                let difference = Math.abs(playerAngle - targetAngle);
                // Handle angle wrapping
                if (difference > Math.PI) {
                    difference = 2 * Math.PI - difference;
                }
                
                totalWeightedDifference += difference * weight;
                totalWeight += weight;
            }
        });
        
        if (totalWeight === 0) {
            return 0;
        }
        
        const weightedAverageDifference = totalWeightedDifference / totalWeight;
        // Convert to similarity score (0-100) with exponential penalty for larger differences
        const normalizedDifference = weightedAverageDifference / Math.PI; // 0 to 1
        
        // Handle edge cases for NaN
        if (isNaN(normalizedDifference) || normalizedDifference < 0) {
            return 0;
        }
        
        const exponentialPenalty = Math.pow(normalizedDifference, 0.7); // Less than 1 makes penalty more aggressive
        const similarity = Math.max(0, 100 - (exponentialPenalty * 100));
        
        return similarity;
    }

    /**
     * Main comparison function combining position and angle similarities
     */
    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        if (!playerKeypoints || playerKeypoints.length === 0 || 
            !targetKeypoints || targetKeypoints.length === 0) {
            return 0;
        }
        
        try {
            // Convert to objects
            const playerObj = this.keypointsToObject(playerKeypoints);
            const targetObj = this.keypointsToObject(targetKeypoints);
            
            // Normalize keypoints
            const normalizedPlayer = this.normalizeKeypoints(playerObj);
            const normalizedTarget = this.normalizeKeypoints(targetObj);
            
            // Extract angles
            const playerAngles = this.extractPoseAngles(normalizedPlayer);
            const targetAngles = this.extractPoseAngles(normalizedTarget);
            
            // Calculate similarities
            const positionSimilarity = this.calculatePositionSimilarity(normalizedPlayer, normalizedTarget);
            const angleSimilarity = this.calculateAngleSimilarity(playerAngles, targetAngles);
            
            // Combine similarities (80% angle, 20% position) - emphasize arm angles
            const finalSimilarity = (angleSimilarity * 0.8) + (positionSimilarity * 0.2);
            
            return Math.round(finalSimilarity);
            
        } catch (error) {
            console.error('Error calculating pose similarity:', error);
            return 0;
        }
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoseComparison;
} else if (typeof window !== 'undefined') {
    window.PoseComparison = PoseComparison;
}