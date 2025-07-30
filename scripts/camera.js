class CameraManager {
    constructor() {
        this.video = document.getElementById('webcam');
        this.stream = null;
        this.isActive = false;
    }

    async initialize() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = this.stream;
            
            // Start playing the video
            await this.video.play();
            
            this.isActive = true;
            console.log('Camera initialized successfully');
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.updateStatus('Camera access denied. Please allow camera permissions.');
            return false;
        }
    }

    captureFrame() {
        if (!this.isActive || this.video.readyState < 2) {
            console.log('Camera not ready for capture:', { isActive: this.isActive, readyState: this.video.readyState });
            return null;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.video.videoWidth || 640;
        tempCanvas.height = this.video.videoHeight || 480;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(this.video, 0, 0);
        
        return tempCanvas.toDataURL('image/jpeg', 0.8);
    }


    updateStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isActive = false;
        }
    }
}