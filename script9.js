// Game State
const gameState = {
    currentScreen: 'welcome',
    totalScore: 0,
    quizScore: 0,
    highScores: [],
    currentTime: { hours: 12, minutes: 0 },
    soundEnabled: true
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    main: document.getElementById('main-menu'),
    learn: document.getElementById('learn-screen'),
    quiz: document.getElementById('quiz-screen'),
    scores: document.getElementById('scores-screen')
};

// Audio Elements
const sounds = {
    correct: document.getElementById('correct-sound'),
    wrong: document.getElementById('wrong-sound'),
    reward: document.getElementById('reward-sound')
};

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    loadHighScores();
    addEventListeners();
});

function initializeGame() {
    showScreen('welcome');
    updateScoreDisplays();
}

// Screen Management
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    gameState.currentScreen = screenName;
}

// Event Listeners
function addEventListeners() {
    // Start Button
    document.querySelector('.start-btn').addEventListener('click', () => {
        showScreen('main');
    });

    // Menu Buttons
    document.querySelectorAll('[data-screen]').forEach(button => {
        button.addEventListener('click', (e) => {
            const screenName = e.target.dataset.screen;
            showScreen(screenName);
            if (screenName === 'quiz') {
                startQuiz();
            } else if (screenName === 'learn') {
                initializeLearnMode();
            }
        });
    });

    // Back Buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => showScreen('main'));
    });

    // Speak Time Button
    document.getElementById('speak-time').addEventListener('click', speakCurrentTime);
}

// Clock Functions
function updateAnalogClock(hours, minutes) {
    const hourHand = document.querySelector('.hour-hand');
    const minuteHand = document.querySelector('.minute-hand');

    const hourDegrees = (hours % 12) * 30 + minutes * 0.5;
    const minuteDegrees = minutes * 6;

    hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
}

function updateDigitalClock(hours, minutes) {
    const digitalHours = document.querySelector('.hours');
    const digitalMinutes = document.querySelector('.minutes');
    
    digitalHours.textContent = hours.toString().padStart(2, '0');
    digitalMinutes.textContent = minutes.toString().padStart(2, '0');
}

// Learn Mode
function initializeLearnMode() {
    const clockFace = document.querySelector('.clock-face');
    let isDragging = false;
    let currentHand = null;

    clockFace.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);

    function startDragging(e) {
        isDragging = true;
        const rect = clockFace.getBoundingClientRect();
        const handType = determineHand(e, rect);
        if (handType) {
            currentHand = handType;
            updateTimeFromMouse(e, rect);
        }
    }

    function drag(e) {
        if (isDragging && currentHand) {
            const rect = clockFace.getBoundingClientRect();
            updateTimeFromMouse(e, rect);
        }
    }

    function stopDragging() {
        isDragging = false;
        currentHand = null;
    }
}

// Quiz Mode
function startQuiz() {
    gameState.quizScore = 0;
    updateScoreDisplays();
    generateQuestion();
}

function generateQuestion() {
    const hours = Math.floor(Math.random() * 12) + 1;
    const minutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
    
    gameState.currentTime = { hours, minutes };
    updateAnalogClock(hours, minutes);
    
    generateOptions(hours, minutes);
}

function generateOptions(correctHours, correctMinutes) {
    const options = [];
    options.push(formatTimeString(correctHours, correctMinutes)); // Correct answer
    
    // Generate 3 wrong answers
    while (options.length < 4) {
        const h = Math.floor(Math.random() * 12) + 1;
        const m = Math.floor(Math.random() * 4) * 15;
        const timeString = formatTimeString(h, m);
        if (!options.includes(timeString)) {
            options.push(timeString);
        }
    }

    // Shuffle options
    shuffleArray(options);
    
    // Create option buttons
    const quizOptions = document.querySelector('.quiz-options');
    quizOptions.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.addEventListener('click', () => checkAnswer(option));
        quizOptions.appendChild(button);
    });
}

// Utility Functions
function formatTimeString(hours, minutes) {
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function updateScoreDisplays() {
    document.getElementById('total-score').textContent = gameState.totalScore;
    document.getElementById('quiz-score').textContent = gameState.quizScore;
}

function speakCurrentTime() {
    if (!gameState.soundEnabled) return;
    
    const { hours, minutes } = gameState.currentTime;
    const timeString = formatTimeString(hours, minutes);
    
    // Using Web Speech API
    const utterance = new SpeechSynthesisUtterance(timeString);
    speechSynthesis.speak(utterance);
}

function checkAnswer(selectedAnswer) {
    const correctAnswer = formatTimeString(
        gameState.currentTime.hours,
        gameState.currentTime.minutes
    );
    
    const isCorrect = selectedAnswer === correctAnswer;
    const feedbackMessage = document.querySelector('.feedback-message');
    
    if (isCorrect) {
        gameState.quizScore += 10;
        gameState.totalScore += 10;
        updateScoreDisplays();
        feedbackMessage.textContent = 'Correct! Well done!';
        feedbackMessage.className = 'feedback-message correct';
        sounds.correct.play();
        setTimeout(generateQuestion, 1500);
    } else {
        feedbackMessage.textContent = `Wrong! The correct time is ${correctAnswer}`;
        feedbackMessage.className = 'feedback-message wrong';
        sounds.wrong.play();
        setTimeout(() => {
            feedbackMessage.textContent = '';
            generateQuestion();
        }, 2000);
    }
}

// Local Storage Functions
function loadHighScores() {
    const savedScores = localStorage.getItem('clockKidsHighScores');
    if (savedScores) {
        gameState.highScores = JSON.parse(savedScores);
        updateHighScoresDisplay();
    }
}

function saveHighScore(score) {
    gameState.highScores.push(score);
    gameState.highScores.sort((a, b) => b - a);
    gameState.highScores = gameState.highScores.slice(0, 5); // Keep top 5
    localStorage.setItem('clockKidsHighScores', JSON.stringify(gameState.highScores));
    updateHighScoresDisplay();
}

function updateHighScoresDisplay() {
    const scoresList = document.querySelector('.scores-list');
    scoresList.innerHTML = gameState.highScores
        .map((score, index) => `<div>${index + 1}. ${score} points</div>`)
        .join('');
}