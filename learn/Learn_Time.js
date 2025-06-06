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

    // Remove: Speak Time Button (no longer exists in HTML)
    // let speakBtn = document.getElementById('speak-time');
    // if (speakBtn) speakBtn.addEventListener('click', speakCurrentTime);
}

// Clock Functions
function updateAnalogClock(hours, minutes) {
    // Only update if quiz analog clock exists
    const hourHand = document.querySelector('.hour-hand');
    const minuteHand = document.querySelector('.minute-hand');
    if (!hourHand || !minuteHand) return;

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

// --- New: SVG Analog Clock Setup for Learn Mode ---
function drawClockMarks() {
    const marks = [];
    for (let i = 1; i <= 12; i++) {
        const angle = (i - 3) * (Math.PI * 2) / 12;
        const x = 100 + Math.cos(angle) * 75;
        const y = 100 + Math.sin(angle) * 75;
        marks.push(`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="16" fill="#333">${i}</text>`);
    }
    document.getElementById('clock-marks').innerHTML = marks.join('');
}
drawClockMarks();

// --- New: Update SVG Analog Clock Hands ---
function updateLearnAnalogClock(hours, minutes) {
    // Calculate angles
    const hourAngle = ((hours % 12) + minutes / 60) * 30; // 360/12 = 30
    const minuteAngle = minutes * 6; // 360/60 = 6

    // Set transforms
    document.getElementById('learn-hour-hand').setAttribute(
        'transform',
        `rotate(${hourAngle} 100 100)`
    );
    document.getElementById('learn-minute-hand').setAttribute(
        'transform',
        `rotate(${minuteAngle} 100 100)`
    );
}

// --- New: Random Time Generation for Learn Mode ---
function randomLearnTime() {
    // Multiples of 5 for minutes
    const hours = Math.floor(Math.random() * 12) + 1;
    const minutes = Math.floor(Math.random() * 12) * 5;
    return { hours, minutes };
}

// --- New: Map Time to Audio Sequence ---
function getTimeAudioSequence(hours, minutes) {
    // Convert to 12-hour format
    let h = hours % 12 || 12;
    let m = minutes;

    // Helper for file names
    // For hours: use en_num_01.mp3 ... en_num_12.mp3
    const hourFile = `audio/en_num_${h.toString().padStart(2, '0')}.mp3`;
    // For minutes: use en_num_00.mp3 ... en_num_60.mp3
    const minuteFile = `audio/en_num_${m.toString().padStart(2, '0')}.mp3`;

    // Special cases
    if (m === 0) {
        // "Three o_clock"
        return [hourFile, 'audio/o_clock.mp3'];
    }
    if (m === 15) {
        // "Quarter past four"
        return ['audio/quarter.mp3', 'audio/past.mp3', hourFile];
    }
    if (m === 30) {
        // "Half past five"
        return ['audio/half.mp3', 'audio/past.mp3', hourFile];
    }
    if (m === 45) {
        // "Quarter to (next hour)"
        let nextHour = ((h % 12) + 1);
        let nextHourFile = `audio/en_num_${nextHour.toString().padStart(2, '0')}.mp3`;
        return ['audio/quarter.mp3', 'audio/to.mp3', nextHourFile];
    }
    if (m < 30) {
        // "Twenty past two"
        return [minuteFile, 'audio/past.mp3', hourFile];
    }
    if (m > 30) {
        // "Ten to nine"
        let nextHour = ((h % 12) + 1);
        let toMinutes = 60 - m;
        let toMinuteFile = `audio/en_num_${toMinutes.toString().padStart(2, '0')}.mp3`;
        let nextHourFile = `audio/en_num_${nextHour.toString().padStart(2, '0')}.mp3`;
        return [
            toMinuteFile,
            'audio/to.mp3',
            nextHourFile
        ];
    }
    return [hourFile, minuteFile];
}

// --- New: Play Audio Files in Sequence ---
function playAudioSequence(files) {
    let idx = 0;
    function playNext() {
        if (idx >= files.length) return;
        const src = files[idx];
        const audio = new Audio(src);
        audio.onended = playNext;
        audio.onerror = function() {
            // Log missing file and show link in console
            console.warn('Cannot open audio file:', src);
            console.info('Audio file link:', window.location.origin + '/' + src);
            idx++;
            playNext();
        };
        audio.play().catch(err => {
            // Catch promise rejections (e.g., file missing)
            console.warn('Audio play failed:', src, err);
            console.info('Audio file link:', window.location.origin + '/' + src);
            idx++;
            playNext();
        });
        idx++;
    }
    playNext();
}

// Learn Mode
function initializeLearnMode() {
    // Remove old DOM-based clock drag logic for Learn mode
    // and only set up SVG clock and buttons

    // Set up event listeners for new buttons (safe to re-assign)
    document.getElementById('random-time-btn').onclick = () => {
        const { hours, minutes } = randomLearnTime();
        gameState.currentTime = { hours, minutes };
        updateLearnAnalogClock(hours, minutes);
        updateDigitalClock(hours, minutes);
    };
    document.getElementById('listen-time-btn').onclick = () => {
        const { hours, minutes } = gameState.currentTime;
        const audioSeq = getTimeAudioSequence(hours, minutes);
        playAudioSequence(audioSeq);
    };
    // Set initial time
    const { hours, minutes } = gameState.currentTime;
    updateLearnAnalogClock(hours, minutes);
    updateDigitalClock(hours, minutes);
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
    // Only update quiz clock (not SVG)
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
        // Add error handling for sound
        if (sounds.correct) {
            sounds.correct.play().catch(err => {
                console.warn('Cannot play correct sound:', sounds.correct.src, err);
                console.info('Sound file link:', sounds.correct.src);
            });
        }
        setTimeout(generateQuestion, 1500);
    } else {
        feedbackMessage.textContent = `Wrong! The correct time is ${correctAnswer}`;
        feedbackMessage.className = 'feedback-message wrong';
        // Add error handling for sound
        if (sounds.wrong) {
            sounds.wrong.play().catch(err => {
                console.warn('Cannot play wrong sound:', sounds.wrong.src, err);
                console.info('Sound file link:', sounds.wrong.src);
            });
        }
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