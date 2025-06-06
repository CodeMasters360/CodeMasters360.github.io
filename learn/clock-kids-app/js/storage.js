// filepath: /clock-kids-app/clock-kids-app/js/storage.js

const storage = {
    loadHighScores: function() {
        const savedScores = localStorage.getItem('clockKidsHighScores');
        return savedScores ? JSON.parse(savedScores) : [];
    },

    saveHighScore: function(score) {
        const highScores = this.loadHighScores();
        highScores.push(score);
        highScores.sort((a, b) => b - a);
        highScores.splice(5); // Keep top 5 scores
        localStorage.setItem('clockKidsHighScores', JSON.stringify(highScores));
    },

    clearHighScores: function() {
        localStorage.removeItem('clockKidsHighScores');
    }
};