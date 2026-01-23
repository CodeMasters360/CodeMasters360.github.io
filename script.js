document.addEventListener("DOMContentLoaded", function () {
    // Element References
    const pinInput = document.getElementById("pin-input");
    const loginBtn = document.getElementById("login-btn");
    const otpContainer = document.querySelector(".otp-container");
    const otpListDiv = document.getElementById("otp-list");
    const addOtpBtn = document.getElementById("add-otp-btn");
    const accountNameInput = document.getElementById("account-name-input");
    const newSecretKeyInput = document.getElementById("new-secret-key-input");
    const logoutBtn = document.getElementById("logout-btn");
    const setPinContainer = document.querySelector(".set-pin-container");
    const newPinInput = document.getElementById("new-pin-input");
    const setPinBtn = document.getElementById("set-pin-btn");
    const loginContainer = document.querySelector(".login-container");
    const resetBtnLogin = document.getElementById("reset-btn-login");
    const resetBtnSetPin = document.getElementById("reset-btn-setpin");
    const logoutCountdownElement = document.getElementById("logout-countdown");
    const customAlertModal = document.getElementById("custom-alert-modal");
    const modalMessage = document.getElementById("modal-message");
    let modalYesBtn = document.getElementById("modal-yes-btn");
    let modalNoBtn = document.getElementById("modal-no-btn");
    const showAddOtpBtn = document.getElementById("show-add-otp-btn");
    const addOtpSection = document.getElementById("add-otp-section");
    const notificationContainer = document.getElementById("notification-container");
    const currentTimeDisplay = document.getElementById("current-time");
    const timeStatusDisplay = document.getElementById("time-status");
    const summerTimeToggle = document.getElementById("summer-time-toggle");
    const registerWebAuthnBtn = document.getElementById("register-webauthn-btn");
    const loginWebAuthnBtn = document.getElementById("login-webauthn-btn");

    // State Variables
    let pin = null;
    let otpAccounts = [];
    let otpInterval;
    let timerInterval;
    let logoutCheckInterval;
    let logoutTimeRemaining = 120;
    let isSummerTime = false;
    let serverTimeOffset = 0;
    let currentEncryptionKey = null;

    // --- UI Helper Functions ---
    function show(element) { if (element) element.classList.remove('hidden'); }
    function hide(element) { if (element) element.classList.add('hidden'); }
    function showNotification(message, isError = false) {
        notificationContainer.textContent = message;
        notificationContainer.style.backgroundColor = isError ? '#dc3545' : 'rgba(0, 0, 0, 0.8)';
        notificationContainer.classList.add("show");
        setTimeout(() => { notificationContainer.classList.remove("show"); }, 3000);
    }

    // --- Custom Alert Modal (Callback-based, NOT Promise) ---
    function showCustomAlert(message, callback, isPinPrompt = false) {
        modalMessage.innerHTML = '';
        modalMessage.textContent = message;
        let pinInputEl = null;

        // Remove previous event listeners
        modalYesBtn.onclick = null;
        modalNoBtn.onclick = null;

        if (isPinPrompt) {
            const input = document.createElement('input');
            input.type = 'password';
            input.maxLength = 4;
            input.id = 'pin-prompt-input';
            input.inputMode = 'numeric';
            input.style.width = 'calc(100% - 22px)';
            input.style.padding = '10px';
            input.style.marginTop = '10px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';
            modalMessage.appendChild(document.createElement('br'));
            modalMessage.appendChild(input);
            pinInputEl = input;
            input.focus();

            modalYesBtn.onclick = function () {
                const pinValue = pinInputEl.value;
                if (pinValue && pinValue.length === 4 && /^\d+$/.test(pinValue)) {
                    callback(pinValue);
                    hideCustomAlert();
                } else {
                    showNotification("PIN must be exactly 4 numeric digits.", true);
                }
            };
        } else {
            modalYesBtn.onclick = function () {
                callback(true);
                hideCustomAlert();
            };
        }
        modalNoBtn.onclick = function () {
            callback(false);
            hideCustomAlert();
        };
        customAlertModal.style.display = "block";
    }

    function hideCustomAlert() {
        modalMessage.innerHTML = '';
        customAlertModal.style.display = "none";
        modalYesBtn.onclick = null;
        modalNoBtn.onclick = null;
    }

    // --- Cryptography and Hashing ---
    async function hashPin(pin, salt) {
        const data = new TextEncoder().encode(salt + pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    function generateSalt() {
        const randomBytes = new Uint8Array(16); crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async function deriveKeyFromPin(pin, salt) {
        const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), { name: "PBKDF2" }, false, ["deriveKey"]);
        return await crypto.subtle.deriveKey({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    }
    async function encryptSecret(secret, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(secret));
        return { iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''), ciphertext: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('') };
    }
    async function decryptSecret(encryptedData, key) {
        const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const ciphertext = new Uint8Array(encryptedData.ciphertext.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
        return new TextDecoder().decode(decryptedData);
    }
    
    // WebAuthn Functions
    async function registerWebAuthn() {
        if (!window.PublicKeyCredential) return showNotification("WebAuthn is not supported.");
        const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
        const user = { id: new Uint8Array(16), name: "user", displayName: "User" }; window.crypto.getRandomValues(user.id);
        const publicKey = { challenge, rp: { name: window.location.hostname }, user, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { requireResidentKey: false, userVerification: "preferred" }, attestation: "none" };
        try {
            const credential = await navigator.credentials.create({ publicKey });
            if (credential) {
                localStorage.setItem("webauthnCredential", JSON.stringify({ id: credential.id, rawId: Array.from(new Uint8Array(credential.rawId)), type: credential.type }));
                showNotification("WebAuthn registered successfully.");
            }
        } catch (error) { showNotification("WebAuthn registration failed: " + error.message, true); }
    }
    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
        return bytes.buffer;
    }
    async function loginWithWebAuthn() {
        if (!window.PublicKeyCredential) return showNotification("WebAuthn is not supported.");
        const credentialInfo = localStorage.getItem("webauthnCredential");
        if (!credentialInfo) return showNotification("No WebAuthn credential found.");
        const parsedCredential = JSON.parse(credentialInfo);
        const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
        const publicKey = { challenge, allowCredentials: [{ id: new Uint8Array(parsedCredential.rawId).buffer, type: 'public-key', transports: ['internal'] }], userVerification: "preferred" };
        try {
            const assertion = await navigator.credentials.get({ publicKey });
            if (assertion) {
                showNotification("WebAuthn authentication successful.");
                const resultPin = await showCustomAlert("Please enter your PIN to decrypt secrets.", true);
                if (resultPin && await hashPin(resultPin, localStorage.getItem("pinSalt")) === pin) {
                    hide(loginContainer);
                    show(otpContainer);
                    pinInput.value = "";
                    localStorage.setItem("lastUsedPin", resultPin);
                    localStorage.setItem("loginTime", new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
                    currentEncryptionKey = await deriveKeyFromPin(resultPin, localStorage.getItem("encryptionSalt"));
                    await displayOtpList();
                    startOtpGenerator();
                    startLogoutTimer();
                    await fetchServerTime();
                } else if (resultPin) {
                    showNotification("Incorrect PIN.", true);
                }
            }
        } catch (error) { showNotification("WebAuthn authentication failed: " + error.message, true); }
    }

    // Network and Time Functions
    async function fetchServerTime() {
        try {
            // تغییر آدرس به http
            const response = await fetch('http://worldtimeapi.org/api/ip', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Server responded with ${response.status}`);
            const data = await response.json();
            serverTimeOffset = new Date(data.datetime).getTime() - Date.now();
            timeStatusDisplay.textContent = "Online";
            timeStatusDisplay.className = "online";
        } catch (error) {
            // اگر خطا بود، از زمان محلی استفاده کن و وضعیت را نمایش بده
            serverTimeOffset = 0;
            timeStatusDisplay.textContent = "Offline";
            timeStatusDisplay.className = "";
            showNotification("Could not fetch server time. Using local time.", true);
            console.warn("Could not fetch server time, using local time.", error.message);
        }
        await updateDisplayedOTPs();
    }
    function getCurrentTimeWithOffset() {
        const adjustedTime = new Date(Date.now() + serverTimeOffset);
        if (isSummerTime) adjustedTime.setTime(adjustedTime.getTime() + 3600000);
        return adjustedTime;
    }
    function updateCurrentTimeDisplay() { currentTimeDisplay.textContent = getCurrentTimeWithOffset().toTimeString().split(' ')[0]; }

    // --- Core Application Logic (FIXED) ---
    async function login() {
        const enteredPin = pinInput.value;
        if (pin && await hashPin(enteredPin, localStorage.getItem("pinSalt")) === pin) {
            hide(loginContainer);
            show(otpContainer);
            pinInput.value = "";
            localStorage.setItem("lastUsedPin", enteredPin);
            localStorage.setItem("loginTime", new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
            currentEncryptionKey = await deriveKeyFromPin(enteredPin, localStorage.getItem("encryptionSalt"));
            await displayOtpList();
            startOtpGenerator();
            startLogoutTimer();
            await fetchServerTime();
        } else {
            showNotification("Incorrect PIN.", true);
            pinInput.value = "";
        }
    }
    function logout() {
        stopOtpGenerator(); clearLogoutTimer();
        hide(otpContainer); show(loginContainer);
        hide(addOtpSection); otpListDiv.innerHTML = "";
        pinInput.focus(); currentEncryptionKey = null;
    }
    function resetData() {
        showCustomAlert(
            "Are you sure you want to delete all data (PIN and OTP accounts)? This action is irreversible.",
            async function (result) {
                if (result) {
                    localStorage.clear();

                    // Unregister service workers
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
                        }
                    }

                    // Clear all caches
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }

                    pin = null;
                    otpAccounts = [];
                    currentEncryptionKey = null;
                    stopOtpGenerator();
                    clearLogoutTimer();
                    hide(otpContainer);
                    hide(loginContainer);
                    show(setPinContainer);
                    newPinInput.focus();
                    showNotification("All data has been reset successfully. Please set a new PIN.");
                }
            }
        );
    }
    async function setNewPin() {
        const newPin = newPinInput.value;
        if (newPin && newPin.length === 4 && /^\d+$/.test(newPin)) {
            const salt = generateSalt();
            pin = await hashPin(newPin, salt);
            localStorage.setItem("pin", pin);
            localStorage.setItem("pinSalt", salt);
            localStorage.setItem("lastUsedPin", newPin);
            localStorage.setItem("encryptionSalt", generateSalt());
            hide(setPinContainer);
            show(loginContainer);
            newPinInput.value = "";
            showNotification("PIN set successfully.");
            pinInput.focus();
        } else {
            showNotification("PIN must be exactly 4 numeric digits.", true);
        }
    }
    async function addNewOTPAccount() {
        const accountName = accountNameInput.value.trim();
        const newSecretKey = newSecretKeyInput.value.trim().toUpperCase().replace(/\s+/g, "");
        if (!accountName || !newSecretKey) return showNotification("Please fill in both fields.", true);
        if (currentEncryptionKey) {
            const encrypted = await encryptSecret(newSecretKey, currentEncryptionKey);
            otpAccounts.push({ id: Date.now(), name: accountName, encryptedSecret: encrypted.ciphertext, iv: encrypted.iv });
            saveOtpAccounts();
            await displayOtpList();
            accountNameInput.value = ""; newSecretKeyInput.value = "";
            showNotification("OTP account added.");
        }
    }
    async function deleteOtpAccount(accountId) {
        const accountToDelete = otpAccounts.find(acc => acc.id === accountId);
        if (accountToDelete) {
            showCustomAlert(
                `Are you sure you want to delete the account "${accountToDelete.name}"?`,
                async function (result) {
                    if (result) {
                        otpAccounts = otpAccounts.filter(acc => acc.id !== accountId);
                        saveOtpAccounts();
                        await displayOtpList();
                        showNotification(`Account "${accountToDelete.name}" deleted.`);
                    }
                }
            );
        }
    }
    
    // Display Functions
    async function displayOtpList() {
        otpListDiv.innerHTML = '';
        if (otpAccounts.length === 0) {
            otpListDiv.innerHTML = '<p>No OTP accounts added yet.</p>';
            return;
        }
        otpAccounts.forEach(account => {
            const item = document.createElement('div');
            item.className = 'otp-list-item';
            const name = document.createElement('span'); 
            name.className = 'account-name'; 
            name.textContent = account.name;
            const otpInput = document.createElement('input'); 
            otpInput.type = 'text'; 
            otpInput.className = 'otp-display'; 
            otpInput.readOnly = true; 
            otpInput.value = '------'; 
            otpInput.id = `otp-display-${account.id}`;
            const timer = document.createElement('span'); 
            timer.className = 'otp-timer';
            const copyBtn = document.createElement('button'); 
            copyBtn.className = 'copy-btn'; 
            copyBtn.textContent = 'Copy'; 
            copyBtn.onclick = () => copyToClipboard(otpInput.value);
            const deleteBtn = document.createElement('button'); 
            deleteBtn.className = 'delete-btn'; 
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteOtpAccount(account.id);
            item.append(name, otpInput, timer, copyBtn, deleteBtn);
            otpListDiv.appendChild(item);
        });
        await updateDisplayedOTPs();
        updateOtpTimers();
    }
    async function updateDisplayedOTPs() {
        if (!currentEncryptionKey) return;
        for (const account of otpAccounts) {
            const otpEl = document.getElementById(`otp-display-${account.id}`);
            if (otpEl) try {
                const secret = await decryptSecret({ ciphertext: account.encryptedSecret, iv: account.iv }, currentEncryptionKey);
                otpEl.value = await generateTOTPCode(secret, getCurrentTimeWithOffset());
            } catch (e) { otpEl.value = "Error"; }
        }
    }
    function updateOtpTimers() {
        const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
        document.querySelectorAll('.otp-timer').forEach(timer => timer.textContent = `${secondsRemaining}s`);
    }
    
    // Utilities
    function copyToClipboard(text) { if (text && text.length === 6) navigator.clipboard.writeText(text).then(() => showNotification('Copied!')).catch(() => showNotification('Copy failed.', true)); }
    function startOtpGenerator() {
        stopOtpGenerator();
        updateDisplayedOTPs();
        timerInterval = setInterval(updateOtpTimers, 1000);
        const delay = (30 - (new Date().getSeconds() % 30)) * 1000;
        otpInterval = setTimeout(async function run() { await updateDisplayedOTPs(); otpInterval = setTimeout(run, 30000); }, delay);
    }
    function stopOtpGenerator() { clearTimeout(otpInterval); clearInterval(timerInterval); }
    function startLogoutTimer() {
        clearLogoutTimer(); logoutTimeRemaining = 120;
        logoutCheckInterval = setInterval(checkLogoutStatus, 1000);
    }
    function checkLogoutStatus() {
        const loginTimeStr = localStorage.getItem("loginTime");
        if (loginTimeStr) {
            const [h, m, s] = loginTimeStr.split(":").map(Number);
            const loginDate = new Date(); loginDate.setHours(h, m, s, 0);
            if ((Date.now() - loginDate.getTime()) / 1000 >= 120) logout();
            else {
                logoutTimeRemaining = Math.max(0, 120 - Math.floor((Date.now() - loginDate.getTime()) / 1000));
                updateLogoutCountdownDisplay();
            }
        }
    }
    function clearLogoutTimer() { clearInterval(logoutCheckInterval); if(logoutCountdownElement) logoutCountdownElement.textContent = ""; }
    function updateLogoutCountdownDisplay() { if(logoutCountdownElement) logoutCountdownElement.textContent = `Auto logout in: ${Math.floor(logoutTimeRemaining / 60)}:${(logoutTimeRemaining % 60).toString().padStart(2, '0')}`; }
    
    // Storage Functions
    async function loadPin() { pin = localStorage.getItem("pin"); }
    function loadOtpAccounts() { try { otpAccounts = JSON.parse(localStorage.getItem("otpAccounts")) || []; } catch { otpAccounts = []; } }
    function saveOtpAccounts() { localStorage.setItem("otpAccounts", JSON.stringify(otpAccounts)); }
    
    // --- TOTP Generation using Web Crypto API (REWRITTEN & FIXED) ---
    function base32ToBytes(s) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        s = s.toUpperCase().replace(/=+$/, "");
        let bits = "";
        for (let i = 0; i < s.length; i++) {
            const charIndex = alphabet.indexOf(s[i]);
            if (charIndex === -1) throw new Error("Invalid base32 character");
            bits += charIndex.toString(2).padStart(5, '0');
        }
        const result = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < result.length; i++) { result[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2); }
        return result;
    }
    async function generateTOTPCode(secret, time) {
        if (!secret) return "Error";
        try {
            const secretBytes = base32ToBytes(secret);
            const timeStep = Math.floor((time ? time.getTime() : Date.now()) / 1000 / 30);
            
            const timeBuffer = new ArrayBuffer(8);
            const timeView = new DataView(timeBuffer);
            timeView.setUint32(0, 0, false);
            timeView.setUint32(4, timeStep, false);

            const key = await crypto.subtle.importKey( 'raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'] );
            const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
            const hmacResult = new Uint8Array(signature);
            
            const offset = hmacResult[hmacResult.length - 1] & 0x0f;
            const truncatedHash = ((hmacResult[offset] & 0x7f) << 24) |
                                  ((hmacResult[offset + 1] & 0xff) << 16) |
                                  ((hmacResult[offset + 2] & 0xff) << 8) |
                                  (hmacResult[offset + 3] & 0xff);
                                  
            const otp = truncatedHash % 1000000;
            return otp.toString().padStart(6, "0");
        } catch (e) {
            console.error("OTP Generation Error:", e);
            return "Error";
        }
    }

    // --- Initialization ---
    async function initializeApp() {
        await loadPin();
        loadOtpAccounts();
        if (pin) {
            show(loginContainer);
            hide(setPinContainer);
            pinInput.focus();
        } else {
            show(setPinContainer);
            hide(loginContainer);
            newPinInput.focus();
        }
        
        // Event listeners with proper error handling
        resetBtnLogin.addEventListener("click", resetData);
        resetBtnSetPin.addEventListener("click", resetData);
        loginBtn.addEventListener("click", login);
        logoutBtn.addEventListener("click", logout);
        setPinBtn.addEventListener("click", setNewPin);
        addOtpBtn.addEventListener("click", addNewOTPAccount);
        pinInput.addEventListener("keypress", e => e.key === "Enter" && login());
        newPinInput.addEventListener("keypress", e => e.key === "Enter" && setNewPin());
        newSecretKeyInput.addEventListener("keypress", e => e.key === "Enter" && addNewOTPAccount());
        showAddOtpBtn.addEventListener("click", () => addOtpSection.classList.toggle('hidden'));
        summerTimeToggle.addEventListener('change', () => { isSummerTime = summerTimeToggle.checked; updateDisplayedOTPs(); });
        registerWebAuthnBtn.addEventListener("click", registerWebAuthn);
        loginWebAuthnBtn.addEventListener("click", loginWithWebAuthn);
        
        updateCurrentTimeDisplay();
        setInterval(updateCurrentTimeDisplay, 1000);
        await fetchServerTime();
        setInterval(fetchServerTime, 60000);
        window.addEventListener('online', fetchServerTime);
        window.addEventListener('offline', fetchServerTime);
    }
    initializeApp();
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !otpContainer.classList.contains('hidden')) startOtpGenerator();
        else if (document.hidden) stopOtpGenerator();
    });
});