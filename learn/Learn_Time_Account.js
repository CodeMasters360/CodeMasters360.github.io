import { getUsers, findUser, addUser, setCurrentUser, getCurrentUser, deleteUser } from './Learn_Time_User.js';
import { updateUserNameDisplays, showMainScreen, showLoginScreen, hideLoginScreen, hideAccountPanel } from './Learn_Time.js'; // Assuming these are exported from Learn_Time.js

// DOM Elements for login/register modal
const loginModal = document.getElementById('login-modal');
const userListSection = document.getElementById('user-list-section');
const userListDiv = document.getElementById('user-list');
const loginSection = document.getElementById('login-section');
const loginUsernameLabel = document.getElementById('login-username-label');
// const loginPinInput = document.getElementById('login-pin-input'); // Replaced
const registerSection = document.getElementById('register-section');
const registerUsernameInput = document.getElementById('register-username-input');
// const registerPinInput = document.getElementById('register-pin-input'); // Replaced
const loginError = document.getElementById('login-error');

// DOM Elements for account panel
const accountPanel = document.getElementById('account-panel');
const accountUsernameSpan = document.getElementById('account-username');

// DOM Elements for Delete Confirmation Modal
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const confirmDeleteActionBtn = document.getElementById('confirm-delete-action-btn');
const cancelDeleteActionBtn = document.getElementById('cancel-delete-action-btn');


let currentLoginUsername = ''; // To store username for login attempt

function setupPinEventListeners(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const inputs = Array.from(container.getElementsByClassName('pin-digit'));

    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Ensure only numbers are kept, and only one character
            input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);
            
            if (input.value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                // If current input is empty and it's not the first one, move to previous
                if (!input.value && index > 0) {
                    inputs[index - 1].focus();
                    // inputs[index - 1].value = ''; // Optionally clear previous too, but default backspace behavior on an empty field will move focus after this.
                }
                // If current input has value, backspace will clear it.
                // The next backspace (if field becomes empty) will trigger the above.
            } else if (e.key === 'ArrowLeft' && index > 0) {
                inputs[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                inputs[index + 1].focus();
            } else if (e.key.length === 1 && !/[0-9]/.test(e.key) && e.key !== 'Tab' && e.key !== 'Enter') {
                // Prevent non-numeric keys (except navigation/control keys)
                e.preventDefault();
            }
        });

        // Select all text on focus for easier replacement
        input.addEventListener('focus', () => {
            input.select();
        });
    });
}

function getPinFromContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return '';
    const inputs = Array.from(container.getElementsByClassName('pin-digit'));
    return inputs.map(input => input.value).join('');
}

function clearPinContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const inputs = Array.from(container.getElementsByClassName('pin-digit'));
    inputs.forEach(input => input.value = '');
    if (inputs.length > 0) {
        inputs[0].focus(); // Focus the first digit on clear
    }
}

export function initializeAccountSystem() {
    // Login Modal Buttons
    document.getElementById('show-register-btn').addEventListener('click', showRegisterSection);
    document.getElementById('login-btn').addEventListener('click', handleLoginAttempt);
    document.getElementById('login-back-btn').addEventListener('click', showUserListSection);
    document.getElementById('register-btn').addEventListener('click', handleRegistrationAttempt);
    document.getElementById('register-back-btn').addEventListener('click', showUserListSection);

    // Account Panel Buttons
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('delete-account-btn').addEventListener('click', handleDeleteAccountRequest); // Renamed to avoid conflict
    document.getElementById('close-account-panel-btn').addEventListener('click', () => {
        hideAccountPanel();
        // showMainScreen('main_menu'); // Let the main screen logic handle itself or ensure it's visible
    });

    // Delete Confirmation Modal Buttons
    confirmDeleteActionBtn.addEventListener('click', performDeleteAccount);
    cancelDeleteActionBtn.addEventListener('click', hideDeleteConfirmModal);

    // Initialize PIN input behaviors
    setupPinEventListeners('login-pin-container');
    setupPinEventListeners('register-pin-container');
}

export function displayLoginModal() {
    clearLoginError();
    renderUserList();
    showUserListSection(); // Start with user list
    loginModal.classList.remove('hidden');
}

export function hideLoginModal() {
    loginModal.classList.add('hidden');
    clearLoginError();
}

function clearLoginError() {
    if (loginError) loginError.textContent = '';
}

function setLoginError(message) {
    if (loginError) loginError.textContent = message;
}

export function renderUserList() {
    userListDiv.innerHTML = '';
    const allUsers = getUsers();
    if (allUsers.length === 0) {
        userListDiv.innerHTML = '<p>No users registered yet. Please register.</p>';
    } else {
        allUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-list-item';
            item.textContent = user.username;
            item.addEventListener('click', () => selectUserForLogin(user.username));
            userListDiv.appendChild(item);
        });
    }
}

function showUserListSection() {
    userListSection.classList.remove('hidden');
    loginSection.classList.add('hidden');
    registerSection.classList.add('hidden');
    clearLoginError();
}

function selectUserForLogin(username) {
    loginUsernameLabel.textContent = `Logging in as: ${username}`;
    currentLoginUsername = username; // Store username
    clearPinContainer('login-pin-container'); // Clear PIN input squares
    userListSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    registerSection.classList.add('hidden');
    clearLoginError();
    // loginPinInput.dataset.username = username; // No longer needed
}

function showRegisterSection() {
    registerUsernameInput.value = '';
    clearPinContainer('register-pin-container'); // Clear PIN input squares
    userListSection.classList.add('hidden');
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
    clearLoginError();
    // Ensure other modals are hidden if this one is shown as part of a flow
    if (accountPanel) accountPanel.classList.add('hidden');
    if (deleteConfirmModal) deleteConfirmModal.classList.add('hidden');
}

function handleLoginAttempt() {
    const username = currentLoginUsername; // Use stored username
    const pin = getPinFromContainer('login-pin-container');
    const user = findUser(username);

    if (pin.length !== 4) {
        setLoginError('PIN must be 4 digits.');
        return;
    }

    if (user && user.pin === pin) {
        setCurrentUser(user);
        updateUserNameDisplays();
        hideLoginModal();
        showMainScreen('main-menu'); // Corrected from 'main_menu'
        clearLoginError();
    } else {
        setLoginError('Invalid username or PIN. Please try again.');
        clearPinContainer('login-pin-container');
    }
}

function handleRegistrationAttempt() {
    const username = registerUsernameInput.value.trim();
    const pin = getPinFromContainer('register-pin-container');

    if (!username) {
        setLoginError('Username cannot be empty.');
        return;
    }
    if (pin.length !== 4) {
        setLoginError('PIN must be 4 digits.');
        return;
    }
    // PIN validation (is numeric) is implicitly handled by getPinFromContainer and input listeners
    // but an explicit check here for safety is good.
    if (!/^\d{4}$/.test(pin)) {
        setLoginError('PIN must contain only digits.');
        clearPinContainer('register-pin-container');
        return;
    }

    if (username.length < 3 || username.length > 20) {
        setLoginError('Username must be between 3 and 20 characters.');
        return;
    }

    const existingUser = findUser(username);
    if (existingUser) {
        setLoginError('Username already taken. Please choose another.');
        return;
    }

    const newUser = {
        username,
        pin,
        totalScore: 0,
        dailyProgress: {},
        highScores: []
    };
    addUser(newUser);
    setCurrentUser(newUser);
    updateUserNameDisplays();
    hideLoginModal();
    showMainScreen('main-menu'); // Corrected from 'main_menu'
    clearLoginError();
}

export function displayAccountPanel() {
    const user = getCurrentUser();
    if (user) {
        accountUsernameSpan.textContent = user.username;
        accountPanel.classList.remove('hidden');
        // Ensure other modals are hidden
        if (loginModal) loginModal.classList.add('hidden');
        if (deleteConfirmModal) deleteConfirmModal.classList.add('hidden');
    } else {
        // Should not happen if called correctly, but handle defensively
        displayLoginModal(); // Or show an error
    }
}


function handleLogout() {
    setCurrentUser(null); // Clears current user and last user from localStorage
    updateUserNameDisplays(); // Update UI to reflect "Guest" or empty
    hideAccountPanel();
    showLoginScreen(); // Use the new function from Learn_Time.js
}

function showDeleteConfirmModal() {
    const user = getCurrentUser();
    if (user) {
        deleteConfirmMessage.textContent = `Are you sure you want to delete the account for "${user.username}"? This action cannot be undone.`;
        deleteConfirmModal.classList.remove('hidden');
        // Optionally hide the account panel while confirm modal is up
        // accountPanel.classList.add('hidden'); 
    }
}

function hideDeleteConfirmModal() {
    deleteConfirmModal.classList.add('hidden');
    // If account panel was hidden, re-show it or decide next step
    // if (getCurrentUser()) accountPanel.classList.remove('hidden'); 
}

function handleDeleteAccountRequest() {
    const user = getCurrentUser();
    if (user) {
        showDeleteConfirmModal();
    }
    // No 'else' needed as button should only be visible if user is logged in.
}

function performDeleteAccount() {
    const user = getCurrentUser();
    if (user) {
        deleteUser(user.username);
        setCurrentUser(null);
        updateUserNameDisplays();
        hideDeleteConfirmModal();
        hideAccountPanel();
        showLoginScreen();
    }
}
