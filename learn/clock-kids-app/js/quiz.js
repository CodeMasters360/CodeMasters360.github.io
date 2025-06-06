// filepath: /clock-kids-app/clock-kids-app/js/quiz.js
const quizGame = {
    currentScore: 0,
    currentQuestion: {},
    totalQuestions: 10,
    questionsAnswered: 0,
    highScores: [],
};

const sounds = {
    correct: new Audio('assets/sounds/correct.mp3'),
    wrong: new Audio('assets/sounds/wrong.mp3'),
    reward: new Audio('assets/sounds/reward.mp3'),
};

document.addEventListener('DOMContentLoaded', () => {
    loadHighScores();
    startQuiz();
});

function startQuiz() {
    quizGame.currentScore = 0;
    quizGame.questionsAnswered = 0;
    generateQuestion();
}

function generateQuestion() {
    if (quizGame.questionsAnswered < quizGame.totalQuestions) {
        const hours = Math.floor(Math.random() * 12) + 1;
        const minutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
        quizGame.currentQuestion = { hours, minutes };
        displayQuestion(hours, minutes);
    } else {
        endQuiz();
    }
}

function displayQuestion(hours, minutes) {
    const questionElement = document.querySelector('.quiz-question');
    questionElement.textContent = `What time is it? ${formatTimeString(hours, minutes)}`;
    generateOptions(hours, minutes);
}

function generateOptions(correctHours, correctMinutes) {
    const options = [formatTimeString(correctHours, correctMinutes)];
    
    while (options.length < 4) {
        const h = Math.floor(Math.random() * 12) + 1;
        const m = Math.floor(Math.random() * 4) * 15;
        const timeString = formatTimeString(h, m);
        if (!options.includes(timeString)) {
            options.push(timeString);
        }
    }

    shuffleArray(options);
    displayOptions(options);
}

function displayOptions(options) {
    const optionsContainer = document.querySelector('.quiz-options');
    optionsContainer.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.addEventListener('click', () => checkAnswer(option));
        optionsContainer.appendChild(button);
    });
}

function checkAnswer(selectedAnswer) {
    const correctAnswer = formatTimeString(quizGame.currentQuestion.hours, quizGame.currentQuestion.minutes);
    
    if (selectedAnswer === correctAnswer) {
        quizGame.currentScore += 10;
        sounds.correct.play();
    } else {
        sounds.wrong.play();
    }
    
    quizGame.questionsAnswered++;
    generateQuestion();
}

function endQuiz() {
    saveHighScore(quizGame.currentScore);
    alert(`Quiz finished! Your score: ${quizGame.currentScore}`);
}

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

function loadHighScores() {
    const savedScores = localStorage.getItem('clockKidsHighScores');
    if (savedScores) {
        quizGame.highScores = JSON.parse(savedScores);
    }
}

function saveHighScore(score) {
    quizGame.highScores.push(score);
    quizGame.highScores.sort((a, b) => b - a);
    quizGame.highScores = quizGame.highScores.slice(0, 5); // Keep top 5
    localStorage.setItem('clockKidsHighScores', JSON.stringify(quizGame.highScores));
}