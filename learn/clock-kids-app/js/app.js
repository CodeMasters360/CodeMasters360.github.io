// filepath: clock-kids-app/clock-kids-app/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

const gameState = {
    currentScreen: 'welcome',
    totalScore: 0,
    quizScore: 0,
    highScores: [],
    currentTime: { hours: 12, minutes: 0 },
    soundEnabled: true
};

const screens = {
    welcome: document.getElementById('welcome-screen'),
    learn: document.getElementById('learn-screen'),
    quiz: document.getElementById('quiz-screen'),
    scores: document.getElementById('scores-screen')
};

const sounds = {
    correct: new Audio('assets/sounds/correct.mp3'),
    wrong: new Audio('assets/sounds/wrong.mp3'),
    reward: new Audio('assets/sounds/reward.mp3')
};

function initializeApp() {
    showScreen('welcome');
    loadHighScores();
    addEventListeners();
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    gameState.currentScreen = screenName;
}

function addEventListeners() {
    document.querySelector('.start-btn').addEventListener('click', () => {
        showScreen('learn');
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => showScreen('welcome'));
    });
}

function loadHighScores() {
    const savedScores = localStorage.getItem('clockKidsHighScores');
    if (savedScores) {
        gameState.highScores = JSON.parse(savedScores);
    }
}

function saveHighScore(score) {
    gameState.highScores.push(score);
    gameState.highScores.sort((a, b) => b - a);
    gameState.highScores = gameState.highScores.slice(0, 5);
    localStorage.setItem('clockKidsHighScores', JSON.stringify(gameState.highScores));
}