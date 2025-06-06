import { gameState } from './Learn_Time.js'; // Import gameState

let users = [];
let currentUser = null;

export function loadUsers() {
    const storedUsers = localStorage.getItem('clockKidsUsers');
    users = storedUsers ? JSON.parse(storedUsers) : [];
    // Attempt to load last logged-in user
    const lastUser = localStorage.getItem('clockKidsLastUser');
    if (lastUser) {
        const foundUser = findUser(lastUser);
        if (foundUser) {
            setCurrentUser(foundUser);
        }
    }
}

export function saveUsers() {
    localStorage.setItem('clockKidsUsers', JSON.stringify(users));
}

export function findUser(username) {
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

export function addUser(newUser) {
    if (!findUser(newUser.username)) {
        users.push(newUser);
        saveUsers();
        return true;
    }
    return false; // User already exists
}

export function deleteUser(username) {
    users = users.filter(user => user.username !== username);
    saveUsers();
    if (currentUser && currentUser.username === username) {
        setCurrentUser(null); // Clear current user if deleted
    }
}

export function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        gameState.userName = user.username;
        gameState.totalScore = user.totalScore || 0;
        gameState.dailyProgress = user.dailyProgress || {};
        gameState.highScores = user.highScores || [];
        localStorage.setItem('clockKidsLastUser', user.username);
    } else {
        gameState.userName = '';
        gameState.totalScore = 0;
        // Clear other user-specific gameState properties if necessary
        localStorage.removeItem('clockKidsLastUser');
    }
    saveUserData(); // Save current user's data (or clear it if null)
}

export function getCurrentUser() {
    return currentUser;
}

export function getUserName() {
    return currentUser ? currentUser.username : '';
}

// This function is a bit redundant if setCurrentUser updates gameState directly.
// Kept for now if other parts rely on it.
export function setUserName(name) {
    if (currentUser) {
        currentUser.username = name; // This should ideally not happen, username is an identifier
                                     // If changing username is a feature, it needs more robust handling.
        gameState.userName = name;
        saveUserData();
    }
}

export function loadUserData() {
    // This function is implicitly handled by setCurrentUser loading data into gameState
    // and currentUser object. If there's more specific data to load for a user
    // from a separate storage item, it would go here.
    // For now, user data is part of the 'users' array objects.
    if (currentUser) {
        // Example: If user preferences were stored separately
        // const prefs = localStorage.getItem(`user_${currentUser.username}_prefs`);
        // if (prefs) currentUser.preferences = JSON.parse(prefs);
    }
}

export function saveUserData() {
    if (currentUser) {
        // Find the user in the main 'users' array and update it
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...currentUser, totalScore: gameState.totalScore, dailyProgress: gameState.dailyProgress, highScores: gameState.highScores };
        }
        saveUsers(); // Save the entire users array with updated current user data
        // Example: if (currentUser.preferences) localStorage.setItem(`user_${currentUser.username}_prefs`, JSON.stringify(currentUser.preferences));
    }
}

// Export users array for rendering lists, etc.
export function getUsers() {
    return users;
}
