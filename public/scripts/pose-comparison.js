/**
 * Pose Comparison Strategies
 * Hand-aware pose matching algorithm using keypoints and hand detection
 * 
 * Updated with:
 * - Discrete angle scoring: Each π/12 (15 degrees) difference has a fixed score
 * - Added shoulder-hip-elbow angle measurement with same weight as arm angles
 * - Rebalanced weights: Arms (40%), Shoulder-Hip (40%), Head (10%), Body (10%)
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

// Hand-aware Angle Strategy that combines keypoints, hand position and hand class
class HandAwareAngleStrategy extends PoseComparisonStrategy {
    constructor() {
        super();
        this.MIN_CONFIDENCE = 0.04;
    }

    getName() {
        return 'hand-aware-angle';
    }

    /**
     * Calculate similarity between target and player photo results
     * @param {Object} targetPhotoResult - Full API response for target including hand_predictions and keypoint_predictions
     * @param {Object} playerPhotoResult - Full API response for player including hand_predictions and keypoint_predictions
     * @param {number} handWeight - Weight for hand detection score (0-1), default 0.1
     * @param {Array<string>} excludedKeypoints - Array of keypoint names to exclude from comparison
     * @returns {number} Similarity score 0-100
     */
    calculateSimilarity(targetPhotoResult, playerPhotoResult, handWeight = 0.1, excludedKeypoints = []) {
        if (!targetPhotoResult || !playerPhotoResult) {
            return 0;
        }

        // Extract keypoints from the full results
        const targetKeypoints = this.extractKeypoints(targetPhotoResult);
        const playerKeypoints = this.extractKeypoints(playerPhotoResult);

        if (!targetKeypoints.length || !playerKeypoints.length) {
            return 0;
        }

        // Calculate angle-based similarity (weighted components)
        const angleSimilarity = this.calculateAngleBasedSimilarity(
            targetKeypoints, 
            playerKeypoints, 
            excludedKeypoints
        );

        // Calculate hand detection similarity
        const handSimilarity = this.calculateHandSimilarity(
            this.extractHandPredictions(targetPhotoResult),
            this.extractHandPredictions(playerPhotoResult),
            targetKeypoints,
            playerKeypoints
        );

        // Combine scores with weights
        const angleWeight = 1 - handWeight;
        const totalScore = (angleSimilarity * angleWeight) + (handSimilarity * handWeight);

        return Math.round(Math.max(0, Math.min(100, totalScore)));
    }

    /**
     * Extract keypoints from API response
     */
    extractKeypoints(photoResult) {
        // New API structure: keypoint_predictions.predictions[0].keypoints
        if (photoResult.keypoint_predictions && 
            photoResult.keypoint_predictions.predictions &&
            photoResult.keypoint_predictions.predictions.length > 0) {
            
            const prediction = photoResult.keypoint_predictions.predictions[0];
            if (prediction && prediction.keypoints) {
                return prediction.keypoints;
            }
        }

        // Handle outputs structure which might contain new or old format
        if (photoResult && photoResult.outputs && photoResult.outputs.length > 0) {
            const output = photoResult.outputs[0];
            
            // Check if outputs[0] contains new API structure
            if (output.keypoint_predictions && 
                output.keypoint_predictions.predictions &&
                output.keypoint_predictions.predictions.length > 0) {
                
                const prediction = output.keypoint_predictions.predictions[0];
                if (prediction && prediction.keypoints) {
                    return prediction.keypoints;
                }
            }
            
            // Check for keypoints in model_predictions structure (old format)
            if (output.model_predictions && output.model_predictions.predictions) {
                const prediction = output.model_predictions.predictions;
                if (prediction && prediction[0] && prediction[0].keypoints) {
                    return prediction[0].keypoints;
                }
            }

            // Look for keypoints directly in output (old format)
            if (output.keypoints) {
                return output.keypoints;
            }
        }

        return [];
    }

    /**
     * Extract hand predictions from API response
     */
    extractHandPredictions(photoResult) {
        // New API structure: hand_predictions
        if (photoResult && photoResult.hand_predictions) {
            return photoResult.hand_predictions;
        }

        // Handle outputs structure which might contain new format
        if (photoResult && photoResult.outputs && photoResult.outputs.length > 0) {
            const output = photoResult.outputs[0];
            if (output.hand_predictions) {
                return output.hand_predictions;
            }
        }

        // Legacy fallback: return empty structure
        return { predictions: [] };
    }

    /**
     * Convert keypoints array to object with filtering
     */
    keypointsToObject(keypoints, excludedKeypoints = []) {
        const keypointObj = {};
        keypoints.forEach(point => {
            if (point.class && 
                point.confidence >= this.MIN_CONFIDENCE &&
                !excludedKeypoints.includes(point.class)) {
                keypointObj[point.class] = point;
            }
        });
        return keypointObj;
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
     * Calculate angle of a line relative to horizontal
     */
    calculateHorizontalAngle(p1, p2) {
        if (!p1 || !p2) return null;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.atan2(dy, dx);
    }

    /**
     * Calculate angle-based similarity with weighted components
     */
    calculateAngleBasedSimilarity(targetKeypoints, playerKeypoints, excludedKeypoints) {
        const targetObj = this.keypointsToObject(targetKeypoints, excludedKeypoints);
        const playerObj = this.keypointsToObject(playerKeypoints, excludedKeypoints);

        let totalWeightedScore = 0;
        let totalWeight = 0;
        
        // Track individual component scores for logging
        const componentScores = {
            arms: [],
            shoulderHips: [],
            head: null,
            shoulders: null,
            body: []
        };

        // 1. Wrist-Elbow-Shoulder angles (40% weight total, 20% each arm)
        const armAngles = [
            { 
                name: 'left_arm',
                angle: this.calculateAngle(
                    targetObj.left_wrist, 
                    targetObj.left_elbow, 
                    targetObj.left_shoulder
                ),
                playerAngle: this.calculateAngle(
                    playerObj.left_wrist,
                    playerObj.left_elbow,
                    playerObj.left_shoulder
                ),
                weight: 0.2
            },
            {
                name: 'right_arm',
                angle: this.calculateAngle(
                    targetObj.right_wrist,
                    targetObj.right_elbow,
                    targetObj.right_shoulder
                ),
                playerAngle: this.calculateAngle(
                    playerObj.right_wrist,
                    playerObj.right_elbow,
                    playerObj.right_shoulder
                ),
                weight: 0.2
            }
        ];

        // 2. Elbow-Shoulder-Hip angles (40% weight total, 20% each side)
        const shoulderHipAngles = [
            {
                name: 'left_shoulder_hip',
                angle: this.calculateAngle(
                    targetObj.left_elbow,
                    targetObj.left_shoulder,
                    targetObj.left_hip
                ),
                playerAngle: this.calculateAngle(
                    playerObj.left_elbow,
                    playerObj.left_shoulder,
                    playerObj.left_hip
                ),
                weight: 0.05
            },
            {
                name: 'right_shoulder_hip',
                angle: this.calculateAngle(
                    targetObj.right_elbow,
                    targetObj.right_shoulder,
                    targetObj.right_hip
                ),
                playerAngle: this.calculateAngle(
                    playerObj.right_elbow,
                    playerObj.right_shoulder,
                    playerObj.right_hip
                ),
                weight: 0.05
            }
        ];

        // 2. Head tilt angle (10% weight)
        const headTiltTarget = this.calculateHorizontalAngle(
            targetObj.left_eye,
            targetObj.right_eye
        );
        const headTiltPlayer = this.calculateHorizontalAngle(
            playerObj.left_eye,
            playerObj.right_eye
        );
        
        if (headTiltTarget !== null && headTiltPlayer !== null) {
            const headAngleDiff = Math.abs(headTiltTarget - headTiltPlayer);
            const headScore = this.angleToSimilarity(headAngleDiff);
            const headWeightedScore = headScore * 0.1;
            totalWeightedScore += headWeightedScore;
            totalWeight += 0.1;
            
            // Log head tilt details
            componentScores.head = {
                name: 'head_tilt',
                angleDiff: ((headAngleDiff * 180) / Math.PI).toFixed(1),
                score: (headScore * 100).toFixed(1),
                weight: 0.1,
                weightedContribution: (headWeightedScore * 100).toFixed(1)
            };
        }

        // 3. Shoulder angle to horizontal (10% weight)
        const shoulderAngleTarget = this.calculateHorizontalAngle(
            targetObj.left_shoulder,
            targetObj.right_shoulder
        );
        const shoulderAnglePlayer = this.calculateHorizontalAngle(
            playerObj.left_shoulder,
            playerObj.right_shoulder
        );

        if (shoulderAngleTarget !== null && shoulderAnglePlayer !== null) {
            const shoulderAngleDiff = Math.abs(shoulderAngleTarget - shoulderAnglePlayer);
            const shoulderScore = this.angleToSimilarity(shoulderAngleDiff);
            const shoulderWeightedScore = shoulderScore * 0.1;
            totalWeightedScore += shoulderWeightedScore;
            totalWeight += 0.1;
            
            // Log shoulder angle details
            componentScores.shoulders = {
                name: 'shoulder_angle',
                angleDiff: ((shoulderAngleDiff * 180) / Math.PI).toFixed(1),
                score: (shoulderScore * 100).toFixed(1),
                weight: 0.1,
                weightedContribution: (shoulderWeightedScore * 100).toFixed(1)
            };
        }

        // 4. Shoulder to hip angles (10% weight total, 5% each side)
        const bodyAngles = [
            {
                name: 'right_body',
                angle: this.calculateHorizontalAngle(
                    targetObj.right_shoulder,
                    targetObj.right_hip
                ),
                playerAngle: this.calculateHorizontalAngle(
                    playerObj.right_shoulder,
                    playerObj.right_hip
                ),
                weight: 0.05
            },
            {
                name: 'left_body',
                angle: this.calculateHorizontalAngle(
                    targetObj.left_shoulder,
                    targetObj.left_hip
                ),
                playerAngle: this.calculateHorizontalAngle(
                    playerObj.left_shoulder,
                    playerObj.left_hip
                ),
                weight: 0.05
            }
        ];

        // Process arm angle comparisons
        armAngles.forEach(angleData => {
            if (angleData.angle !== null && angleData.playerAngle !== null) {
                let angleDiff = Math.abs(angleData.angle - angleData.playerAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }
                const score = this.angleToSimilarity(angleDiff);
                const weightedScore = score * angleData.weight;
                totalWeightedScore += weightedScore;
                totalWeight += angleData.weight;
                
                // Log arm angle details
                const angleDiffDegrees = (angleDiff * 180) / Math.PI;
                componentScores.arms.push({
                    name: angleData.name,
                    angleDiff: angleDiffDegrees.toFixed(1),
                    score: (score * 100).toFixed(1),
                    weight: angleData.weight,
                    weightedContribution: (weightedScore * 100).toFixed(1)
                });
            }
        });

        // Process shoulder-hip angle comparisons
        shoulderHipAngles.forEach(angleData => {
            if (angleData.angle !== null && angleData.playerAngle !== null) {
                let angleDiff = Math.abs(angleData.angle - angleData.playerAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }
                const score = this.angleToSimilarity(angleDiff);
                const weightedScore = score * angleData.weight;
                totalWeightedScore += weightedScore;
                totalWeight += angleData.weight;
                
                // Log shoulder-hip angle details
                const angleDiffDegrees = (angleDiff * 180) / Math.PI;
                componentScores.shoulderHips.push({
                    name: angleData.name,
                    angleDiff: angleDiffDegrees.toFixed(1),
                    score: (score * 100).toFixed(1),
                    weight: angleData.weight,
                    weightedContribution: (weightedScore * 100).toFixed(1)
                });
            }
        });

        // Process body angle comparisons
        bodyAngles.forEach(angleData => {
            if (angleData.angle !== null && angleData.playerAngle !== null) {
                let angleDiff = Math.abs(angleData.angle - angleData.playerAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }
                const score = this.angleToSimilarity(angleDiff);
                const weightedScore = score * angleData.weight;
                totalWeightedScore += weightedScore;
                totalWeight += angleData.weight;
                
                // Log body angle details
                const angleDiffDegrees = (angleDiff * 180) / Math.PI;
                componentScores.body.push({
                    name: angleData.name,
                    angleDiff: angleDiffDegrees.toFixed(1),
                    score: (score * 100).toFixed(1),
                    weight: angleData.weight,
                    weightedContribution: (weightedScore * 100).toFixed(1)
                });
            }
        });

        if (totalWeight === 0) return 0;

        // Normalize to percentage
        const finalScore = (totalWeightedScore / totalWeight) * 100;
        
        // Log comprehensive pose comparison summary
        console.log('🎯 Pose Comparison Breakdown:');
        console.log('================================');
        
        // Log arm angles
        if (componentScores.arms.length > 0) {
            console.log('💪 ARM ANGLES (40% total weight):');
            componentScores.arms.forEach(arm => {
                console.log(`  ${arm.name}: ${arm.angleDiff}° diff → ${arm.score}% (weight: ${arm.weight}, contribution: ${arm.weightedContribution}%)`);
            });
        }
        
        // Log shoulder-hip angles
        if (componentScores.shoulderHips.length > 0) {
            console.log('🦴 SHOULDER-HIP ANGLES (40% total weight):');
            componentScores.shoulderHips.forEach(sh => {
                console.log(`  ${sh.name}: ${sh.angleDiff}° diff → ${sh.score}% (weight: ${sh.weight}, contribution: ${sh.weightedContribution}%)`);
            });
        }
        
        // Log head tilt
        if (componentScores.head) {
            console.log('👤 HEAD TILT (10% weight):');
            console.log(`  ${componentScores.head.name}: ${componentScores.head.angleDiff}° diff → ${componentScores.head.score}% (contribution: ${componentScores.head.weightedContribution}%)`);
        }
        
        // Log shoulder angle
        if (componentScores.shoulders) {
            console.log('🤷 SHOULDER ANGLE (10% weight):');
            console.log(`  ${componentScores.shoulders.name}: ${componentScores.shoulders.angleDiff}° diff → ${componentScores.shoulders.score}% (contribution: ${componentScores.shoulders.weightedContribution}%)`);
        }
        
        // Log body angles
        if (componentScores.body.length > 0) {
            console.log('🧍 BODY ANGLES (10% total weight):');
            componentScores.body.forEach(body => {
                console.log(`  ${body.name}: ${body.angleDiff}° diff → ${body.score}% (weight: ${body.weight}, contribution: ${body.weightedContribution}%)`);
            });
        }
        
        console.log('================================');
        console.log(`📊 FINAL SCORE: ${finalScore.toFixed(1)}% (total weight used: ${totalWeight.toFixed(2)})`);
        console.log('================================\n');
        
        return finalScore;
    }

    /**
     * Convert angle difference to similarity score using discrete strategy
     * Each π/12 (15 degrees) difference has a fixed score
     */
    angleToSimilarity(angleDiff) {
        // Convert angle difference to degrees
        const angleDiffDegrees = (angleDiff * 180) / Math.PI;
        
        // Define discrete score thresholds (π/12 = 15 degrees)
        const discreteScores = [
            { threshold: 0, score: 1.0 },      // 0-15 degrees: 100%
            { threshold: 15, score: 0.8 },     // 15-30 degrees: 90%
            { threshold: 30, score: 0.6 },     // 30-45 degrees: 80%
            { threshold: 45, score: 0.3 },     // 45-60 degrees: 70%
            { threshold: 60, score: 0.1 },     // 60-75 degrees: 60%
            { threshold: 75, score: 0 },     // 75-90 degrees: 50%     // 150+ degrees: 0%
        ];
        
        // Find the appropriate score based on angle difference
        for (let i = discreteScores.length - 1; i >= 0; i--) {
            if (angleDiffDegrees >= discreteScores[i].threshold) {
                return discreteScores[i].score;
            }
        }
        
        return 0.0; // Fallback for very large differences
    }

    /**
     * Calculate hand detection similarity
     */
    calculateHandSimilarity(targetHands, playerHands, targetKeypoints, playerKeypoints) {
        if (!targetHands || !playerHands || 
            !targetHands.predictions || !playerHands.predictions) {
            return 50; // Neutral score if no hands detected
        }

        const targetHandPreds = targetHands.predictions;
        const playerHandPreds = playerHands.predictions;

        if (targetHandPreds.length === 0 && playerHandPreds.length === 0) {
            return 100; // Both have no hands - perfect match
        }

        if (targetHandPreds.length === 0 || playerHandPreds.length === 0) {
            return 0; // One has hands, other doesn't - no match
        }

        // Get body scale for normalization
        const targetScale = this.getBodyScale(targetKeypoints);
        const playerScale = this.getBodyScale(playerKeypoints);

        let totalScore = 0;
        let matchCount = 0;

        // Match hands by finding closest pairs
        targetHandPreds.forEach(targetHand => {
            const bestMatch = this.findBestHandMatch(
                targetHand, 
                playerHandPreds, 
                targetScale, 
                playerScale
            );

            if (bestMatch) {
                totalScore += bestMatch.score;
                matchCount++;
            }
        });

        if (matchCount === 0) return 0;

        return totalScore / matchCount;
    }

    /**
     * Get body scale for normalization
     */
    getBodyScale(keypoints) {
        const keypointObj = this.keypointsToObject(keypoints);
        
        // Try shoulder width first
        if (keypointObj.left_shoulder && keypointObj.right_shoulder) {
            const shoulderWidth = Math.sqrt(
                Math.pow(keypointObj.left_shoulder.x - keypointObj.right_shoulder.x, 2) +
                Math.pow(keypointObj.left_shoulder.y - keypointObj.right_shoulder.y, 2)
            );
            return shoulderWidth || 100;
        }

        // Fallback to image dimensions
        return 100;
    }

    /**
     * Find best matching hand between target and player
     */
    findBestHandMatch(targetHand, playerHands, targetScale, playerScale) {
        let bestMatch = null;
        let bestScore = 0;

        playerHands.forEach(playerHand => {
            // Calculate position similarity (normalized)
            const targetNormX = targetHand.x / targetScale;
            const targetNormY = targetHand.y / targetScale;
            const playerNormX = playerHand.x / playerScale;
            const playerNormY = playerHand.y / playerScale;

            const distance = Math.sqrt(
                Math.pow(targetNormX - playerNormX, 2) +
                Math.pow(targetNormY - playerNormY, 2)
            );

            // Position score (50% of hand score)
            const maxDistance = 2.0; // Normalized distance threshold
            const positionScore = Math.max(0, 1 - (distance / maxDistance)) * 50;

            // Class score (50% of hand score)
            const classScore = (targetHand.class === playerHand.class) ? 50 : 0;

            const totalScore = positionScore + classScore;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMatch = {
                    hand: playerHand,
                    score: totalScore
                };
            }
        });

        return bestMatch;
    }

    /**
     * Legacy method for backward compatibility with PoseComparison interface
     */
    calculatePoseSimilarity(playerKeypoints, targetKeypoints) {
        // Direct calculation without creating fake API response objects
        const angleSimilarity = this.calculateAngleBasedSimilarity(
            targetKeypoints, 
            playerKeypoints, 
            []  // excludedKeypoints
        );
        
        // No hands in legacy format, so hand similarity is neutral (50%)
        // Using default handWeight of 0.1
        const handWeight = 0.1;
        const angleWeight = 1 - handWeight;
        const totalScore = (angleSimilarity * angleWeight) + (50 * handWeight);
        
        return Math.round(Math.max(0, Math.min(100, totalScore)));
    }
}

// PoseComparison class - simplified without factory pattern
class PoseComparison extends HandAwareAngleStrategy {
    constructor() {
        super();
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoseComparison;
} else if (typeof window !== 'undefined') {
    window.PoseComparison = PoseComparison;
}