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
            else if (screenId === 'scores-screen') renderScores();
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

// Score Management and Display Functions
export function renderScores() {
    const scoresListContainer = document.querySelector('#scores-screen .scores-list');
    if (!scoresListContainer) return;

    const currentUser = getCurrentUser();
    const allUsers = getUsers();

    // Sort users by total score (highest first)
    const rankedUsers = [...allUsers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    let scoresHTML = '';

    if (rankedUsers.length === 0) {
        scoresHTML = '<div class="no-scores">No users registered yet. Start playing to create scores!</div>';
    } else {
        // Leaderboard header with icon
        scoresHTML += `
            <div class="scores-header-modern">
                <div class="scores-title-row">
                    <span class="scores-trophy-icon">🏆</span>
                    <h3>Leaderboard</h3>
                </div>
                <div class="scores-legend-modern">
                    <span class="legend-item">🥇 1st</span>
                    <span class="legend-item">🥈 2nd</span>
                    <span class="legend-item">🥉 3rd</span>
                </div>
            </div>
            <div class="scores-cards-list">
        `;

        // Add each user's score as a card
        rankedUsers.forEach((user, index) => {
            const rank = index + 1;
            const isCurrentUser = currentUser && currentUser.username === user.username;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `<span class="rank-num">#${rank}</span>`;
            scoresHTML += `
                <div class="score-card${isCurrentUser ? ' current-user-card' : ''}${rank <= 3 ? ' top-three-card' : ''}">
                    <div class="score-card-rank">${medal}</div>
                    <div class="score-card-info">
                        <div class="score-card-name">${user.username}${isCurrentUser ? ' <span class="you-label">(You)</span>' : ''}</div>
                        <div class="score-card-score"><span class="score-icon">⭐</span> ${user.totalScore || 0}</div>
                        <div class="score-card-status">${getPlayerStatus(user.totalScore || 0)}</div>
                    </div>
                </div>
            `;
        });

        scoresHTML += '</div>';

        // Add current user's detailed stats if logged in
        if (currentUser) {
            const userRank = rankedUsers.findIndex(u => u.username === currentUser.username) + 1;
            const userScore = currentUser.totalScore || 0;
            const dailyProgress = currentUser.dailyProgress || {};

            scoresHTML += `
                <div class="user-stats-modern">
                    <h3>📊 Your Statistics</h3>
                    <div class="stats-cards-row">
                        <div class="stat-card-modern">
                            <div class="stat-value-modern">${userScore}</div>
                            <div class="stat-label-modern">Total Points</div>
                        </div>
                        <div class="stat-card-modern">
                            <div class="stat-value-modern">${userRank}</div>
                            <div class="stat-label-modern">Your Rank</div>
                        </div>
                        <div class="stat-card-modern">
                            <div class="stat-value-modern">${getTodaysScore(dailyProgress)}</div>
                            <div class="stat-label-modern">Today's Points</div>
                        </div>
                        <div class="stat-card-modern">
                            <div class="stat-value-modern">${getStreakDays(dailyProgress)}</div>
                            <div class="stat-label-modern">Day Streak</div>
                        </div>
                    </div>
                    ${renderDailyProgressChart(dailyProgress)}
                </div>
            `;
        }

        // Add achievements section
        scoresHTML += renderAchievements(currentUser);
    }

    scoresListContainer.innerHTML = scoresHTML;
}

function getPlayerStatus(score) {
    if (score >= 1000) return '🌟 Master';
    if (score >= 500) return '⭐ Expert';
    if (score >= 250) return '📚 Scholar';
    if (score >= 100) return '🎯 Learner';
    if (score >= 50) return '🔰 Beginner';
    return '🆕 Rookie';
}

function getTodaysScore(dailyProgress) {
    const today = new Date().toDateString();
    return dailyProgress[today] || 0;
}

function getStreakDays(dailyProgress) {
    const dates = Object.keys(dailyProgress).sort().reverse();
    let streak = 0;
    let checkDate = new Date();
    
    for (let i = 0; i < dates.length; i++) {
        const dateStr = checkDate.toDateString();
        if (dailyProgress[dateStr] && dailyProgress[dateStr] > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

function renderDailyProgressChart(dailyProgress) {
    // Weekdays starting from Saturday
    const weekdayOrder = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    // Build data for the current Sat-Fri week
    const chartDays = [];
    const today = new Date();

    const firstDayOfChart = new Date(today);
    // Adjust firstDayOfChart to be the Saturday of the current Sat-Fri week period.
    // (today.getDay() + 1) % 7 calculates offset: 0 for Sat, 1 for Sun, ..., 6 for Fri.
    firstDayOfChart.setDate(today.getDate() - ((today.getDay() + 1) % 7));

    for (let i = 0; i < 7; i++) { // Iterate from Saturday (i=0) to Friday (i=6)
        const currentChartDate = new Date(firstDayOfChart);
        currentChartDate.setDate(firstDayOfChart.getDate() + i);
        
        const dateStr = currentChartDate.toDateString();
        const weekdayLabel = weekdayOrder[i]; // 'Sat', 'Sun', ... based on loop index
        const score = dailyProgress[dateStr] || 0;
        
        chartDays.push({
            date: weekdayLabel,
            score: score
        });
    }

    const maxScore = Math.max(...chartDays.map(d => d.score), 10);

    let chartHTML = `
        <div class="daily-progress-modern">
            <h4>📈 Week Progress (Sat-Fri)</h4> <!-- Updated title -->
            <div class="progress-chart-modern">
    `;

    chartDays.forEach(day => {
        const height = maxScore > 0 ? Math.max((day.score / maxScore) * 100, 8) : 8; // Ensure a minimum height for visibility
        chartHTML += `
            <div class="progress-day-modern">
                <div class="progress-bar-modern" style="height: ${height}%" title="${day.score} points"></div>
                <div class="progress-label-modern">${day.date}</div>
                <div class="progress-score-modern">${day.score}</div>
            </div>
        `;
    });

    chartHTML += `
            </div>
        </div>
    `;

    return chartHTML;
}

function renderAchievements(currentUser) {
    const achievements = [
        { id: 'first_score', name: 'First Steps', desc: 'Score your first points', threshold: 1, icon: '🎯' },
        { id: 'fifty_club', name: 'Fifty Club', desc: 'Reach 50 points', threshold: 50, icon: '🔰' },
        { id: 'century', name: 'Century Maker', desc: 'Reach 100 points', threshold: 100, icon: '💯' },
        { id: 'quarter_k', name: 'Quarter Master', desc: 'Reach 250 points', threshold: 250, icon: '📚' },
        { id: 'half_k', name: 'Expert Level', desc: 'Reach 500 points', threshold: 500, icon: '⭐' },
        { id: 'grand', name: 'Time Master', desc: 'Reach 1000 points', threshold: 1000, icon: '🌟' },
    ];
    
    const userScore = currentUser ? (currentUser.totalScore || 0) : 0;
    
    let achievementsHTML = `
        <div class="achievements-section">
            <h3>🏅 Achievements</h3>
            <div class="achievements-grid">
    `;
    
    achievements.forEach(achievement => {
        const unlocked = userScore >= achievement.threshold;
        achievementsHTML += `
            <div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.desc}</div>
                </div>
                <div class="achievement-status">
                    ${unlocked ? '✅' : `${userScore}/${achievement.threshold}`}
                </div>
            </div>
        `;
    });
    
    achievementsHTML += `
            </div>
        </div>
    `;
    
    return achievementsHTML;
}

// Update addScore function to track daily progress
export function addScore(points) {
    gameState.totalScore += points;
    gameState.quizScore += points;
    
    // Track daily progress
    const today = new Date().toDateString();
    if (!gameState.dailyProgress[today]) {
        gameState.dailyProgress[today] = 0;
    }
    gameState.dailyProgress[today] += points;
    
    updateUserNameDisplays();
    saveUserData();
}