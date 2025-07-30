#!/usr/bin/env node

const PoseComparison = require('./public/scripts/pose-comparison.js');

// Test data from pose-matching-real.test.js
const targetKeypoints = [
    { "x": 294, "y": 69, "confidence": 0.997, "class": "nose" },
    { "x": 432, "y": 226, "confidence": 0.994, "class": "left_shoulder" },
    { "x": 142, "y": 233, "confidence": 0.998, "class": "right_shoulder" },
    { "x": 482, "y": 363, "confidence": 0.269, "class": "left_elbow" },
    { "x": 79, "y": 380, "confidence": 0.992, "class": "right_elbow" },
    { "x": 532, "y": 498, "confidence": 0.181, "class": "left_wrist" },
    { "x": 15, "y": 527, "confidence": 0.974, "class": "right_wrist" }
];

const playerKeypoints = [
    { "x": 295, "y": 71, "confidence": 0.996, "class": "nose" },
    { "x": 431, "y": 228, "confidence": 0.993, "class": "left_shoulder" },
    { "x": 143, "y": 235, "confidence": 0.997, "class": "right_shoulder" },
    { "x": 481, "y": 365, "confidence": 0.268, "class": "left_elbow" },
    { "x": 80, "y": 382, "confidence": 0.991, "class": "right_elbow" },
    { "x": 531, "y": 500, "confidence": 0.180, "class": "left_wrist" },
    { "x": 16, "y": 529, "confidence": 0.973, "class": "right_wrist" }
];

const bad_playerKeypoints = [
    { "x": 100, "y": 50, "confidence": 0.9, "class": "nose" },
    { "x": 150, "y": 100, "confidence": 0.8, "class": "left_shoulder" },
    { "x": 50, "y": 100, "confidence": 0.8, "class": "right_shoulder" },
    { "x": 200, "y": 150, "confidence": 0.7, "class": "left_elbow" },
    { "x": 0, "y": 150, "confidence": 0.7, "class": "right_elbow" },
    { "x": 250, "y": 200, "confidence": 0.6, "class": "left_wrist" },
    { "x": 0, "y": 200, "confidence": 0.6, "class": "right_wrist" }
];

// Test cases - easy to add more
const testCases = [
    {
        name: "Good Match",
        player: "playerKeypoints",
        target: "targetKeypoints", 
        playerData: playerKeypoints,
        targetData: targetKeypoints
    },
    {
        name: "Bad Match",
        player: "bad_playerKeypoints",
        target: "targetKeypoints",
        playerData: bad_playerKeypoints,
        targetData: targetKeypoints
    },
    {
        name: "Perfect Match",
        player: "targetKeypoints",
        target: "targetKeypoints (self)",
        playerData: targetKeypoints,
        targetData: targetKeypoints
    }
];

// Strategies to test
const strategies = ['enhanced-angle', 'aligned-distance', 'vector-similarity', 'hybrid'];

// Run comparison
console.log('POSE COMPARISON STRATEGY TEST\n');
console.log('='.repeat(80));

testCases.forEach(testCase => {
    console.log(`\nTest: ${testCase.name}`);
    console.log(`Player: ${testCase.player}`);
    console.log(`Target: ${testCase.target}`);
    console.log('-'.repeat(50));
    
    strategies.forEach(strategy => {
        const comparison = new PoseComparison(strategy);
        const score = comparison.calculatePoseSimilarity(testCase.playerData, testCase.targetData);
        console.log(`${strategy.padEnd(20)} ${score}%`);
    });
});

console.log('\n' + '='.repeat(80));
console.log('\nSUMMARY:');
console.log('• Enhanced-angle: Original algorithm, best overall performance');
console.log('• Aligned-distance: Nose-based alignment, good for position matching');  
console.log('• Vector-similarity: Scale-invariant, may not discriminate as well');
console.log('• Hybrid: Combines all approaches with intelligent weighting');

console.log('\nTO ADD MORE TEST CASES:');
console.log('1. Add keypoint data arrays (same format as above)');
console.log('2. Push new test case to testCases array:');
console.log('   testCases.push({');
console.log('     name: "My Custom Test",');
console.log('     player: "my_player_pose",');
console.log('     target: "my_target_pose",');
console.log('     playerData: my_player_pose,');
console.log('     targetData: my_target_pose');
console.log('   });');
console.log('3. Run: node compare-strategies.js');