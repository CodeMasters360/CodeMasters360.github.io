import { gameState } from './Learn_Time.js'; // Import gameState

// Global audio management
let currentAudioSequence = [];
let isPlayingAudio = false;

export function stopAllAudio() {
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
            background: #4CAF50;
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

export function initializeLearnMode() {
    stopAllAudio(); // Stop any previous audio when entering learn mode
    
    // Generate a random time when entering learn mode
    const { hours, minutes } = randomLearnTime();
    gameState.currentTime = { hours, minutes };
    
    const randomTimeBtn = document.getElementById('random-time-btn');
    const listenTimeBtn = document.getElementById('listen-time-btn');

    if (randomTimeBtn) {
        randomTimeBtn.onclick = () => {
            stopAllAudio(); // Stop any playing audio
            const { hours, minutes } = randomLearnTime();
            gameState.currentTime = { hours, minutes };
            updateLearnAnalogClock(hours, minutes);
            updateLearnDigitalClock(hours, minutes);
        };
    }
    if (listenTimeBtn) {
        listenTimeBtn.onclick = () => {
            stopAllAudio(); // Stop any previous audio
            const { hours, minutes } = gameState.currentTime;
            const audioSeq = getTimeAudioSequence(hours, minutes);
            playAudioSequence(audioSeq);
        };
    }
    
    // Draw clock marks only once when initializing
    drawClockMarks();
    
    // Update clocks with the new random time
    updateLearnAnalogClock(hours, minutes);
    updateLearnDigitalClock(hours, minutes);
}

export function drawClockMarks() {
    const clockMarksElement = document.getElementById('clock-marks');
    if (!clockMarksElement) return;
    
    // Clear existing marks to prevent duplicates
    clockMarksElement.innerHTML = '';
    
    const marks = [];
    for (let i = 1; i <= 12; i++) {
        const angle = (i - 3) * (Math.PI * 2) / 12;
        const x = 100 + Math.cos(angle) * 75;
        const y = 100 + Math.sin(angle) * 75;
        marks.push(`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="16" fill="#333">${i}</text>`);
    }
    clockMarksElement.innerHTML = marks.join('');
}

export function drawQuizClockMarks() {
    const marks = [];
    for (let i = 1; i <= 12; i++) {
        const angle = (i - 3) * (Math.PI * 2) / 12;
        const x = 100 + Math.cos(angle) * 75;
        const y = 100 + Math.sin(angle) * 75;
        marks.push(`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="16" fill="#333">${i}</text>`);
    }
    document.getElementById('quiz-clock-marks').innerHTML = marks.join('');
}

// Helper functions that might be missing or need to be defined:
// randomLearnTime, updateLearnAnalogClock, updateLearnDigitalClock, getTimeAudioSequence, playAudioSequence

// Example stubs for missing functions (you'll need actual implementations)
function randomLearnTime() {
    const hours = Math.floor(Math.random() * 12) + 1;
    let minutes;

    // 90% chance for minutes ending in 0 or 5
    if (Math.random() < 0.9) {
        minutes = Math.floor(Math.random() * 12) * 5; // 0, 5, 10, ..., 55
    } else {
        // 10% chance for any other minute
        minutes = Math.floor(Math.random() * 60);
        // Ensure it doesn't end in 0 or 5 if it fell into this 10%
        while (minutes % 5 === 0) {
            minutes = Math.floor(Math.random() * 60);
        }
    }
    return { hours, minutes };
}

function updateLearnAnalogClock(hours, minutes) {
    const hourHand = document.getElementById('learn-hour-hand');
    const minuteHand = document.getElementById('learn-minute-hand');

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
        console.log(`🕐 Learn Clock Update - Time: ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        console.log(`   H(mod12): ${hourMod12}, Hour Angle: ${hourDeg}°, Minute Angle: ${minuteDeg}°`);

        hourHand.setAttribute('transform', `rotate(${hourDeg} 100 100)`);
        minuteHand.setAttribute('transform', `rotate(${minuteDeg} 100 100)`);
    }
}

function updateLearnDigitalClock(hours, minutes) {
    const digitalHoursEl = document.querySelector('#learn-screen .digital-clock .hours');
    const digitalMinutesEl = document.querySelector('#learn-screen .digital-clock .minutes');
    if (digitalHoursEl && digitalMinutesEl) {
        digitalHoursEl.textContent = String(hours).padStart(2, '0');
        digitalMinutesEl.textContent = String(minutes).padStart(2, '0');
    }
}

function getTimeAudioSequence(hours, minutes) {
    const audioFiles = [];
    // Helper to get correct file name for numbers
    function numFile(n) { return `audio/en_num_${String(n).padStart(2, '0')}.mp3`; }

    // Fixed audio sequence order - say the time parts in the correct order
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
        const minutesToNext = 60 - minutes;
        audioFiles.push(numFile(minutesToNext));
        audioFiles.push('audio/to.mp3');
        audioFiles.push(numFile(hours === 12 ? 1 : hours + 1));
    }

    // Debug logging for audio sequence
    console.log(`🔊 Learn Mode Audio Sequence for ${hours}:${minutes.toString().padStart(2, '0')}:`);
    console.log(`   Files to play in order: [${audioFiles.join(', ')}]`);
    
    return audioFiles;
}

function playAudioSequence(audioFiles) {
    if (isPlayingAudio) {
        stopAllAudio();
    }
    
    isPlayingAudio = true;
    showAudioIndicator();
    currentAudioSequence = [];
    let currentIndex = 0;
    
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
            setTimeout(playNext, 200); // Small delay between audio files
        };
        audio.onerror = () => {
            console.warn(`Could not load audio: ${audioFiles[currentIndex]}`);
            currentIndex++;
            setTimeout(playNext, 200);
        };
        audio.play().catch(e => {
            console.warn(`Could not play audio: ${audioFiles[currentIndex]}`, e);
            currentIndex++;
            setTimeout(playNext, 200);
        });
    }
    
    playNext();
}

export function initializeListeningMode() {
    const generateListeningChallengeBtn = document.getElementById('generate-listening-challenge-btn');
    const clockOptions = document.querySelectorAll('.listening-clock-option');
    
    if (generateListeningChallengeBtn) {
        generateListeningChallengeBtn.onclick = generateListeningChallenge;
    }
    
    // Add click handlers for clock options
    clockOptions.forEach((clock, index) => {
        clock.onclick = () => selectClockOption(index);
    });
}

function generateListeningChallenge() {
    // Generate the correct time
    const correctTime = randomLearnTime();
    gameState.currentListeningTime = correctTime;
    gameState.correctClockIndex = Math.floor(Math.random() * 4); // Random position for correct clock
    
    // Generate 3 incorrect times
    const incorrectTimes = [];
    while (incorrectTimes.length < 3) {
        const time = randomLearnTime();
        // Ensure it's different from correct time and other incorrect times
        if (!timeEquals(time, correctTime) && !incorrectTimes.some(t => timeEquals(t, time))) {
            incorrectTimes.push(time);
        }
    }
    
    // Create array of all times with correct one in random position
    const allTimes = [];
    let incorrectIndex = 0;
    for (let i = 0; i < 4; i++) {
        if (i === gameState.correctClockIndex) {
            allTimes.push(correctTime);
        } else {
            allTimes.push(incorrectTimes[incorrectIndex++]);
        }
    }
    
    // Update all 4 clocks
    updateListeningClocks(allTimes);
    
    // Reset visual feedback
    resetClockSelections();
    
    // Play the correct time audio after a short delay
    setTimeout(() => {
        const audioSeq = getTimeAudioSequence(correctTime.hours, correctTime.minutes);
        playAudioSequence(audioSeq);
    }, 500);
}

function updateListeningClocks(times) {
    console.log('🔊 Listening Clocks Update:');
    times.forEach((time, index) => {
        const hourHand = document.getElementById(`listening-hour-hand-${index}`);
        const minuteHand = document.getElementById(`listening-minute-hand-${index}`);
        
        if (hourHand && minuteHand) {
            // Use seconds = 0 for static time display
            const seconds = 0;
            
            // Calculate angles using the precise algorithm
            // Minute Hand Angle: (M + S/60) × 6
            const minuteDeg = (time.minutes + seconds/60) * 6;
            
            // Hour Hand Angle: (H(mod12) + M/60 + S/3600) × 30
            const hourMod12 = time.hours % 12;
            const hourDeg = (hourMod12 + time.minutes/60 + seconds/3600) * 30;
            
            // Debug output for each clock
            console.log(`   Clock ${index}: ${time.hours}:${time.minutes.toString().padStart(2, '0')} -> H(mod12): ${hourMod12}, Hour: ${hourDeg}°, Minute: ${minuteDeg}°`);
            
            hourHand.setAttribute('transform', `rotate(${hourDeg} 50 50)`);
            minuteHand.setAttribute('transform', `rotate(${minuteDeg} 50 50)`);
        }
    });
}

function selectClockOption(selectedIndex) {
    // Prevent multiple selections
    if (gameState.listeningAnswered) return;
    
    gameState.listeningAnswered = true;
    
    // Visual feedback
    const selectedClock = document.querySelector(`.listening-clock-option:nth-child(${selectedIndex + 1})`);
    const allClocks = document.querySelectorAll('.listening-clock-option');
    
    if (selectedIndex === gameState.correctClockIndex) {
        // Correct answer
        selectedClock.classList.add('correct-selection');
        playEncouragementAudio();
        setTimeout(() => {
            alert('Great job! You found the correct time!');
        }, 500);
    } else {
        // Incorrect answer
        selectedClock.classList.add('incorrect-selection');
        allClocks[gameState.correctClockIndex].classList.add('correct-highlight');
        playIncorrectAudio();
        setTimeout(() => {
            alert('Not quite right. The correct clock is highlighted in green!');
        }, 500);
    }
}

function resetClockSelections() {
    const allClocks = document.querySelectorAll('.listening-clock-option');
    allClocks.forEach(clock => {
        clock.classList.remove('correct-selection', 'incorrect-selection', 'correct-highlight');
    });
    gameState.listeningAnswered = false;
}

function timeEquals(time1, time2) {
    return time1.hours === time2.hours && time1.minutes === time2.minutes;
}

function playEncouragementAudio() {
    const encouragements = [
        'audio/feedback/great-job.mp3',
        'audio/feedback/excellent.mp3',
        'audio/feedback/well-done.mp3',
        'audio/feedback/fantastic.mp3'
    ];
    const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    const audio = new Audio(randomEncouragement);
    audio.play().catch(e => {
        console.log('Correct! Great job!'); // Fallback
    });
}

function playIncorrectAudio() {
    const incorrectSounds = [
        'audio/feedback/try-again.mp3',
        'audio/feedback/not-quite.mp3'
    ];
    const randomIncorrect = incorrectSounds[Math.floor(Math.random() * incorrectSounds.length)];
    
    const audio = new Audio(randomIncorrect);
    audio.play().catch(e => {
        console.log('Try again!'); // Fallback
    });
}

export function drawListeningClockMarks() {
    for (let clockIndex = 0; clockIndex < 4; clockIndex++) {
        const marks = [];
        for (let i = 1; i <= 12; i++) {
            const angle = (i - 3) * (Math.PI * 2) / 12;
            const x = 50 + Math.cos(angle) * 37.5; // Smaller radius for option clocks
            const y = 50 + Math.sin(angle) * 37.5;
            marks.push(`<text x="${x}" y="${y+3}" text-anchor="middle" font-size="10" fill="#333">${i}</text>`);
        }
        const marksElement = document.getElementById(`listening-clock-marks-${clockIndex}`);
        if (marksElement) {
            marksElement.innerHTML = marks.join('');
        }
    }
}
