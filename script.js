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
    const modalYesBtn = document.getElementById("modal-yes-btn");
    const modalNoBtn = document.getElementById("modal-no-btn");
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

    // UI Helper Functions
    function show(element) { if (element) element.classList.remove('hidden'); }
    function hide(element) { if (element) element.classList.add('hidden'); }

    function showNotification(message, isError = false) {
        notificationContainer.textContent = message;
        notificationContainer.style.backgroundColor = isError ? '#dc3545' : 'rgba(0, 0, 0, 0.8)';
        notificationContainer.classList.add("show");
        setTimeout(() => { notificationContainer.classList.remove("show"); }, 3000);
    }

    // Cryptography and Hashing
    async function hashPin(pin, salt) {
        const data = new TextEncoder().encode(salt + pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    function generateSalt() {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
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
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const user = { id: new Uint8Array(16), name: "user", displayName: "User" };
        window.crypto.getRandomValues(user.id);
        const publicKey = { challenge, rp: { name: window.location.hostname }, user, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { requireResidentKey: false, userVerification: "preferred" }, attestation: "none" };
        try {
            const credential = await navigator.credentials.create({ publicKey });
            if (credential) {
                localStorage.setItem("webauthnCredential", JSON.stringify({ id: credential.id, rawId: Array.from(new Uint8Array(credential.rawId)), type: credential.type }));
                showNotification("WebAuthn registered successfully.");
            }
        } catch (error) {
            showNotification("WebAuthn registration failed: " + error.message, true);
        }
    }
    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    async function loginWithWebAuthn() {
        if (!window.PublicKeyCredential) return showNotification("WebAuthn is not supported.");
        const credentialInfo = localStorage.getItem("webauthnCredential");
        if (!credentialInfo) return showNotification("No WebAuthn credential found.");
        const parsedCredential = JSON.parse(credentialInfo);
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const publicKey = { challenge, allowCredentials: [{ id: new Uint8Array(parsedCredential.rawId).buffer, type: 'public-key', transports: ['internal'] }], userVerification: "preferred" };
        try {
            const assertion = await navigator.credentials.get({ publicKey });
            if (assertion) {
                showNotification("WebAuthn authentication successful.");
                const storedPinHash = pin;
                const storedSalt = localStorage.getItem("pinSalt");
                if (!storedPinHash || !storedSalt) return logout();
                showCustomAlert("Please enter your PIN to decrypt secrets.", async (resultPin) => {
                    if (resultPin) {
                        if (await hashPin(resultPin, storedSalt) === storedPinHash) {
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
                        } else {
                            showNotification("Incorrect PIN.", true);
                            logout();
                        }
                    } else {
                        logout();
                    }
                }, true);
            }
        } catch (error) {
            showNotification("WebAuthn authentication failed: " + error.message, true);
        }
    }

    // Network and Time Functions
    async function fetchServerTime() {
        try {
            const response = await fetch('https://worldtimeapi.org/api/ip', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Server responded with ${response.status}`);
            const data = await response.json();
            serverTimeOffset = new Date(data.datetime).getTime() - Date.now();
            timeStatusDisplay.textContent = "Online";
            timeStatusDisplay.className = "online";
        } catch (error) {
            serverTimeOffset = 0;
            timeStatusDisplay.textContent = "Offline";
            timeStatusDisplay.className = "";
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

    // Core Application Logic
    async function login() {
        const enteredPin = pinInput.value;
        const storedSalt = localStorage.getItem("pinSalt");
        if (pin && storedSalt) {
            if (await hashPin(enteredPin, storedSalt) === pin) {
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
    }
    function logout() {
        stopOtpGenerator();
        clearLogoutTimer();
        hide(otpContainer);
        show(loginContainer);
        hide(addOtpSection);
        otpListDiv.innerHTML = "";
        pinInput.focus();
        currentEncryptionKey = null;
    }
    function resetData() {
        showCustomAlert("Are you sure you want to delete all data?", (result) => {
            if (result) {
                localStorage.clear();
                pin = null; otpAccounts = [];
                stopOtpGenerator(); clearLogoutTimer();
                hide(otpContainer); hide(loginContainer);
                show(setPinContainer);
                newPinInput.focus();
                showNotification("All data has been reset.");
            }
        });
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
    function deleteOtpAccount(accountId) {
        const account = otpAccounts.find(acc => acc.id === accountId);
        if (account) showCustomAlert(`Delete "${account.name}"?`, (result) => {
            if (result) {
                otpAccounts = otpAccounts.filter(acc => acc.id !== accountId);
                saveOtpAccounts();
                displayOtpList();
            }
        });
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
            otpInput.type = 'text'; otpInput.className = 'otp-display'; otpInput.readOnly = true; otpInput.value = '------'; otpInput.id = `otp-display-${account.id}`;
            const timer = document.createElement('span');
            timer.className = 'otp-timer';
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn'; copyBtn.textContent = 'Copy'; copyBtn.onclick = () => copyToClipboard(otpInput.value);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn'; deleteBtn.textContent = 'Delete'; deleteBtn.onclick = () => deleteOtpAccount(account.id);
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
                otpEl.value = generateTOTPCode(secret, getCurrentTimeWithOffset());
            } catch (e) { otpEl.value = "Error"; }
        }
    }
    function updateOtpTimers() {
        const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
        document.querySelectorAll('.otp-timer').forEach(timer => timer.textContent = `${secondsRemaining}s`);
    }

    // Robust Custom Alert
    function showCustomAlert(message, callback, isPinPrompt = false) {
        modalMessage.textContent = message;
        
        let pinInputEl = null;

        const handleResult = (result) => {
            let callbackResult = result;
            if (isPinPrompt && result) {
                const pinValue = pinInputEl.value;
                if (pinValue && pinValue.length === 4 && /^\d+$/.test(pinValue)) {
                    callbackResult = pinValue;
                } else {
                    showNotification("PIN must be 4 digits.", true);
                    return;
                }
            }
            cleanup();
            callback(callbackResult);
        };

        const onYesClick = () => handleResult(true);
        const onNoClick = () => handleResult(false);
        const onEnterPress = (e) => { if (e.key === 'Enter') onYesClick(); };

        const cleanup = () => {
            modalYesBtn.removeEventListener('click', onYesClick);
            modalNoBtn.removeEventListener('click', onNoClick);
            if (pinInputEl) pinInputEl.removeEventListener('keypress', onEnterPress);
            hide(customAlertModal);
            modalMessage.innerHTML = '';
        };

        if (isPinPrompt) {
            const input = document.createElement('input');
            input.type = 'password'; input.maxLength = 4; input.id = 'pin-prompt-input'; input.inputMode = 'numeric';
            modalMessage.appendChild(document.createElement('br'));
            modalMessage.appendChild(input);
            pinInputEl = input;
            pinInputEl.addEventListener('keypress', onEnterPress);
            input.focus();
        }

        modalYesBtn.addEventListener('click', onYesClick);
        modalNoBtn.addEventListener('click', onNoClick);
        show(customAlertModal);
    }
    
    // Utilities
    function copyToClipboard(text) { if (text && text.length === 6) navigator.clipboard.writeText(text).then(() => showNotification('Copied!')).catch(() => showNotification('Copy failed.', true)); }
    function startOtpGenerator() {
        stopOtpGenerator();
        updateDisplayedOTPs();
        timerInterval = setInterval(updateOtpTimers, 1000);
        const delay = (30 - (new Date().getSeconds() % 30)) * 1000;
        otpInterval = setTimeout(function run() { updateDisplayedOTPs(); otpInterval = setTimeout(run, 30000); }, delay);
    }
    function stopOtpGenerator() { clearTimeout(otpInterval); clearInterval(timerInterval); }
    function startLogoutTimer() {
        clearLogoutTimer();
        logoutTimeRemaining = 120;
        logoutCheckInterval = setInterval(checkLogoutStatus, 1000);
    }
    function checkLogoutStatus() {
        const loginTimeStr = localStorage.getItem("loginTime");
        if (loginTimeStr) {
            const [h, m, s] = loginTimeStr.split(":").map(Number);
            const loginDate = new Date();
            loginDate.setHours(h, m, s, 0);
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
    
    // TOTP Generation
    function concatBytes(a, b) { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }
    function base32ToBytes(s) { const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; s = s.toUpperCase().replace(/=+$/, ""); let b = ""; for (let i = 0; i < s.length; i++) b += c.indexOf(s[i]).toString(2).padStart(5, "0"); const r = new Uint8Array(Math.floor(b.length / 8)); for (let i = 0; i < r.length; i++) r[i] = parseInt(b.substring(i * 8, (i + 1) * 8), 2); return r; }
    function timeToBytes(t) { const b = new ArrayBuffer(8); const v = new DataView(b); v.setUint32(0, 0, false); v.setUint32(4, t, false); return new Uint8Array(b); }
    function sha1(i) { function r(n, s) { return (n << s) | (n >>> (32 - s)); } const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]; const B = Array.from(i); const L = B.length * 8; B.push(0x80); while (B.length % 64 !== 56) B.push(0); B.push(L >>> 24 & 0xff, L >>> 16 & 0xff, L >>> 8 & 0xff, L & 0xff); for (let j = 0; j < B.length; j += 64) { const w = new Array(80); for (let k = 0; k < 16; k++) w[k] = (B[j + k * 4] << 24) | (B[j + k * 4 + 1] << 16) | (B[j + k * 4 + 2] << 8) | B[j + k * 4 + 3]; for (let k = 16; k < 80; k++) w[k] = r(w[k - 3] ^ w[k - 8] ^ w[k - 14] ^ w[k - 16], 1); let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4]; for (let k = 0; k < 80; k++) { const f = k < 20 ? (b & c) | (~b & d) : k < 40 ? b ^ c ^ d : k < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d; const K = k < 20 ? 0x5a827999 : k < 40 ? 0x6ed9eba1 : k < 60 ? 0x8f1bbcdc : 0xca62c1d6; const t = (r(a, 5) + f + e + K + w[k]) >>> 0; e = d; d = c; c = r(b, 30); b = a; a = t; } H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0; } const h = new Uint8Array(20); for (let j = 0; j < 5; j++) { h[j * 4] = H[j] >>> 24; h[j * 4 + 1] = H[j] >>> 16; h[j * 4 + 2] = H[j] >>> 8; h[j * 4 + 3] = H[j]; } return h; }
    function hmacSha1(k, d) { const z = 64; if (k.length > z) k = sha1(k); const p = new Uint8Array(z); p.set(k); const o = new Uint8Array(z), i = new Uint8Array(z); for (let j = 0; j < z; j++) { o[j] = p[j] ^ 0x5c; i[j] = p[j] ^ 0x36; } return sha1(concatBytes(o, sha1(concatBytes(i, d)))); }
    
    function generateTOTPCode(s, t) {
        if (!s) return "Error";
        try {
            const timeStep = Math.floor((t ? t.getTime() : Date.now()) / 1000 / 30);
            const timeBytes = timeToBytes(timeStep);
            const secretBytes = base32ToBytes(s);
            const hmacOutput = hmacSha1(secretBytes, timeBytes);
            const offset = hmacOutput[hmacOutput.length - 1] & 0x0f;
            const truncatedHash = ((hmacOutput[offset] & 0x7f) << 24) | ((hmacOutput[offset + 1] & 0xff) << 16) | ((hmacOutput[offset + 2] & 0xff) << 8) | (hmacOutput[offset + 3] & 0xff);
            const otp = truncatedHash % 1000000;
            return otp.toString().padStart(6, "0");
        } catch (e) {
            console.error("OTP Generation Error:", e);
            return "Error";
        }
    }

    // Initialization
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
        loginBtn.addEventListener("click", login);
        logoutBtn.addEventListener("click", logout);
        setPinBtn.addEventListener("click", setNewPin);
        addOtpBtn.addEventListener("click", addNewOTPAccount);
        resetBtnLogin.addEventListener("click", resetData);
        resetBtnSetPin.addEventListener("click", resetData);
        pinInput.addEventListener("keypress", e => e.key === "Enter" && login());
        newPinInput.addEventListener("keypress", e => e.key === "Enter" && setNewPin());
        newSecretKeyInput.addEventListener("keypress", e => e.key === "Enter" && addNewOTPAccount);
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