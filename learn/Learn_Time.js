// Import modules
import { initializeLearnMode, drawClockMarks, drawQuizClockMarks } from './Learn_Time_Learn.js';
import { startQuiz, startQuizAudioText, startQuizAudioClock } from './Learn_Time_Quiz.js';
import { loadUsers, getCurrentUser, getUserName, saveUserData, getUsers } from './Learn_Time_User.js';
import { initializeAccountSystem, displayLoginModal, hideLoginModal, displayAccountPanel, renderUserList } from './Learn_Time_Account.js';

// Game State
export const gameState = {
    currentScreen: 'welcome-screen', // Represents the ID of the current main screen
    totalScore: 0,
    quizScore: 0,
    highScores: [],
    currentTime: { hours: 12, minutes: 0 },
    soundEnabled: true,
    userName: '', // Will be updated from currentUser
    dailyProgress: {}
};

// DOM Elements
const $ = id => document.getElementById(id);

// Main Screens
const mainScreenElements = {
    'welcome-screen': $('welcome-screen'),
    'main-menu': $('main-menu'),
    'learn-screen': $('learn-screen'),
    'quiz-screen': $('quiz-screen'),
    'quiz-audio-text': $('quiz-audio-text'),
    'quiz-audio-clock': $('quiz-audio-clock'),
    'scores-screen': $('scores-screen'),
    'about-screen': $('about-screen'),
    'howto-screen': $('howto-screen')
};

// Modal Elements (handled by Learn_Time_Account.js for display logic)
const loginModalElement = $('login-modal');
const accountPanelElement = $('account-panel');
// const nameModalElement = $('name-modal'); // If to be used

// Sounds
const sounds = {
    correct: new Audio('assets/correct.mp3'),
    wrong: new Audio('assets/wrong.mp3'),
    reward: new Audio('assets/reward.mp3')
};

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    loadUsers(); // Loads all users and attempts to set current user from localStorage
    drawClockMarks(); // For learn screen
    drawQuizClockMarks(); // For quiz screen
    
    initializeAccountSystem(); // Sets up listeners for login/account modal buttons
    setupGlobalEventListeners();
    updateUserNameDisplays(); // Update names based on loaded user (if any)

    const currentUser = getCurrentUser();
    if (currentUser) {
        showMainScreen('main-menu');
    } else {
        showMainScreen('welcome-screen'); // Show welcome, which can lead to login
    }
});

// Global Event Listeners
function setupGlobalEventListeners() {
    // Start App Button (from Welcome Screen)
    $('start-app-btn').addEventListener('click', () => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            showMainScreen('main-menu');
        } else {
            displayLoginModal();
        }
    });

    // Main Menu Navigation Buttons
    document.querySelectorAll('#main-menu .menu-buttons button[data-screen]').forEach(button => {
        button.addEventListener('click', (e) => {
            const screenId = e.target.dataset.screen;
            showMainScreen(screenId);
            // Initialize screen-specific logic if needed
            if (screenId === 'learn-screen') initializeLearnMode();
            else if (screenId === 'quiz-screen') startQuiz();
            else if (screenId === 'quiz-audio-text') startQuizAudioText();
            else if (screenId === 'quiz-audio-clock') startQuizAudioClock();
            // else if (screenId === 'scores-screen') renderScores(); // Example
        });
    });

    // "Back to Menu" Buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => showMainScreen('main-menu'));
    });

    // Account Panel Button (in main menu user info)
    $('account-panel-btn').addEventListener('click', () => {
        if (getCurrentUser()) {
            displayAccountPanel();
        } else {
            // If somehow account button is clicked without user, prompt login
            displayLoginModal();
        }
    });
}

// Screen Management
export function showMainScreen(screenId) {
    Object.values(mainScreenElements).forEach(screenEl => {
        if (screenEl) screenEl.classList.add('hidden');
    });
    if (mainScreenElements[screenId]) {
        mainScreenElements[screenId].classList.remove('hidden');
        gameState.currentScreen = screenId;
    } else {
        console.error(`Screen with ID ${screenId} not found.`);
        mainScreenElements['welcome-screen'].classList.remove('hidden'); // Fallback
        gameState.currentScreen = 'welcome-screen';
    }
    // Ensure modals are not affected or are explicitly hidden if necessary
    // hideLoginModal(); // Example: if a main screen should always hide login
    // hideAccountPanel();
}


// UI Update Functions
export function updateUserNameDisplays() {
    const userName = getUserName(); // Get from Learn_Time_User.js
    const displayUserName = userName || 'Guest';

    const welcomeUserNameEl = $('welcome-user-name');
    if (welcomeUserNameEl) { // Welcome screen might show generic or specific welcome
        welcomeUserNameEl.textContent = userName ? `Welcome back, ${userName}!` : 'Learning Time in English';
    }
    
    const displayUserNameEl = $('display-user-name');
    if (displayUserNameEl) displayUserNameEl.textContent = displayUserName;
    
    const scoresUserNameEl = $('scores-user-name-value');
    if (scoresUserNameEl) scoresUserNameEl.textContent = displayUserName;
    
    const accountUserNameEl = $('account-username'); // In account panel
    if (accountUserNameEl && userName) accountUserNameEl.textContent = userName;

    // Update total score display
    const totalScoreEl = $('total-score');
    if (totalScoreEl) totalScoreEl.textContent = gameState.totalScore;
}

// Functions to be called by Account.js or other modules if they need to trigger these actions
export function showLoginScreen() { // Renamed from showLoginModal to be more generic if needed
    // This might be a bit redundant if displayLoginModal in Account.js does everything
    // For now, let Account.js handle its own modal's direct display.
    // This function could be used if Learn_Time.js needs to explicitly trigger it.
    displayLoginModal();
}

export function hideLoginScreen() {
    hideLoginModal();
}

export function hideAccountPanel() {
    const accountPanel = document.getElementById('account-panel');
    if (accountPanel) {
        accountPanel.classList.add('hidden');
    }
}


// Sound Utility (Example - if you need to play sounds from here)
export function playSound(soundName) {
    if (gameState.soundEnabled && sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(e => console.warn("Sound play failed:", e));
    }
}

// Make gameState accessible to other modules if they import it.
// Other modules should be careful about modifying it directly;
// prefer to call functions in Learn_Time.js that manage state.
// For example, to update score:
export function addScore(points) {
    gameState.totalScore += points;
    gameState.quizScore += points; // If in a quiz context
    updateUserNameDisplays(); // To refresh score on screen
    saveUserData(); // Persist score for current user
}