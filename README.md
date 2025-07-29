# Visionary2 - Pose Matching Game

A static web game that uses Roboflow's YOLOv8m pose detection to challenge players to match target human poses using their webcam.

## Game Concept

- Players see a target position (person picture) with highlighted keypoints
- Using their webcam, they have 30 seconds to match the exact same position
- The game uses YOLOv8m-pose-640 model to detect player's pose keypoints
- Real-time comparison between player's pose and target pose keypoints
- Players score based on how accurately they match the target position within the time limit

## Tech Stack

- Static HTML/CSS/JavaScript
- Roboflow Inference API for pose detection
- WebRTC for camera access
- Canvas API for rendering

## API Integration

The game integrates with Roboflow's workflow API:

```javascript
// Equivalent to Python SDK call:
// client.run_workflow(
//     workspace_name="rodrigo-xn5xn",
//     workflow_id="keypoints-test",
//     images={"image": "YOUR_IMAGE.jpg"},
//     parameters={"thickness": 10},
//     use_cache=True
// )

const result = await fetch('https://serverless.roboflow.com/rodrigo-xn5xn/keypoints-test', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer SLt1HjDiKA4nAQcHml4K',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        image: base64Image,
        thickness: 10
    })
});
```

## Project Structure

```
visionary2/
├── index.html          # Main game interface
├── styles/
│   └── main.css        # Game styling
├── scripts/
│   ├── game.js         # Core game logic with 30s timer
│   ├── camera.js       # Camera handling
│   ├── roboflow.js     # API integration
│   └── poses.js        # Target pose definitions and keypoints
├── assets/
│   └── targets/        # Target pose images and reference keypoints
├── package.json        # Dependencies and scripts
└── vercel.json        # Vercel deployment config
```

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open `http://localhost:3000`

## Deployment

This project is configured for easy deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect and deploy the static site
3. No additional configuration needed

## Development

- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## API Keys

The Roboflow API key is currently hardcoded for development. For production, consider environment variables or secure key management.

## Game Flow

1. **Target Selection**: Player selects or is assigned a target pose
2. **Preparation**: 3-second countdown before timer starts
3. **Matching Phase**: 30 seconds to match the target pose as closely as possible
4. **Scoring**: Real-time accuracy feedback with final score based on best match
5. **Results**: Performance summary and option to try again or new pose

## Scoring System

- **Real-time Accuracy**: 0-100% based on keypoint position matching
- **Time Bonus**: Higher scores for achieving good matches quickly
- **Precision Bonus**: Extra points for maintaining position stability
- **Final Score**: Combination of best accuracy, time, and consistency

## Future Enhancements

- Multiple difficulty levels with different target poses
- Leaderboard system with best scores
- Multiplayer pose-off competitions
- Custom pose creation and sharing
- Progressive difficulty with pose sequences
- Performance analytics and improvement tracking