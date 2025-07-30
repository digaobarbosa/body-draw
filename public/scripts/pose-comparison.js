/**
 * Pose Comparison Strategies
 * Multiple algorithms for comparing pose similarity
 */

// Base strategy interface
class PoseComparisonStrategy {
    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        throw new Error('Strategy must implement calculatePoseSimilarity method');
    }
    
    getName() {
        throw new Error('Strategy must implement getName method');
    }
}

// Enhanced Angle-based Strategy (current algorithm)
class EnhancedAngleStrategy extends PoseComparisonStrategy {
    constructor() {
        super();
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

    getName() {
        return 'enhanced-angle';
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

// Aligned Distance-based Strategy
class AlignedDistanceStrategy extends PoseComparisonStrategy {
    constructor() {
        super();
        this.MIN_CONFIDENCE = 0.04;
        this.SELECTED_KEYPOINTS = [
            'nose',
            'left_shoulder', 'right_shoulder',
            'left_elbow', 'right_elbow', 
            'left_wrist', 'right_wrist',
            'left_hip', 'right_hip',
            'left_knee', 'right_knee',
            'left_ankle', 'right_ankle'
        ];
        
        // Keypoint importance weights
        this.KEYPOINT_WEIGHTS = {
            'nose': 2.0,
            'left_shoulder': 3.0, 'right_shoulder': 3.0,
            'left_elbow': 4.0, 'right_elbow': 4.0,
            'left_wrist': 5.0, 'right_wrist': 5.0,  // Arms are most important
            'left_hip': 2.0, 'right_hip': 2.0,
            'left_knee': 1.5, 'right_knee': 1.5,
            'left_ankle': 1.0, 'right_ankle': 1.0
        };
    }

    getName() {
        return 'aligned-distance';
    }

    keypointsToObject(keypoints) {
        const keypointObj = {};
        keypoints.forEach(point => {
            if (point.class && point.confidence >= this.MIN_CONFIDENCE) {
                keypointObj[point.class] = point;
            }
        });
        return keypointObj;
    }

    // Find reference point (nose) for alignment
    getReferencePoint(keypointObj) {
        // Prefer nose as reference point
        if (keypointObj.nose) {
            return keypointObj.nose;
        }
        
        // Fallback to center of shoulders
        const leftShoulder = keypointObj.left_shoulder;
        const rightShoulder = keypointObj.right_shoulder;
        if (leftShoulder && rightShoulder) {
            return {
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2,
                confidence: Math.min(leftShoulder.confidence, rightShoulder.confidence),
                class: 'shoulder_center'
            };
        }
        
        // Last resort: use any available high-confidence point
        const availablePoints = Object.values(keypointObj)
            .filter(p => p.confidence > 0.3)
            .sort((a, b) => b.confidence - a.confidence);
        
        return availablePoints.length > 0 ? availablePoints[0] : null;
    }

    // Align poses by translating reference point to origin
    alignPoses(playerObj, targetObj) {
        const playerRef = this.getReferencePoint(playerObj);
        const targetRef = this.getReferencePoint(targetObj);
        
        if (!playerRef || !targetRef) {
            return { alignedPlayer: playerObj, alignedTarget: targetObj };
        }
        
        const alignedPlayer = {};
        const alignedTarget = {};
        
        // Translate player keypoints
        Object.keys(playerObj).forEach(key => {
            const point = playerObj[key];
            alignedPlayer[key] = {
                x: point.x - playerRef.x,
                y: point.y - playerRef.y,
                confidence: point.confidence,
                class: point.class
            };
        });
        
        // Translate target keypoints
        Object.keys(targetObj).forEach(key => {
            const point = targetObj[key];
            alignedTarget[key] = {
                x: point.x - targetRef.x,
                y: point.y - targetRef.y,
                confidence: point.confidence,
                class: point.class
            };
        });
        
        return { alignedPlayer, alignedTarget };
    }

    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        if (!playerKeypoints || playerKeypoints.length === 0 || 
            !targetKeypoints || targetKeypoints.length === 0) {
            return 0;
        }
        
        try {
            const playerObj = this.keypointsToObject(playerKeypoints);
            const targetObj = this.keypointsToObject(targetKeypoints);
            
            const { alignedPlayer, alignedTarget } = this.alignPoses(playerObj, targetObj);
            
            let totalWeightedDistance = 0;
            let totalWeight = 0;
            
            // Compare aligned keypoints
            this.SELECTED_KEYPOINTS.forEach(keypointName => {
                const playerPoint = alignedPlayer[keypointName];
                const targetPoint = alignedTarget[keypointName];
                
                if (playerPoint && targetPoint) {
                    const distance = Math.sqrt(
                        Math.pow(playerPoint.x - targetPoint.x, 2) + 
                        Math.pow(playerPoint.y - targetPoint.y, 2)
                    );
                    
                    // Weight by keypoint importance and confidence
                    const importanceWeight = this.KEYPOINT_WEIGHTS[keypointName] || 1.0;
                    const confidenceWeight = Math.min(playerPoint.confidence, targetPoint.confidence);
                    const combinedWeight = importanceWeight * confidenceWeight;
                    
                    totalWeightedDistance += distance * combinedWeight;
                    totalWeight += combinedWeight;
                }
            });
            
            if (totalWeight === 0) return 0;
            
            const averageDistance = totalWeightedDistance / totalWeight;
            
            // Convert to similarity score (0-100)
            // Normalize distance based on typical pose dimensions
            const maxDistance = 200; // Pixels - adjust based on image size
            const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
            
            return Math.round(similarity);
            
        } catch (error) {
            console.error('Error in AlignedDistanceStrategy:', error);
            return 0;
        }
    }
}

// Vector-based Similarity Strategy
class VectorSimilarityStrategy extends PoseComparisonStrategy {
    constructor() {
        super();
        this.MIN_CONFIDENCE = 0.04;
    }

    getName() {
        return 'vector-similarity';
    }

    keypointsToObject(keypoints) {
        const keypointObj = {};
        keypoints.forEach(point => {
            if (point.class && point.confidence >= this.MIN_CONFIDENCE) {
                keypointObj[point.class] = point;
            }
        });
        return keypointObj;
    }

    // Calculate distance between two points
    distance(p1, p2) {
        if (!p1 || !p2) return null;
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    // Calculate angle between three points (in radians)
    angle(p1, p2, p3) {
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

    // Extract feature vector from pose
    extractFeatureVector(keypointObj) {
        const features = [];
        
        // Joint angles (most important features)
        const leftArmAngle = this.angle(
            keypointObj.left_shoulder, 
            keypointObj.left_elbow, 
            keypointObj.left_wrist
        );
        const rightArmAngle = this.angle(
            keypointObj.right_shoulder, 
            keypointObj.right_elbow, 
            keypointObj.right_wrist
        );
        const leftLegAngle = this.angle(
            keypointObj.left_hip, 
            keypointObj.left_knee, 
            keypointObj.left_ankle
        );
        const rightLegAngle = this.angle(
            keypointObj.right_hip, 
            keypointObj.right_knee, 
            keypointObj.right_ankle
        );
        
        // Add angles to feature vector (normalized to 0-1)
        features.push(leftArmAngle ? leftArmAngle / Math.PI : 0);
        features.push(rightArmAngle ? rightArmAngle / Math.PI : 0);
        features.push(leftLegAngle ? leftLegAngle / Math.PI : 0);
        features.push(rightLegAngle ? rightLegAngle / Math.PI : 0);
        
        // Body proportions and ratios
        const shoulderWidth = this.distance(keypointObj.left_shoulder, keypointObj.right_shoulder);
        const hipWidth = this.distance(keypointObj.left_hip, keypointObj.right_hip);
        const leftArmLength = this.distance(keypointObj.left_shoulder, keypointObj.left_wrist);
        const rightArmLength = this.distance(keypointObj.right_shoulder, keypointObj.right_wrist);
        const leftLegLength = this.distance(keypointObj.left_hip, keypointObj.left_ankle);
        const rightLegLength = this.distance(keypointObj.right_hip, keypointObj.right_ankle);
        const torsoLength = this.distance(
            keypointObj.nose, 
            keypointObj.left_hip && keypointObj.right_hip ? 
                { x: (keypointObj.left_hip.x + keypointObj.right_hip.x) / 2,
                  y: (keypointObj.left_hip.y + keypointObj.right_hip.y) / 2 } : 
                null
        );
        
        // Normalize limb lengths by shoulder width (scale invariant)
        const scale = shoulderWidth || 100; // Fallback scale
        features.push(leftArmLength ? leftArmLength / scale : 0);
        features.push(rightArmLength ? rightArmLength / scale : 0);
        features.push(leftLegLength ? leftLegLength / scale : 0);
        features.push(rightLegLength ? rightLegLength / scale : 0);
        features.push(torsoLength ? torsoLength / scale : 0);
        
        // Body ratios
        features.push(shoulderWidth && hipWidth ? hipWidth / shoulderWidth : 1);
        features.push(leftArmLength && rightArmLength ? 
            Math.min(leftArmLength, rightArmLength) / Math.max(leftArmLength, rightArmLength) : 1);
        features.push(leftLegLength && rightLegLength ? 
            Math.min(leftLegLength, rightLegLength) / Math.max(leftLegLength, rightLegLength) : 1);
        
        // Shoulder and body tilt angles
        if (keypointObj.left_shoulder && keypointObj.right_shoulder) {
            const dx = keypointObj.right_shoulder.x - keypointObj.left_shoulder.x;
            const dy = keypointObj.right_shoulder.y - keypointObj.left_shoulder.y;
            features.push(Math.atan2(dy, dx) / Math.PI); // Normalized to -1 to 1
        } else {
            features.push(0);
        }
        
        // Head position relative to body center
        if (keypointObj.nose && keypointObj.left_shoulder && keypointObj.right_shoulder) {
            const bodyCenter = {
                x: (keypointObj.left_shoulder.x + keypointObj.right_shoulder.x) / 2,
                y: (keypointObj.left_shoulder.y + keypointObj.right_shoulder.y) / 2
            };
            const headOffset = {
                x: (keypointObj.nose.x - bodyCenter.x) / scale,
                y: (keypointObj.nose.y - bodyCenter.y) / scale
            };
            features.push(headOffset.x);
            features.push(headOffset.y);
        } else {
            features.push(0, 0);
        }
        
        return features;
    }

    // Calculate weighted similarity between two vectors
    weightedVectorSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) return 0;
        
        // Define weights for different feature types
        const featureWeights = [
            5.0, 5.0, // arm angles (most important)
            1.5, 1.5, // leg angles
            2.0, 2.0, 2.0, 2.0, 2.0, // limb lengths
            1.0, 2.0, 2.0, // body ratios
            3.0, // shoulder tilt
            1.0, 1.0  // head position
        ];
        
        let weightedDistance = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < Math.min(vec1.length, featureWeights.length); i++) {
            const weight = featureWeights[i] || 1.0;
            const diff = Math.abs(vec1[i] - vec2[i]);
            
            // Use exponential penalty for larger differences
            const penalty = Math.pow(diff, 1.5);
            weightedDistance += penalty * weight;
            totalWeight += weight;
        }
        
        if (totalWeight === 0) return 0;
        
        const averageDistance = weightedDistance / totalWeight;
        
        // Convert to similarity score with more aggressive penalty
        const maxDistance = 2.0; // Maximum expected difference
        const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        
        return similarity;
    }

    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        if (!playerKeypoints || playerKeypoints.length === 0 || 
            !targetKeypoints || targetKeypoints.length === 0) {
            return 0;
        }
        
        try {
            const playerObj = this.keypointsToObject(playerKeypoints);
            const targetObj = this.keypointsToObject(targetKeypoints);
            
            const playerVector = this.extractFeatureVector(playerObj);
            const targetVector = this.extractFeatureVector(targetObj);
            
            const similarity = this.weightedVectorSimilarity(playerVector, targetVector);
            
            return Math.round(Math.max(0, Math.min(100, similarity)));
            
        } catch (error) {
            console.error('Error in VectorSimilarityStrategy:', error);
            return 0;
        }
    }
}

// Hybrid Strategy combining multiple approaches
class HybridStrategy extends PoseComparisonStrategy {
    constructor() {
        super();
        this.enhancedStrategy = new EnhancedAngleStrategy();
        this.alignedStrategy = new AlignedDistanceStrategy();
        this.vectorStrategy = new VectorSimilarityStrategy();
        
        // Configurable weights for combining strategies
        this.weights = {
            enhanced: 0.5,    // Primary strategy - well-tested
            aligned: 0.3,     // Good for position alignment
            vector: 0.2       // Good for scale invariance
        };
        
        // Minimum difference threshold to trigger fallback logic
        this.DISAGREEMENT_THRESHOLD = 25; // If strategies differ by more than this, use fallback
    }

    getName() {
        return 'hybrid';
    }

    // Detect if strategies strongly disagree and use fallback logic
    detectDisagreement(scores) {
        const values = Object.values(scores);
        const max = Math.max(...values);
        const min = Math.min(...values);
        return (max - min) > this.DISAGREEMENT_THRESHOLD;
    }

    // Fallback strategy when there's strong disagreement
    fallbackStrategy(scores, playerKeypoints, targetKeypoints) {
        // Check data quality first
        const playerQuality = this.assessDataQuality(playerKeypoints);
        const targetQuality = this.assessDataQuality(targetKeypoints);
        
        // If data quality is poor, favor the aligned distance strategy
        if (playerQuality < 0.5 || targetQuality < 0.5) {
            return scores.aligned;
        }
        
        // If good quality data but disagreement, use weighted average with bias toward enhanced
        return (scores.enhanced * 0.6) + (scores.aligned * 0.25) + (scores.vector * 0.15);
    }

    // Assess quality of keypoint data
    assessDataQuality(keypoints) {
        if (!keypoints || keypoints.length === 0) return 0;
        
        const totalConfidence = keypoints.reduce((sum, point) => sum + (point.confidence || 0), 0);
        const averageConfidence = totalConfidence / keypoints.length;
        
        // Count important keypoints (arms and shoulders)
        const importantKeypoints = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'];
        const availableImportant = keypoints.filter(point => 
            importantKeypoints.includes(point.class) && point.confidence > 0.04
        ).length;
        
        const importantRatio = availableImportant / importantKeypoints.length;
        
        // Combine confidence and availability
        return (averageConfidence * 0.6) + (importantRatio * 0.4);
    }

    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        if (!playerKeypoints || playerKeypoints.length === 0 || 
            !targetKeypoints || targetKeypoints.length === 0) {
            return 0;
        }
        
        try {
            // Run all strategies
            const scores = {
                enhanced: this.enhancedStrategy.calculatePoseSimilarity(playerKeypoints, targetKeypoints),
                aligned: this.alignedStrategy.calculatePoseSimilarity(playerKeypoints, targetKeypoints),
                vector: this.vectorStrategy.calculatePoseSimilarity(playerKeypoints, targetKeypoints)
            };
            
            // Check for strong disagreement
            if (this.detectDisagreement(scores)) {
                const fallbackScore = this.fallbackStrategy(scores, playerKeypoints, targetKeypoints);
                return Math.round(Math.max(0, Math.min(100, fallbackScore)));
            }
            
            // Normal weighted combination
            const hybridScore = 
                (scores.enhanced * this.weights.enhanced) +
                (scores.aligned * this.weights.aligned) +
                (scores.vector * this.weights.vector);
            
            return Math.round(Math.max(0, Math.min(100, hybridScore)));
            
        } catch (error) {
            console.error('Error in HybridStrategy:', error);
            // Fallback to enhanced strategy on error
            return this.enhancedStrategy.calculatePoseSimilarity(playerKeypoints, targetKeypoints);
        }
    }

    // Method to adjust weights at runtime if needed
    setWeights(enhanced, aligned, vector) {
        // Ensure weights sum to 1
        const total = enhanced + aligned + vector;
        if (total > 0) {
            this.weights.enhanced = enhanced / total;
            this.weights.aligned = aligned / total;
            this.weights.vector = vector / total;
        }
    }
}

// Strategy Factory for creating pose comparison instances
class PoseComparisonFactory {
    static strategies = {
        'enhanced-angle': EnhancedAngleStrategy,
        'aligned-distance': AlignedDistanceStrategy,
        'vector-similarity': VectorSimilarityStrategy,
        'hybrid': HybridStrategy
    };
    
    static defaultStrategy = 'enhanced-angle';
    
    static create(strategyName = null) {
        const strategy = strategyName || this.defaultStrategy;
        const StrategyClass = this.strategies[strategy];
        
        if (!StrategyClass) {
            console.warn(`Unknown pose comparison strategy: ${strategy}. Using default: ${this.defaultStrategy}`);
            const DefaultStrategyClass = this.strategies[this.defaultStrategy];
            return new DefaultStrategyClass();
        }
        
        return new StrategyClass();
    }
    
    static getAvailableStrategies() {
        return Object.keys(this.strategies);
    }
    
    static setDefaultStrategy(strategyName) {
        if (this.strategies[strategyName]) {
            this.defaultStrategy = strategyName;
        } else {
            console.warn(`Cannot set unknown strategy as default: ${strategyName}`);
        }
    }
}

// Backward compatibility: PoseComparison class that uses factory
class PoseComparison {
    constructor(strategyName = null) {
        this.strategy = PoseComparisonFactory.create(strategyName);
    }
    
    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        return this.strategy.calculatePoseSimilarity(playerKeypoints, targetKeypoints);
    }
    
    getName() {
        return this.strategy.getName();
    }
    
    // Method to switch strategy at runtime
    setStrategy(strategyName) {
        this.strategy = PoseComparisonFactory.create(strategyName);
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoseComparison;
} else if (typeof window !== 'undefined') {
    window.PoseComparison = PoseComparison;
}