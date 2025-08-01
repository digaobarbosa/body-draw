/**
 * Centralized pose configuration for the game
 * Used by game.js, results.js, and potentially lobby pages
 */

// Complete pose definitions
const POSE_DEFINITIONS = {
    one: {
        id: 'one',
        name: 'Stretching',
        description: 'Stretch your arms up',
        image: 'assets/targets/1preguica.jpg'
    },
    two: {
        id: 'two',
        name: 'Man thinking',
        description: 'Think about your life',
        image: 'assets/targets/man-thinking.png'
    },
    three: {
        id: 'three',
        name: 'Racoon woman working',
        description: 'Work hard',
        image: 'assets/targets/racoon-woman.png'
    },
    four: {
        id: 'four',
        name: 'Usain Bolt',
        description: 'Great run!',
        image: 'assets/targets/usain-bolt.jpg'
    },
    old1: {
        id: 'old1',
        name: 'T-Pose',
        description: 'Stand with arms extended horizontally',
        image: 'assets/targets/1.webp'
    },
    old2: {
        id: 'old2',
        name: 'Arms Up',
        description: 'Raise both arms up in celebration',
        image: 'assets/targets/2.png'
    },
    old3: {
        id: 'old3',
        name: 'Pointing',
        description: 'Point with one arm extended',
        image: 'assets/targets/3.png'
    }
};

// Game mode pose queues
const POSE_QUEUES = {
    multiplayer: ['one', 'two', 'three', 'four'],
    singleplayer: ['old1', 'old2', 'old3']
};

// Helper function to get pose info
function getPoseInfo(poseId) {
    return POSE_DEFINITIONS[poseId] || null;
}

// Helper function to get poses for a game mode
function getPosesForMode(mode) {
    const queue = POSE_QUEUES[mode] || POSE_QUEUES.singleplayer;
    return queue.map(poseId => POSE_DEFINITIONS[poseId]);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { POSE_DEFINITIONS, POSE_QUEUES, getPoseInfo, getPosesForMode };
}