class TargetShapes {
    constructor() {
        this.canvas = document.getElementById('targetCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentShape = 'circle';
        this.shapes = {
            circle: this.drawCircle.bind(this),
            square: this.drawSquare.bind(this),
            triangle: this.drawTriangle.bind(this)
        };
    }

    drawCircle() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#4caf50';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(150, 150, 100, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawSquare() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#4caf50';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(75, 75, 150, 150);
    }

    drawTriangle() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#4caf50';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(150, 50);
        this.ctx.lineTo(75, 200);
        this.ctx.lineTo(225, 200);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    setShape(shapeName) {
        if (this.shapes[shapeName]) {
            this.currentShape = shapeName;
            this.shapes[shapeName]();
        }
    }

    getCurrentShape() {
        return this.currentShape;
    }

    // Get shape data for comparison
    getShapeData() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        return imageData;
    }

    // Generate ideal keypoints for each shape (for pose matching reference)
    getIdealKeypoints(shapeName) {
        const keypoints = [];
        
        switch (shapeName) {
            case 'circle':
                // Generate points around a circle
                for (let i = 0; i < 17; i++) {
                    const angle = (i / 17) * 2 * Math.PI;
                    keypoints.push({
                        x: 150 + Math.cos(angle) * 80,
                        y: 150 + Math.sin(angle) * 80,
                        confidence: 1.0
                    });
                }
                break;
                
            case 'square':
                // Generate points around a square
                const squarePoints = [
                    {x: 75, y: 75}, {x: 112, y: 75}, {x: 150, y: 75}, {x: 187, y: 75}, {x: 225, y: 75},
                    {x: 225, y: 112}, {x: 225, y: 150}, {x: 225, y: 187}, {x: 225, y: 225},
                    {x: 187, y: 225}, {x: 150, y: 225}, {x: 112, y: 225}, {x: 75, y: 225},
                    {x: 75, y: 187}, {x: 75, y: 150}, {x: 75, y: 112}, {x: 75, y: 75}
                ];
                keypoints.push(...squarePoints.map(p => ({...p, confidence: 1.0})));
                break;
                
            case 'triangle':
                // Generate points around a triangle
                const trianglePoints = [
                    {x: 150, y: 50}, {x: 135, y: 75}, {x: 120, y: 100}, {x: 105, y: 125},
                    {x: 90, y: 150}, {x: 82, y: 175}, {x: 75, y: 200},
                    {x: 100, y: 200}, {x: 125, y: 200}, {x: 150, y: 200}, {x: 175, y: 200},
                    {x: 200, y: 200}, {x: 225, y: 200}, {x: 210, y: 175}, {x: 195, y: 150},
                    {x: 180, y: 125}, {x: 165, y: 100}
                ];
                keypoints.push(...trianglePoints.map(p => ({...p, confidence: 1.0})));
                break;
        }
        
        return keypoints;
    }

    // Calculate similarity between pose keypoints and target shape
    calculateSimilarity(poseKeypoints, targetShape) {
        const idealKeypoints = this.getIdealKeypoints(targetShape);
        
        if (!poseKeypoints || poseKeypoints.length === 0) {
            return 0;
        }

        // Simple distance-based similarity calculation
        let totalDistance = 0;
        let validComparisons = 0;

        poseKeypoints.forEach(posePoint => {
            if (posePoint.confidence > 0.5) {
                // Find closest ideal point
                let minDistance = Infinity;
                idealKeypoints.forEach(idealPoint => {
                    const distance = Math.sqrt(
                        Math.pow(posePoint.x - idealPoint.x, 2) + 
                        Math.pow(posePoint.y - idealPoint.y, 2)
                    );
                    minDistance = Math.min(minDistance, distance);
                });
                
                totalDistance += minDistance;
                validComparisons++;
            }
        });

        if (validComparisons === 0) return 0;

        const averageDistance = totalDistance / validComparisons;
        const maxDistance = 200; // Maximum meaningful distance
        const similarity = Math.max(0, 100 - (averageDistance / maxDistance) * 100);
        
        return Math.round(similarity);
    }
}