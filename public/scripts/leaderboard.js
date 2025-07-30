class Leaderboard {
    constructor() {
        this.db = null;
        this.isFirebaseReady = false;
        this.initializeFirebase();
    }

    async initializeFirebase() {
        // Wait for Firebase to be initialized
        let attempts = 0;
        while (!window.firebase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.firebase) {
            this.db = window.firebase.db;
            this.isFirebaseReady = true;
            console.log('✅ Leaderboard connected to Firebase');
        } else {
            console.warn('⚠️ Firebase not available - leaderboard will work offline only');
        }
    }

    async saveScore(playerData) {
        if (!this.isFirebaseReady) {
            console.log('📱 Saving score locally (offline mode)');
            this.saveScoreLocally(playerData);
            return;
        }

        try {
            const scoreData = {
                ...playerData,
                timestamp: new Date(),
                version: "1.0"
            };

            await window.firebase.addDoc(
                window.firebase.collection(this.db, 'scores'), 
                scoreData
            );
            
            console.log('🎯 Score saved to Firebase:', scoreData);
            
            // Also save locally as backup
            this.saveScoreLocally(playerData);
            
        } catch (error) {
            console.error('❌ Error saving score to Firebase:', error);
            // Fallback to local storage
            this.saveScoreLocally(playerData);
        }
    }

    saveScoreLocally(playerData) {
        try {
            const scores = JSON.parse(localStorage.getItem('poseGameScores') || '[]');
            scores.push({
                ...playerData,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 100 scores locally
            const trimmedScores = scores.slice(-100);
            localStorage.setItem('poseGameScores', JSON.stringify(trimmedScores));
            
        } catch (error) {
            console.error('❌ Error saving score locally:', error);
        }
    }

    async getTopScores(limit = 10) {
        let firebaseScores = [];
        
        if (this.isFirebaseReady) {
            try {
                const q = window.firebase.query(
                    window.firebase.collection(this.db, 'scores'),
                    window.firebase.orderBy('totalScore', 'desc'),
                    window.firebase.limit(limit)
                );
                
                const querySnapshot = await window.firebase.getDocs(q);
                firebaseScores = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    source: 'online'
                }));
                
            } catch (error) {
                console.error('❌ Error fetching scores from Firebase:', error);
            }
        }

        // Get local scores as fallback
        const localScores = this.getLocalScores(limit);
        
        // Combine and sort all scores
        const allScores = [...firebaseScores, ...localScores]
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, limit);

        return allScores;
    }

    getLocalScores(limit = 10) {
        try {
            const scores = JSON.parse(localStorage.getItem('poseGameScores') || '[]');
            return scores
                .map(score => ({ ...score, source: 'local' }))
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting local scores:', error);
            return [];
        }
    }

    async displayLeaderboard(containerId = 'leaderboard') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="loading">Loading leaderboard...</div>';

        try {
            const topScores = await this.getTopScores(10);
            
            if (topScores.length === 0) {
                container.innerHTML = '<div class="no-scores">No scores yet. Be the first to play!</div>';
                return;
            }

            const leaderboardHTML = `
                <div class="leaderboard">
                    <h3>🏆 Top Scores</h3>
                    <div class="scores-list">
                        ${topScores.map((score, index) => `
                            <div class="score-entry ${index < 3 ? 'top-three' : ''}" data-rank="${index + 1}">
                                <div class="rank">#${index + 1}</div>
                                <div class="player-info">
                                    <div class="player-name">${score.playerName || 'Anonymous'}</div>
                                    <div class="score-details">
                                        Total: ${score.totalScore}% | Avg: ${Math.round(score.averageAccuracy)}%
                                    </div>
                                    <div class="score-meta">
                                        ${new Date(score.timestamp).toLocaleDateString()} 
                                        <span class="source ${score.source}">${score.source}</span>
                                    </div>
                                </div>
                                <div class="total-score">${score.totalScore}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            container.innerHTML = leaderboardHTML;
            
        } catch (error) {
            console.error('❌ Error displaying leaderboard:', error);
            container.innerHTML = '<div class="error">Error loading leaderboard</div>';
        }
    }
}