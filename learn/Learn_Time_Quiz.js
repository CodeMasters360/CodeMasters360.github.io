import { gameState } from './Learn_Time.js'; // Only gameState needed here now
import { generateQuestion as generateClockToTextQuestion } from './Quiz_Clock_To_Text.js';
import { generateAudioTextQuestion } from './Quiz_Audio_To_Text.js';
import { generateAudioClockQuestion } from './Quiz_Audio_To_Clock.js';

export function startQuiz() {
    gameState.quizScore = 0; 
    const scoreEl = document.getElementById('quiz-score');
    if (scoreEl) scoreEl.textContent = gameState.quizScore;
    generateClockToTextQuestion();
}

export function startQuizAudioText() {
    gameState.quizScore = 0;
    const scoreEl = document.getElementById('quiz-audio-text-score');
    if (scoreEl) scoreEl.textContent = gameState.quizScore;
    generateAudioTextQuestion();
}

export function startQuizAudioClock() {
    gameState.quizScore = 0;
    const scoreEl = document.getElementById('quiz-audio-clock-score');
    if (scoreEl) scoreEl.textContent = gameState.quizScore;
    // ensureQuizClocksExist and drawQuizClockMarks are called within generateAudioClockQuestion
    generateAudioClockQuestion();
}

// Removed all other functions as they are now in their respective quiz files.
// Global event listeners for audio errors or DOMContentLoaded specific to quiz setup
// have also been removed as they are better handled within specific modules or are not general.