import { gameState, addScore, playSound } from './Learn_Time.js';

function generateRandomTime() {
    const hours = Math.floor(Math.random() * 12) + 1;
    let minutes;
    if (Math.random() < 0.9) { minutes = Math.floor(Math.random() * 12) * 5; }
    else { minutes = Math.floor(Math.random() * 60); while (minutes % 5 === 0) { minutes = Math.floor(Math.random() * 60); } }
    return { hours, minutes };
}

function timeEquals(time1, time2) { return time1.hours === time2.hours && time1.minutes === time2.minutes; }

function getQuizTimeAudioSequence(hours, minutes) {
    const audioFiles = [];
    function numFile(n) { return `audio/en_num_${String(n).padStart(2, '0')}.mp3`; }
    audioFiles.push(numFile(hours));
    if (minutes === 0) audioFiles.push('audio/o_clock.mp3');
    else if (minutes === 15) { audioFiles.push('audio/quarter.mp3'); audioFiles.push('audio/past.mp3'); }
    else if (minutes === 30) { audioFiles.push('audio/half.mp3'); audioFiles.push('audio/past.mp3'); }
    else if (minutes === 45) { audioFiles.push('audio/quarter.mp3'); audioFiles.push('audio/to.mp3'); audioFiles.push(numFile(hours === 12 ? 1 : hours + 1)); }
    else if (minutes < 30) { audioFiles.push(numFile(minutes)); audioFiles.push('audio/past.mp3'); }
    else { const mtn = 60 - minutes; audioFiles.push(numFile(mtn)); audioFiles.push('audio/to.mp3'); audioFiles.push(numFile(hours === 12 ? 1 : hours + 1)); }
    return audioFiles;
}

function playQuizAudioSequence(audioFiles) {
    let currentIndex = 0;
    function playNext() {
        if (currentIndex >= audioFiles.length) return;
        const audio = new Audio(audioFiles[currentIndex]);
        audio.onended = () => { currentIndex++; setTimeout(playNext, 200); };
        audio.onerror = () => { console.warn(`Could not load quiz audio: ${audioFiles[currentIndex]}`); currentIndex++; setTimeout(playNext, 200); };
        audio.play().catch(e => { console.warn(`Could not play quiz audio: ${audioFiles[currentIndex]}`, e); currentIndex++; setTimeout(playNext, 200); });
    }
    playNext();
}

function createQuizClockOptionHTML(index) {
    return `
        <div class="quiz-clock-option" data-index="${index}">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="white" stroke="#333" stroke-width="2"/>
                <g id="quiz-clock-marks-${index}"></g>
                <line id="quiz-hour-hand-${index}" x1="50" y1="50" x2="50" y2="30" stroke="#333" stroke-width="3" stroke-linecap="round"/>
                <line id="quiz-minute-hand-${index}" x1="50" y1="50" x2="50" y2="20" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="3" fill="#333"/>
            </svg>
        </div>`;
}

function ensureQuizClocksExist() {
    const container = document.getElementById('quiz-audio-clock') || document.querySelector('.quiz-audio-clock-container') || document.body;
    if (document.querySelectorAll('.quiz-clock-option').length >= 4) return;
    let clocksContainer = document.getElementById('quiz-clocks-grid');
    if (!clocksContainer) {
        clocksContainer = document.createElement('div');
        clocksContainer.id = 'quiz-clocks-grid';
        clocksContainer.className = 'quiz-clocks-grid';
        clocksContainer.innerHTML = `<h3>Listen to the time and select the correct clock:</h3>
            <div class="quiz-clock-options-row">
                ${createQuizClockOptionHTML(0)} ${createQuizClockOptionHTML(1)}
                ${createQuizClockOptionHTML(2)} ${createQuizClockOptionHTML(3)}
            </div>`;
        container.appendChild(clocksContainer);
        const clockOptions = document.querySelectorAll('.quiz-clock-option');
        clockOptions.forEach((clock, index) => { clock.onclick = () => selectQuizClockOption(index); });
    }
}

function drawQuizClockMarks() {
    for (let clockIndex = 0; clockIndex < 4; clockIndex++) {
        const marks = [];
        for (let i = 1; i <= 12; i++) {
            const angle = (i - 3) * (Math.PI * 2) / 12;
            const x = 50 + Math.cos(angle) * 37.5;
            const y = 50 + Math.sin(angle) * 37.5;
            marks.push(`<text x="${x}" y="${y + 3}" text-anchor="middle" font-size="8" fill="#333">${i}</text>`);
        }
        const marksElement = document.getElementById(`quiz-clock-marks-${clockIndex}`);
        if (marksElement) marksElement.innerHTML = marks.join('');
    }
}

function updateQuizClocks(times) {
    console.log('🔊 Quiz Audio to Clock Update:');
    times.forEach((time, index) => {
        setTimeout(() => {
            const hourHand = document.getElementById(`quiz-hour-hand-${index}`);
            const minuteHand = document.getElementById(`quiz-minute-hand-${index}`);
            if (hourHand && minuteHand) {
                // Use seconds = 0 for static time display
                const seconds = 0;
                
                // Calculate angles using the precise algorithm
                // Minute Hand Angle: (M + S/60) × 6
                const minuteDeg = (time.minutes + seconds/60) * 6;
                
                // Hour Hand Angle: (H(mod12) + M/60 + S/3600) × 30
                const hourMod12 = time.hours % 12;
                const hourDeg = (hourMod12 + time.minutes/60 + seconds/3600) * 30;

                // Debug output for each quiz clock
                console.log(`   Quiz Clock ${index}: ${time.hours}:${time.minutes.toString().padStart(2, '0')} -> H(mod12): ${hourMod12}, Hour: ${hourDeg}°, Minute: ${minuteDeg}°`);

                hourHand.setAttribute('transform', `rotate(${hourDeg} 50 50)`);
                minuteHand.setAttribute('transform', `rotate(${minuteDeg} 50 50)`);
            } else { 
                console.warn(`Quiz clock hands not found for index ${index}`); 
            }
        }, 100);
    });
}

function resetQuizClockSelections() {
    const allClocks = document.querySelectorAll('.quiz-clock-option');
    allClocks.forEach(clock => clock.classList.remove('correct-selection', 'incorrect-selection', 'correct-highlight'));
    gameState.quizAnswered = false;
}

function showQuizFeedback(message, type) {
    let feedbackEl = document.getElementById('quiz-audio-clock-feedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.id = 'quiz-audio-clock-feedback';
        feedbackEl.className = 'quiz-feedback';
        const container = document.getElementById('quiz-clocks-grid') || document.body;
        container.appendChild(feedbackEl);
    }
    feedbackEl.textContent = message;
    feedbackEl.className = `quiz-feedback ${type}`;
    setTimeout(() => { feedbackEl.textContent = ''; feedbackEl.className = 'quiz-feedback'; }, 1800);
}

function selectQuizClockOption(selectedIndex) {
    if (gameState.quizAnswered) return;
    gameState.quizAnswered = true;
    const allClocks = document.querySelectorAll('.quiz-clock-option');
    const selectedClock = allClocks[selectedIndex];
    if (!selectedClock) { console.error('Selected quiz clock not found'); return; }

    if (selectedIndex === gameState.correctQuizClockIndex) {
        selectedClock.classList.add('correct-selection');
        addScore(10);
        playSound('correct');
        const scoreEl = document.getElementById('quiz-audio-clock-score');
        if (scoreEl) scoreEl.textContent = gameState.quizScore;
        showQuizFeedback('Great job! You found the correct time!', 'correct');
        setTimeout(() => { resetQuizClockSelections(); generateAudioClockQuestion(); }, 2000);
    } else {
        selectedClock.classList.add('incorrect-selection');
        if (allClocks[gameState.correctQuizClockIndex]) allClocks[gameState.correctQuizClockIndex].classList.add('correct-highlight');
        playSound('wrong');
        showQuizFeedback('Not quite right. The correct clock is highlighted in green!', 'incorrect');
        setTimeout(() => { resetQuizClockSelections(); generateAudioClockQuestion(); }, 3000);
    }
}

export function generateAudioClockQuestion() {
    console.log("Generating new question for Audio to Clock Quiz...");
    gameState.quizScore = gameState.quizScore; // Ensure score is current
    const scoreEl = document.getElementById('quiz-audio-clock-score');
    if (scoreEl) scoreEl.textContent = gameState.quizScore;

    ensureQuizClocksExist();
    const correctTime = generateRandomTime();
    gameState.currentQuizTime = correctTime;
    gameState.correctQuizClockIndex = Math.floor(Math.random() * 4);

    const incorrectTimes = [];
    let attempts = 0;
    while (incorrectTimes.length < 3 && attempts < 20) {
        const time = generateRandomTime();
        if (!timeEquals(time, correctTime) && !incorrectTimes.some(t => timeEquals(t, time))) incorrectTimes.push(time);
        attempts++;
    }
    while (incorrectTimes.length < 3) { // Fallback
        const time = { hours: Math.floor(Math.random() * 12) + 1, minutes: Math.floor(Math.random() * 12) * 5 };
        if (!timeEquals(time, correctTime) && !incorrectTimes.some(t => timeEquals(t, time))) incorrectTimes.push(time);
    }

    const allTimes = [];
    let incorrectIndex = 0;
    for (let i = 0; i < 4; i++) {
        if (i === gameState.correctQuizClockIndex) allTimes.push(correctTime);
        else allTimes.push(incorrectTimes[incorrectIndex++]);
    }

    updateQuizClocks(allTimes);
    resetQuizClockSelections();
    drawQuizClockMarks();

    setTimeout(() => {
        const audioSeq = getQuizTimeAudioSequence(correctTime.hours, correctTime.minutes);
        playQuizAudioSequence(audioSeq);
    }, 500);
}
