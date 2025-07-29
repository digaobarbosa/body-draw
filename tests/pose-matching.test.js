// Simple tests for pose matching functionality
// Can be run in browser console or Node.js environment

// Mock TargetPoses class for testing
class MockTargetPoses {
    constructor() {
        this.targetKeypoints = [];
    }

    generateMockKeypoints(poseName) {
        // Generate mock keypoints for different poses
        const baseKeypoints = [
            { x: 150, y: 90, confidence: 0.9, name: 'nose' },           // 0
            { x: 145, y: 85, confidence: 0.9, name: 'left_eye' },      // 1
            { x: 155, y: 85, confidence: 0.9, name: 'right_eye' },     // 2
            { x: 140, y: 90, confidence: 0.9, name: 'left_ear' },      // 3
            { x: 160, y: 90, confidence: 0.9, name: 'right_ear' },     // 4
            { x: 130, y: 130, confidence: 0.9, name: 'left_shoulder' }, // 5
            { x: 170, y: 130, confidence: 0.9, name: 'right_shoulder' }, // 6
            { x: 110, y: 150, confidence: 0.9, name: 'left_elbow' },   // 7
            { x: 190, y: 150, confidence: 0.9, name: 'right_elbow' },  // 8
            { x: 90, y: 170, confidence: 0.9, name: 'left_wrist' },    // 9
            { x: 210, y: 170, confidence: 0.9, name: 'right_wrist' },  // 10
            { x: 140, y: 190, confidence: 0.9, name: 'left_hip' },     // 11
            { x: 160, y: 190, confidence: 0.9, name: 'right_hip' },    // 12
            { x: 135, y: 230, confidence: 0.9, name: 'left_knee' },    // 13
            { x: 165, y: 230, confidence: 0.9, name: 'right_knee' },   // 14
            { x: 130, y: 270, confidence: 0.9, name: 'left_ankle' },   // 15
            { x: 170, y: 270, confidence: 0.9, name: 'right_ankle' }   // 16
        ];

        // Modify keypoints based on pose type
        switch (poseName) {
            case 'tpose':
                // Arms horizontal
                baseKeypoints[7].x = 90;  // left_elbow
                baseKeypoints[7].y = 130;
                baseKeypoints[8].x = 210; // right_elbow
                baseKeypoints[8].y = 130;
                baseKeypoints[9].x = 70;  // left_wrist
                baseKeypoints[9].y = 130;
                baseKeypoints[10].x = 230; // right_wrist
                baseKeypoints[10].y = 130;
                break;
                
            case 'celebration':
                // Arms raised up
                baseKeypoints[7].x = 120; // left_elbow
                baseKeypoints[7].y = 100;
                baseKeypoints[8].x = 180; // right_elbow
                baseKeypoints[8].y = 100;
                baseKeypoints[9].x = 110; // left_wrist
                baseKeypoints[9].y = 70;
                baseKeypoints[10].x = 190; // right_wrist
                baseKeypoints[10].y = 70;
                break;
        }

        return baseKeypoints;
    }

    calculatePoseSimilarity(playerKeypoints) {
        if (!playerKeypoints || playerKeypoints.length === 0 || !this.targetKeypoints || this.targetKeypoints.length === 0) {
            return 0;
        }

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

        if (validComparisons === 0) return 0;

        const averageDistance = totalDistance / validComparisons;
        const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        
        return Math.round(similarity);
    }
}

// Test suite
class PoseMatchingTests {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
        }
    }

    assertRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(`Assertion failed: ${message}. Value ${value} not in range [${min}, ${max}]`);
        }
    }

    runTests() {
        console.log('🧪 Running Pose Matching Tests...\n');
        
        this.tests.forEach(({ name, testFn }) => {
            try {
                testFn();
                console.log(`✅ ${name}`);
                this.results.push({ name, status: 'PASS' });
            } catch (error) {
                console.log(`❌ ${name}: ${error.message}`);
                this.results.push({ name, status: 'FAIL', error: error.message });
            }
        });

        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        
        console.log(`\n📊 Test Results: ${passed}/${total} passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed. Check the results above.');
        }

        return { passed, total, results: this.results };
    }
}

// Initialize test suite
const tests = new PoseMatchingTests();

// Test 1: Perfect match should return 100% similarity
tests.addTest('Perfect match returns 100% similarity', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    const playerKeypoints = poses.generateMockKeypoints('tpose');
    
    const similarity = poses.calculatePoseSimilarity(playerKeypoints);
    tests.assertEqual(similarity, 100, 'Perfect match should return 100%');
});

// Test 2: Empty keypoints should return 0% similarity
tests.addTest('Empty keypoints returns 0% similarity', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    
    const similarity = poses.calculatePoseSimilarity([]);
    tests.assertEqual(similarity, 0, 'Empty keypoints should return 0%');
});

// Test 3: Low confidence keypoints should be ignored
tests.addTest('Low confidence keypoints are ignored', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    
    // Create player keypoints with low confidence
    const playerKeypoints = poses.generateMockKeypoints('tpose').map(kp => ({
        ...kp,
        confidence: 0.3 // Below 0.5 threshold
    }));
    
    const similarity = poses.calculatePoseSimilarity(playerKeypoints);
    tests.assertEqual(similarity, 0, 'Low confidence keypoints should be ignored');
});

// Test 4: Slightly offset pose should have good but not perfect similarity
tests.addTest('Slightly offset pose has good similarity', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    
    // Create slightly offset player keypoints
    const playerKeypoints = poses.generateMockKeypoints('tpose').map(kp => ({
        ...kp,
        x: kp.x + 5, // Small offset
        y: kp.y + 5
    }));
    
    const similarity = poses.calculatePoseSimilarity(playerKeypoints);
    tests.assertRange(similarity, 80, 99, 'Slightly offset pose should have good similarity');
});

// Test 5: Very different pose should have low similarity
tests.addTest('Very different pose has low similarity', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    const playerKeypoints = poses.generateMockKeypoints('celebration');
    
    const similarity = poses.calculatePoseSimilarity(playerKeypoints);
    tests.assertRange(similarity, 0, 50, 'Very different pose should have low similarity');
});

// Test 6: Partial keypoints should still work
tests.addTest('Partial keypoints still work', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    
    // Use only first 10 keypoints
    const playerKeypoints = poses.generateMockKeypoints('tpose').slice(0, 10);
    
    const similarity = poses.calculatePoseSimilarity(playerKeypoints);
    tests.assertRange(similarity, 50, 100, 'Partial keypoints should still work');
});

// Test 7: Mixed confidence keypoints
tests.addTest('Mixed confidence keypoints work correctly', () => {
    const poses = new MockTargetPoses();
    poses.targetKeypoints = poses.generateMockKeypoints('tpose');
    
    // Mix of high and low confidence keypoints
    const playerKeypoints = poses.generateMockKeypoints('tpose').map((kp, index) => ({
        ...kp,
        confidence: index % 2 === 0 ? 0.9 : 0.3 // Alternate between high and low confidence
    }));
    
    const similarity = poses.calculatePoseSimilarity(playerKeypoints);
    tests.assertRange(similarity, 80, 100, 'Mixed confidence should work with valid keypoints');
});

// Test 8: Keypoint generation consistency
tests.addTest('Keypoint generation is consistent', () => {
    const poses = new MockTargetPoses();
    const keypoints1 = poses.generateMockKeypoints('tpose');
    const keypoints2 = poses.generateMockKeypoints('tpose');
    
    tests.assertEqual(keypoints1.length, keypoints2.length, 'Generated keypoints should have same length');
    tests.assertEqual(keypoints1.length, 17, 'Should generate 17 keypoints (COCO format)');
    
    // Check that same pose generates same keypoints
    for (let i = 0; i < keypoints1.length; i++) {
        tests.assertEqual(keypoints1[i].x, keypoints2[i].x, `Keypoint ${i} x should be consistent`);
        tests.assertEqual(keypoints1[i].y, keypoints2[i].y, `Keypoint ${i} y should be consistent`);
    }
});

// Export for browser/Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PoseMatchingTests, MockTargetPoses };
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
    // Run tests after a short delay to ensure console is ready
    setTimeout(() => {
        tests.runTests();
    }, 100);
}