const {onRequest} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");

// The Firebase Cloud Function
exports.detectPose = onRequest({
  cors: true,
  region: "us-central1",
  invoker: "public",
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    // Get the Roboflow API key from environment or hardcoded for now
    const apiKey = process.env.ROBOFLOW_API_KEY || "SLt1HjDiKA4nAQcHml4K";
    if (!apiKey) {
      logger.error("ROBOFLOW_API_KEY not available");
      res.status(500).json({error: "Server configuration error"});
      return;
    }

    // Extract parameters from request body
    const {imageBase64, thickness = 10} = req.body;
    
    if (!imageBase64) {
      res.status(400).json({error: "imageBase64 is required"});
      return;
    }

    // Forward the request to Roboflow API
    const roboflowUrl = "https://serverless.roboflow.com/infer/workflows/rodrigo-xn5xn/keypoints-test";
    
    const response = await fetch(roboflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        inputs: {
          "image": {"type": "base64", "value": imageBase64},
          "thickness": thickness,
        },
      }),
    });

    if (!response.ok) {
      logger.error(`Roboflow API error: ${response.status} ${response.statusText}`);
      res.status(response.status).json({
        error: `Roboflow API error: ${response.status} ${response.statusText}`,
      });
      return;
    }

    const result = await response.json();
    
    // Log successful request (without sensitive data)
    logger.info("Pose detection successful", {
      hasOutputs: !!(result.outputs && result.outputs.length > 0),
      timestamp: new Date().toISOString(),
    });

    // Return the result
    res.json(result);

  } catch (error) {
    logger.error("Error in detectPose function:", error);
    res.status(500).json({error: "Internal server error"});
  }
});