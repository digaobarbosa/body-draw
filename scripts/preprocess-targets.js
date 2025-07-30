#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the RoboflowAPI class from the existing file
const { RoboflowAPI } = require('./roboflow.js');

// Configuration
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'targets');
const OUTPUT_FILE = path.join(ASSETS_DIR, 'keypoints.json');
const THICKNESS = 10; // Constant thickness value

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

async function loadImageAsBase64(filePath) {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    const base64 = buffer.toString('base64');
    return `data:image/${mimeType};base64,${base64}`;
}

async function processImage(imagePath, roboflowAPI) {
    const filename = path.basename(imagePath);
    console.log(`Processing ${filename}...`);
    
    try {
        // Load and convert image to base64
        const base64Image = await loadImageAsBase64(imagePath);
        
        // Call Roboflow API using the imported class
        const result = await roboflowAPI.detectPose(base64Image, THICKNESS);
        console.log(`✓ Successfully processed ${filename}`);
        return result;
        
    } catch (error) {
        console.error(`✗ Error processing ${filename}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('Starting target image preprocessing...\n');
    
    // Initialize RoboflowAPI using the imported class
    const roboflowAPI = new RoboflowAPI();
    
    // Get all image files in the assets/targets directory
    const files = fs.readdirSync(ASSETS_DIR)
        .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
        .sort();
    
    if (files.length === 0) {
        console.error('No image files found in', ASSETS_DIR);
        process.exit(1);
    }
    
    console.log(`Found ${files.length} image(s) to process:`, files.join(', '));
    console.log();
    
    const results = {};
    
    // Process each image
    for (const file of files) {
        const imagePath = path.join(ASSETS_DIR, file);
        const result = await processImage(imagePath, roboflowAPI);
        
        if (result) {
            results[file] = result;
        }
        
        // Add a small delay between API calls to avoid rate limiting
        if (files.indexOf(file) < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Save results to JSON file
    console.log(`\nSaving results to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    
    console.log(`✓ Preprocessing complete! Processed ${Object.keys(results).length}/${files.length} images.`);
    
    // Show summary
    console.log('\nSummary:');
    for (const [filename, data] of Object.entries(results)) {
        const hasKeypoints = data?.outputs?.[0]?.model_predictions?.predictions?.[0]?.keypoints;
        const keypointCount = hasKeypoints ? hasKeypoints.length : 0;
        console.log(`  ${filename}: ${keypointCount} keypoints detected`);
    }
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});