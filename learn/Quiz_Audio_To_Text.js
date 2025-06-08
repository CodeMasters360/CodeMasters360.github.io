import { gameState, addScore, playSound } from './Learn_Time.js';

// Global audio management
let currentAudioSequence = [];
let isPlayingAudio = false;

function stopAllAudio() {
    currentAudioSequence.forEach(audio => {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    currentAudioSequence = [];
    isPlayingAudio = false;
    hideAudioIndicator();
}

function showAudioIndicator(message = "🔊 Playing time...") {
    let indicator = document.getElementById('audio-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'audio-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #2196F3;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 16px;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: pulse 1.5s infinite;
        `;
        document.body.appendChild(indicator);
    }
    indicator.textContent = message;
    indicator.style.display = 'block';
}

function hideAudioIndicator() {
    const indicator = document.getElementById('audio-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function generateRandomTime() {
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
    return { hours, minutes };
}

function getQuizTimeAudioSequence(hours, minutes) {
    const audioFiles = [];
    function numFile(n) { return `audio/en_num_${String(n).padStart(2, '0')}.mp3`; }
    
    // Fixed audio sequence order
    if (minutes === 0) {
        audioFiles.push(numFile(hours));
        audioFiles.push('audio/o_clock.mp3');
    } else if (minutes === 15) {
        audioFiles.push('audio/quarter.mp3');
        audioFiles.push('audio/past.mp3');
        audioFiles.push(numFile(hours));
    } else if (minutes === 30) {
        audioFiles.push('audio/half.mp3');
        audioFiles.push('audio/past.mp3');
        audioFiles.push(numFile(hours));
    } else if (minutes === 45) {
        audioFiles.push('audio/quarter.mp3');
        audioFiles.push('audio/to.mp3');
        audioFiles.push(numFile(hours === 12 ? 1 : hours + 1));
    } else if (minutes < 30) {
        audioFiles.push(numFile(minutes));
        audioFiles.push('audio/past.mp3');
        audioFiles.push(numFile(hours));
    } else {
        const mtn = 60 - minutes;
        audioFiles.push(numFile(mtn));
        audioFiles.push('audio/to.mp3');
        audioFiles.push(numFile(hours === 12 ? 1 : hours + 1));
    }

    // Debug logging for audio sequence
    console.log(`🔊 Audio to Text Quiz Audio Sequence for ${hours}:${minutes.toString().padStart(2, '0')}:`);
    console.log(`   Files to play in order: [${audioFiles.join(', ')}]`);
    
    return audioFiles;
}

function playQuizAudioSequence(audioFiles) {
    if (isPlayingAudio) {
        stopAllAudio();
    }

    isPlayingAudio = true;
    showAudioIndicator("🔊 Playing time...");
    currentAudioSequence = [];
    let currentIndex = 0;

    // Log audio sequence every time play is triggered
    console.log(`🔊 Audio to Text Quiz Audio Sequence:`);
    console.log(`   Files to play in order: [${audioFiles.join(', ')}]`);

    function playNext() {
        if (currentIndex >= audioFiles.length) {
            isPlayingAudio = false;
            hideAudioIndicator();
            currentAudioSequence = [];
            return;
        }

        const audio = new Audio(audioFiles[currentIndex]);
        currentAudioSequence.push(audio);

        audio.onended = () => {
            currentIndex++;
            setTimeout(playNext, 200);
        };
        audio.onerror = () => {
            console.warn(`Could not load quiz audio: ${audioFiles[currentIndex]}`);
            currentIndex++;
            setTimeout(playNext, 200);
        };
        audio.play().catch(e => {
            console.warn(`Could not play quiz audio: ${audioFiles[currentIndex]}`, e);
            currentIndex++;
            setTimeout(playNext, 200);
        });
    }

    playNext();
}

function formatTimeToText(hours, minutes) {
    const hourNames = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
    const minuteWords = {
  1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five",
  6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten",
  11: "Eleven", 12: "Twelve", 13: "Thirteen", 14: "Fourteen", 15: "Fifteen",
  16: "Sixteen", 17: "Seventeen", 18: "Eighteen", 19: "Nineteen", 20: "Twenty",
  21: "Twenty-One", 22: "Twenty-Two", 23: "Twenty-Three", 24: "Twenty-Four", 25: "Twenty-Five",
  26: "Twenty-Six", 27: "Twenty-Seven", 28: "Twenty-Eight", 29: "Twenty-Nine", 30: "Thirty",
  31: "Thirty-One", 32: "Thirty-Two", 33: "Thirty-Three", 34: "Thirty-Four", 35: "Thirty-Five",
  36: "Thirty-Six", 37: "Thirty-Seven", 38: "Thirty-Eight", 39: "Thirty-Nine", 40: "Forty",
  41: "Forty-One", 42: "Forty-Two", 43: "Forty-Three", 44: "Forty-Four", 45: "Forty-Five",
  46: "Forty-Six", 47: "Forty-Seven", 48: "Forty-Eight", 49: "Forty-Nine", 50: "Fifty",
  51: "Fifty-One", 52: "Fifty-Two", 53: "Fifty-Three", 54: "Fifty-Four", 55: "Fifty-Five",
  56: "Fifty-Six", 57: "Fifty-Seven", 58: "Fifty-Eight", 59: "Fifty-Nine"
}; // Simplified for brevity, expand as needed

    if (minutes === 0) return `${hourNames[hours]} o'clock`;
    if (minutes === 15) return `Quarter past ${hourNames[hours]}`;
    if (minutes === 30) return `Half past ${hourNames[hours]}`;
    if (minutes === 45) return `Quarter to ${hourNames[hours === 12 ? 1 : hours + 1]}`;
    if (minutes < 30) return `${minuteWords[minutes] || minutes} past ${hourNames[hours]}`;
    
    const minutesTo = 60 - minutes;
    return `${minuteWords[minutesTo] || minutesTo} to ${hourNames[hours === 12 ? 1 : hours + 1]}`;
}


function checkAudioTextAnswer(isCorrect) {
    const feedbackEl = document.querySelector('#quiz-audio-text .feedback-message');
    if (isCorrect) {
        if (feedbackEl) { feedbackEl.textContent = "Correct!"; feedbackEl.className = 'feedback-message correct'; }
        addScore(10);
        playSound('correct');
        const scoreEl = document.getElementById('quiz-audio-text-score');
        if (scoreEl) scoreEl.textContent = gameState.quizScore;
    } else {
        if (feedbackEl) { feedbackEl.textContent = "Try again!"; feedbackEl.className = 'feedback-message wrong'; }
        playSound('wrong');
    }
    setTimeout(() => {
        if (feedbackEl) feedbackEl.textContent = "";
        generateAudioTextQuestion();
    }, 1500);
}

export function generateAudioTextQuestion() {
    console.log("Generating new question for Audio to Text Quiz...");
    stopAllAudio(); // Stop any previous audio
    
    gameState.quizScore = gameState.quizScore;
    const scoreEl = document.getElementById('quiz-audio-text-score');
    if (scoreEl) scoreEl.textContent = gameState.quizScore;

    const correctTime = generateRandomTime();
    const correctTimeText = formatTimeToText(correctTime.hours, correctTime.minutes);

    let distractors = [];
    while (distractors.length < 3) {
        const distractorTime = generateRandomTime();
        const distractorText = formatTimeToText(distractorTime.hours, distractorTime.minutes);
        if (distractorText !== correctTimeText && !distractors.includes(distractorText)) {
            distractors.push(distractorText);
        }
    }

    const optionsContainer = document.querySelector('#quiz-audio-text .quiz-options');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        const options = [correctTimeText, ...distractors].sort(() => Math.random() - 0.5);
        options.forEach(optText => {
            const button = document.createElement('button');
            button.textContent = optText;
            button.onclick = () => checkAudioTextAnswer(optText === correctTimeText);
            optionsContainer.appendChild(button);
        });
    }

    setTimeout(() => {
        const audioSeq = getQuizTimeAudioSequence(correctTime.hours, correctTime.minutes);
        playQuizAudioSequence(audioSeq);
    }, 500);

    // Add play button handler for replaying audio and showing indicator
    const playBtn = document.getElementById('play-quiz-audio-btn');
    if (playBtn) {
        playBtn.onclick = () => {
            const audioSeq = getQuizTimeAudioSequence(correctTime.hours, correctTime.minutes);
            playQuizAudioSequence(audioSeq);
        };
    }
}
