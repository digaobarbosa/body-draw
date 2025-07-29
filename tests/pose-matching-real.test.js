const PoseComparison = require('../scripts/pose-comparison.js');

// Real pose data from the application
const targetKeypoints = [
    {
        "x": 294,
        "y": 69,
        "confidence": 0.9976822137832642,
        "class": "nose"
    },
    {
        "x": 319,
        "y": 54,
        "confidence": 0.9944674968719482,
        "class": "left_eye"
    },
    {
        "x": 265,
        "y": 54,
        "confidence": 0.9926283359527588,
        "class": "right_eye"
    },
    {
        "x": 347,
        "y": 83,
        "confidence": 0.959003210067749,
        "class": "left_ear"
    },
    {
        "x": 225,
        "y": 84,
        "confidence": 0.9387381076812744,
        "class": "right_ear"
    },
    {
        "x": 432,
        "y": 226,
        "confidence": 0.9941136240959167,
        "class": "left_shoulder"
    },
    {
        "x": 142,
        "y": 233,
        "confidence": 0.998145580291748,
        "class": "right_shoulder"
    },
    {
        "x": 482,
        "y": 363,
        "confidence": 0.26968497037887573,
        "class": "left_elbow"
    },
    {
        "x": 76,
        "y": 379,
        "confidence": 0.4565125107765198,
        "class": "right_elbow"
    },
    {
        "x": 434,
        "y": 354,
        "confidence": 0.17105746269226074,
        "class": "left_wrist"
    },
    {
        "x": 92,
        "y": 370,
        "confidence": 0.23262327909469604,
        "class": "right_wrist"
    },
    {
        "x": 377,
        "y": 392,
        "confidence": 0.014100223779678345,
        "class": "left_hip"
    },
    {
        "x": 222,
        "y": 392,
        "confidence": 0.022234588861465454,
        "class": "right_hip"
    },
    {
        "x": 301,
        "y": 392,
        "confidence": 0.0004132390022277832,
        "class": "left_knee"
    },
    {
        "x": 210,
        "y": 359,
        "confidence": 0.0005424022674560547,
        "class": "right_knee"
    },
    {
        "x": 261,
        "y": 392,
        "confidence": 0.00005385279655456543,
        "class": "left_ankle"
    },
    {
        "x": 364,
        "y": 344,
        "confidence": 0.00007221102714538574,
        "class": "right_ankle"
    }
]

const playerKeypoints = [
    {
        "x": 348,
        "y": 280,
        "confidence": 0.9824920296669006,
        "class": "nose"
    },
    {
        "x": 370,
        "y": 268,
        "confidence": 0.9831303358078003,
        "class": "left_eye"
    },
    {
        "x": 321,
        "y": 266,
        "confidence": 0.9816979169845581,
        "class": "right_eye"
    },
    {
        "x": 392,
        "y": 300,
        "confidence": 0.9049399495124817,
        "class": "left_ear"
    },
    {
        "x": 282,
        "y": 297,
        "confidence": 0.9109987616539001,
        "class": "right_ear"
    },
    {
        "x": 480,
        "y": 440,
        "confidence": 0.8930359482765198,
        "class": "left_shoulder"
    },
    {
        "x": 197,
        "y": 448,
        "confidence": 0.9261484146118164,
        "class": "right_shoulder"
    },
    {
        "x": 550,
        "y": 480,
        "confidence": 0.017078667879104614,
        "class": "left_elbow"
    },
    {
        "x": 150,
        "y": 480,
        "confidence": 0.019402623176574707,
        "class": "right_elbow"
    },
    {
        "x": 504,
        "y": 474,
        "confidence": 0.015526413917541504,
        "class": "left_wrist"
    },
    {
        "x": 177,
        "y": 478,
        "confidence": 0.01637229323387146,
        "class": "right_wrist"
    },
    {
        "x": 437,
        "y": 480,
        "confidence": 0.002557903528213501,
        "class": "left_hip"
    },
    {
        "x": 298,
        "y": 480,
        "confidence": 0.0028565824031829834,
        "class": "right_hip"
    },
    {
        "x": 363,
        "y": 480,
        "confidence": 0.0020241141319274902,
        "class": "left_knee"
    },
    {
        "x": 293,
        "y": 465,
        "confidence": 0.002097219228744507,
        "class": "right_knee"
    },
    {
        "x": 333,
        "y": 480,
        "confidence": 0.002175062894821167,
        "class": "left_ankle"
    },
    {
        "x": 463,
        "y": 441,
        "confidence": 0.0025222301483154297,
        "class": "right_ankle"
    }
]


const bad_playerKeypoints = [
    {
        "x": 334,
        "y": 309,
        "confidence": 0.9818493127822876,
        "class": "nose"
    },
    {
        "x": 355,
        "y": 297,
        "confidence": 0.9869800806045532,
        "class": "left_eye"
    },
    {
        "x": 309,
        "y": 297,
        "confidence": 0.9273889064788818,
        "class": "right_eye"
    },
    {
        "x": 382,
        "y": 325,
        "confidence": 0.9433396458625793,
        "class": "left_ear"
    },
    {
        "x": 278,
        "y": 330,
        "confidence": 0.5341580510139465,
        "class": "right_ear"
    },
    {
        "x": 445,
        "y": 409,
        "confidence": 0.9517783522605896,
        "class": "left_shoulder"
    },
    {
        "x": 219,
        "y": 477,
        "confidence": 0.821163535118103,
        "class": "right_shoulder"
    },
    {
        "x": 457,
        "y": 294,
        "confidence": 0.5939393639564514,
        "class": "left_elbow"
    },
    {
        "x": 181,
        "y": 480,
        "confidence": 0.04852035641670227,
        "class": "right_elbow"
    },
    {
        "x": 333,
        "y": 235,
        "confidence": 0.68120276927948,
        "class": "left_wrist"
    },
    {
        "x": 210,
        "y": 410,
        "confidence": 0.1898905634880066,
        "class": "right_wrist"
    },
    {
        "x": 458,
        "y": 480,
        "confidence": 0.03624269366264343,
        "class": "left_hip"
    },
    {
        "x": 338,
        "y": 480,
        "confidence": 0.012970715761184692,
        "class": "right_hip"
    },
    {
        "x": 423,
        "y": 442,
        "confidence": 0.014187216758728027,
        "class": "left_knee"
    },
    {
        "x": 292,
        "y": 426,
        "confidence": 0.0039001405239105225,
        "class": "right_knee"
    },
    {
        "x": 356,
        "y": 475,
        "confidence": 0.006814241409301758,
        "class": "left_ankle"
    },
    {
        "x": 397,
        "y": 429,
        "confidence": 0.0032599270343780518,
        "class": "right_ankle"
    }
];


const targetKeypointsArms = [
    {
        "x": 339,
        "y": 204,
        "confidence": 0.9966944456100464,
        "class": "nose"
    },
    {
        "x": 358,
        "y": 190,
        "confidence": 0.9940768480300903,
        "class": "left_eye"
    },
    {
        "x": 313,
        "y": 194,
        "confidence": 0.9754194617271423,
        "class": "right_eye"
    },
    {
        "x": 389,
        "y": 212,
        "confidence": 0.9342072010040283,
        "class": "left_ear"
    },
    {
        "x": 288,
        "y": 224,
        "confidence": 0.4340026080608368,
        "class": "right_ear"
    },
    {
        "x": 467,
        "y": 312,
        "confidence": 0.9734680652618408,
        "class": "left_shoulder"
    },
    {
        "x": 250,
        "y": 312,
        "confidence": 0.9346153736114502,
        "class": "right_shoulder"
    },
    {
        "x": 561,
        "y": 227,
        "confidence": 0.9388352632522583,
        "class": "left_elbow"
    },
    {
        "x": 172,
        "y": 204,
        "confidence": 0.769795835018158,
        "class": "right_elbow"
    },
    {
        "x": 383,
        "y": 135,
        "confidence": 0.98785400390625,
        "class": "left_wrist"
    },
    {
        "x": 290,
        "y": 128,
        "confidence": 0.9542006850242615,
        "class": "right_wrist"
    },
    {
        "x": 453,
        "y": 480,
        "confidence": 0.372771680355072,
        "class": "left_hip"
    },
    {
        "x": 318,
        "y": 480,
        "confidence": 0.27143657207489014,
        "class": "right_hip"
    },
    {
        "x": 420,
        "y": 449,
        "confidence": 0.0048510730266571045,
        "class": "left_knee"
    },
    {
        "x": 262,
        "y": 445,
        "confidence": 0.0026229023933410645,
        "class": "right_knee"
    },
    {
        "x": 446,
        "y": 480,
        "confidence": 0.0004513859748840332,
        "class": "left_ankle"
    },
    {
        "x": 377,
        "y": 473,
        "confidence": 0.000299990177154541,
        "class": "right_ankle"
    }
]


describe('Real Pose Data Tests', () => {
    let poseComparison;
    
    beforeEach(() => {
        poseComparison = new PoseComparison();
    });
    
    test('should achieve at least 80% similarity for identical poses', () => {
        const similarity = poseComparison.calculatePoseSimilarity(playerKeypoints, targetKeypoints);
        
        console.log(`Real pose similarity: ${similarity}%`);
        expect(similarity).toBeGreaterThanOrEqual(80);
    });
    
    test('should achieve around 60% similarity for bad poses', () => {
        const similarity = poseComparison.calculatePoseSimilarity(bad_playerKeypoints, targetKeypoints);
        
        console.log(`Bad pose similarity: ${similarity}%`);
        expect(similarity).toBeGreaterThanOrEqual(40);
        expect(similarity).toBeLessThanOrEqual(70);
    });
    
    test('should convert keypoints to object correctly', () => {
        const playerObj = poseComparison.keypointsToObject(playerKeypoints);
        const targetObj = poseComparison.keypointsToObject(targetKeypoints);
        
        // Should include high-confidence keypoints
        expect(playerObj.nose).toBeDefined();
        expect(playerObj.left_shoulder).toBeDefined();
        expect(playerObj.right_shoulder).toBeDefined();
        expect(targetObj.nose).toBeDefined();
        expect(targetObj.left_shoulder).toBeDefined();
        expect(targetObj.right_shoulder).toBeDefined();
        
        // Should exclude very low-confidence keypoints
        expect(playerObj.left_ankle).toBeUndefined(); // confidence 0.002
        expect(targetObj.left_ankle).toBeUndefined(); // confidence 0.00005
    });
    
    test('should calculate center hip correctly', () => {
        const playerObj = poseComparison.keypointsToObject(playerKeypoints);
        const centerHip = poseComparison.getCenterHip(playerObj);
        
        // Should return null because hip confidence is too low
        expect(centerHip).toBeNull();
    });
    
    test('should normalize keypoints relative to body center', () => {
        const playerObj = poseComparison.keypointsToObject(playerKeypoints);
        const normalized = poseComparison.normalizeKeypoints(playerObj);
        
        expect(normalized.nose).toBeDefined();
        expect(normalized.left_shoulder).toBeDefined();
        expect(normalized.right_shoulder).toBeDefined();
        
        // Normalized coordinates should be relative to body center
        expect(typeof normalized.nose.x).toBe('number');
        expect(typeof normalized.nose.y).toBe('number');
    });
    
    test('should extract pose angles correctly', () => {
        const playerObj = poseComparison.keypointsToObject(playerKeypoints);
        const normalized = poseComparison.normalizeKeypoints(playerObj);
        const angles = poseComparison.extractPoseAngles(normalized);
        
        // Should extract some angles even if not all keypoints are available
        expect(typeof angles).toBe('object');
        
        // Check for shoulder tilt (should be calculated since we have shoulders)
        if (angles.shoulder_tilt !== null) {
            expect(typeof angles.shoulder_tilt).toBe('number');
        }
    });
    
    test('should handle empty keypoints gracefully', () => {
        const similarity1 = poseComparison.calculatePoseSimilarity([], targetKeypoints);
        const similarity2 = poseComparison.calculatePoseSimilarity(playerKeypoints, []);
        const similarity3 = poseComparison.calculatePoseSimilarity([], []);
        
        expect(similarity1).toBe(0);
        expect(similarity2).toBe(0);
        expect(similarity3).toBe(0);
    });
    
    test('should handle low confidence keypoints by filtering them out', () => {
        // Create low-confidence version of player keypoints
        const lowConfidenceKeypoints = playerKeypoints.map(kp => ({
            ...kp,
            confidence: 0.03 // Below threshold of 0.04
        }));
        
        const similarity = poseComparison.calculatePoseSimilarity(lowConfidenceKeypoints, targetKeypoints);
        expect(similarity).toBe(0);
    });
    
    test('should work with mixed confidence keypoints', () => {
        // Keep only high-confidence keypoints for both poses
        const highConfidencePlayer = playerKeypoints.filter(kp => kp.confidence >= 0.8);
        const highConfidenceTarget = targetKeypoints.filter(kp => kp.confidence >= 0.8);
        
        const similarity = poseComparison.calculatePoseSimilarity(highConfidencePlayer, highConfidenceTarget);
        
        console.log(`High-confidence keypoints similarity: ${similarity}%`);
        expect(similarity).toBeGreaterThan(0);
        expect(similarity).toBeLessThanOrEqual(100);
    });
    
    test('should calculate angle between three points correctly', () => {
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 1, y: 0 };
        const p3 = { x: 1, y: 1 };
        
        const angle = poseComparison.calculateAngle(p1, p2, p3);
        expect(angle).toBeCloseTo(Math.PI / 2, 2); // Should be 90 degrees
    });
    
    test('should return consistent results for identical inputs', () => {
        const similarity1 = poseComparison.calculatePoseSimilarity(playerKeypoints, targetKeypoints);
        const similarity2 = poseComparison.calculatePoseSimilarity(playerKeypoints, targetKeypoints);
        
        expect(similarity1).toBe(similarity2);
    });
});

describe('Algorithm Comparison Tests', () => {
    let poseComparison;
    
    beforeEach(() => {
        poseComparison = new PoseComparison();
    });
    
    test('should perform better than simple distance-based comparison', () => {
        const angleBased = poseComparison.calculatePoseSimilarity(playerKeypoints, targetKeypoints);
        
        // Simple distance-based comparison (for reference)
        function simpleDistanceComparison(player, target) {
            let totalDistance = 0;
            let validComparisons = 0;
            const maxDistance = 100;
            
            for (let i = 0; i < Math.min(player.length, target.length); i++) {
                const playerPoint = player[i];
                const targetPoint = target[i];
                
                if (playerPoint.confidence > 0.5 && targetPoint.confidence > 0.5) {
                    const distance = Math.sqrt(
                        Math.pow(playerPoint.x - targetPoint.x, 2) + 
                        Math.pow(playerPoint.y - targetPoint.y, 2)
                    );
                    
                    totalDistance += Math.min(distance, maxDistance);
                    validComparisons++;
                }
            }
            
            if (validComparisons === 0) return 0;
            
            const averageDistance = totalDistance / validComparisons;
            return Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        }
        
        const distanceBased = simpleDistanceComparison(playerKeypoints, targetKeypoints);
        
        console.log(`Angle-based similarity: ${angleBased}%`);
        console.log(`Distance-based similarity: ${distanceBased}%`);
        
        // The angle-based approach should perform better for similar poses
        expect(angleBased).toBeGreaterThanOrEqual(distanceBased);
    });
});