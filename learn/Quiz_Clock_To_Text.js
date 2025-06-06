import { gameState, addScore, playSound } from './Learn_Time.js';

function updateQuizAnalogClock(hours, minutes) {
    const hourHand = document.getElementById('quiz-hour-hand');
    const minuteHand = document.getElementById('quiz-minute-hand');

    if (hourHand && minuteHand) {
        const hourDeg = (hours % 12 + minutes / 60) * 30 - 90;
        const minuteDeg = (minutes * 6) - 90;

        hourHand.setAttribute('transform', `rotate(${hourDeg} 100 100)`);
        minuteHand.setAttribute('transform', `rotate(${minuteDeg} 100 100)`);
    }
}

function checkAnswer(isCorrect, quizScreenSelector) {
    const feedbackEl = document.querySelector(`${quizScreenSelector} .feedback-message`);
    if (isCorrect) {
        if (feedbackEl) {
            feedbackEl.textContent = "Correct!";
            feedbackEl.className = 'feedback-message correct';
        }
        addScore(10);
        playSound('correct');
        if (quizScreenSelector === '#quiz-screen') { // Specific to this quiz type
            const scoreEl = document.getElementById('quiz-score');
            if (scoreEl) scoreEl.textContent = gameState.quizScore;
        }
    } else {
        if (feedbackEl) {
            feedbackEl.textContent = "Try again!";
            feedbackEl.className = 'feedback-message wrong';
        }
        playSound('wrong');
    }
    setTimeout(() => {
        if (feedbackEl) feedbackEl.textContent = "";
        generateQuestion(); // Next question for this quiz type
    }, 1500);
}

export function generateQuestion() {
    console.log("Generating new question for Clock to Text Quiz...");
    gameState.quizScore = gameState.quizScore; // Ensure score is current if re-entering
    const scoreEl = document.getElementById('quiz-score');
    if (scoreEl) scoreEl.textContent = gameState.quizScore;


    const hours = Math.floor(Math.random() * 12) + 1;
    let minutes;

    if (Math.random() < 0.9) {
        minutes = Math.floor(Math.random() * 12) * 5;
    } else {
        minutes = Math.floor(Math.random() * 60);
        while (minutes % 5 === 0) {
            minutes = Math.floor(Math.random() * 60);
        }
    }

    updateQuizAnalogClock(hours, minutes);

    const optionsContainer = document.querySelector('#quiz-screen .quiz-options');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        const formatTimeToString = (h, m) => {
            // This quiz uses simple H:MM format for options, not full text.
            const minuteStr = String(m).padStart(2, '0');
            return `${h}:${minuteStr}`;
        };

        const correctTimeText = formatTimeToString(hours, minutes);
        let distractors = [];
        while (distractors.length < 3) {
            const distractorH = Math.floor(Math.random() * 12) + 1;
            let distractorM;
            if (Math.random() < 0.7) {
                distractorM = Math.floor(Math.random() * 12) * 5;
            } else {
                distractorM = Math.floor(Math.random() * 60);
                while (distractorM % 5 === 0 && Math.random() < 0.5) {
                    distractorM = Math.floor(Math.random() * 60);
                }
            }
            const distractorText = formatTimeToString(distractorH, distractorM);
            if (distractorText !== correctTimeText && !distractors.includes(distractorText)) {
                distractors.push(distractorText);
            }
        }

        const options = [correctTimeText, ...distractors].sort(() => Math.random() - 0.5);
        options.forEach(optText => {
            const button = document.createElement('button');
            button.textContent = optText;
            button.onclick = () => checkAnswer(optText === correctTimeText, '#quiz-screen');
            optionsContainer.appendChild(button);
        });
    }
}
