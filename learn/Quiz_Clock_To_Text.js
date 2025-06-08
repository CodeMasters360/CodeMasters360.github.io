import { gameState, addScore, playSound } from './Learn_Time.js';

function updateQuizAnalogClock(hours, minutes) {
    const hourHand = document.getElementById('quiz-hour-hand');
    const minuteHand = document.getElementById('quiz-minute-hand');

    if (hourHand && minuteHand) {
        // Use seconds = 0 for static time display
        const seconds = 0;
        
        // Calculate angles using the precise algorithm
        // Minute Hand Angle: (M + S/60) × 6
        const minuteDeg = (minutes + seconds/60) * 6;
        
        // Hour Hand Angle: (H(mod12) + M/60 + S/3600) × 30
        const hourMod12 = hours % 12;
        const hourDeg = (hourMod12 + minutes/60 + seconds/3600) * 30;

        // Debug output
        console.log(`🕐 Quiz Clock Update - Time: ${hours}:${minutes.toString().padStart(2, '0')} -> H(mod12): ${hourMod12}, Hour: ${hourDeg}°, Minute: ${minuteDeg}°`);

        hourHand.setAttribute('transform', `rotate(${hourDeg} 100 100)`);
        minuteHand.setAttribute('transform', `rotate(${minuteDeg} 100 100)`);
    }
}

function checkAnswer(isCorrect, quizScreenSelector) {
    const feedbackEl = document.querySelector(`${quizScreenSelector} .feedback-message`);
    const optionsContainer = document.querySelector(`${quizScreenSelector} .quiz-options`);
    
    if (isCorrect) {
        if (feedbackEl) {
            feedbackEl.textContent = "Correct!";
            feedbackEl.className = 'feedback-message correct';
        }
        addScore(10);
        playSound('correct');
        if (quizScreenSelector === '#quiz-screen') {
            const scoreEl = document.getElementById('quiz-score');
            if (scoreEl) scoreEl.textContent = gameState.quizScore;
        }
        setTimeout(() => {
            if (feedbackEl) feedbackEl.textContent = "";
            generateQuestion();
        }, 1500);
    } else {
        if (feedbackEl) {
            feedbackEl.textContent = "Try again!";
            feedbackEl.className = 'feedback-message wrong';
        }
        playSound('wrong');
        
        // Highlight the correct answer for 1 second
        if (optionsContainer) {
            const buttons = optionsContainer.querySelectorAll('button');
            buttons.forEach(button => {
                button.style.pointerEvents = 'none'; // Disable clicking during feedback
                // Find and highlight the correct answer
                if (button.textContent === gameState.correctAnswer) {
                    button.style.backgroundColor = '#4CAF50';
                    button.style.color = 'white';
                    button.style.border = '3px solid #2E7D32';
                    button.style.transform = 'scale(1.05)';
                    button.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
                }
            });
            
            setTimeout(() => {
                // Reset button styles and re-enable clicking
                buttons.forEach(button => {
                    button.style.pointerEvents = 'auto';
                    button.style.backgroundColor = '';
                    button.style.color = '';
                    button.style.border = '';
                    button.style.transform = '';
                    button.style.boxShadow = '';
                });
                if (feedbackEl) feedbackEl.textContent = "";
                generateQuestion();
            }, 2500); // Show correct answer for 1 second, then wait before next question
        } else {
            setTimeout(() => {
                if (feedbackEl) feedbackEl.textContent = "";
                generateQuestion();
            }, 1500);
        }
    }
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
        gameState.correctAnswer = correctTimeText; // Store correct answer for highlighting
        
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
