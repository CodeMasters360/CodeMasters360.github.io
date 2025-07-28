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
    let modalCallback;
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

    // --- Helper Functions for UI (CSP-compliant) ---
    function show(element) {
        if (element) element.classList.remove('hidden');
    }

    function hide(element) {
        if (element) element.classList.add('hidden');
    }

    function showNotification(message) {
        notificationContainer.textContent = message;
        notificationContainer.classList.add("show");
        setTimeout(() => {
            notificationContainer.classList.remove("show");
        }, 2000);
    }

    async function hashPin(pin, salt) {
        const textEncoder = new TextEncoder();
        const data = textEncoder.encode(salt + pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateSalt() {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function deriveKeyFromPin(pin, salt) {
        const textEncoder = new TextEncoder();
        const pinBytes = textEncoder.encode(pin);
        const saltBytes = textEncoder.encode(salt);
        const baseKey = await crypto.subtle.importKey("raw", pinBytes, { name: "PBKDF2" }, false, ["deriveKey"]);
        return await crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    }

    async function encryptSecret(secret, key) {
        const textEncoder = new TextEncoder();
        const data = textEncoder.encode(secret);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
        return {
            iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
            ciphertext: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('')
        };
    }

    async function decryptSecret(encryptedData, key) {
        const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const ciphertext = new Uint8Array(encryptedData.ciphertext.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
        const textDecoder = new TextDecoder();
        return textDecoder.decode(decryptedData);
    }

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
            showNotification("WebAuthn registration failed: " + error.message);
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
                        const hashedResultPin = await hashPin(resultPin, storedSalt);
                        if (hashedResultPin === storedPinHash) {
                            hide(loginContainer);
                            show(otpContainer);
                            pinInput.value = "";
                            localStorage.setItem("lastUsedPin", resultPin);
                            localStorage.setItem("loginTime", new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
                            const encryptionSalt = localStorage.getItem("encryptionSalt");
                            currentEncryptionKey = await deriveKeyFromPin(resultPin, encryptionSalt);
                            await displayOtpList();
                            startOtpGenerator();
                            startLogoutTimer();
                            await fetchServerTime();
                        } else {
                            showNotification("Incorrect PIN.");
                            logout();
                        }
                    } else {
                        logout();
                    }
                }, true);
            }
        } catch (error) {
            showNotification("WebAuthn authentication failed: " + error.message);
        }
    }

    async function fetchServerTime() {
        try {
            const response = await fetch('http://worldtimeapi.org/api/ip', { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                serverTimeOffset = new Date(data.datetime).getTime() - new Date().getTime();
                timeStatusDisplay.textContent = "Online";
                timeStatusDisplay.className = "online";
            } else {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            console.warn("Could not fetch server time, using local device time.", error.message);
            serverTimeOffset = 0;
            timeStatusDisplay.textContent = "Offline";
            timeStatusDisplay.className = "";
        }
        await updateDisplayedOTPs();
    }

    function getCurrentTimeWithOffset() {
        const adjustedTime = new Date(new Date().getTime() + serverTimeOffset);
        if (isSummerTime) adjustedTime.setTime(adjustedTime.getTime() + 3600000);
        return adjustedTime;
    }

    function updateCurrentTimeDisplay() {
        const now = getCurrentTimeWithOffset();
        currentTimeDisplay.textContent = now.toTimeString().split(' ')[0];
    }

    async function login() {
        const enteredPin = pinInput.value;
        const storedPinHash = pin;
        const storedSalt = localStorage.getItem("pinSalt");
        if (storedPinHash && storedSalt) {
            const hashedEnteredPin = await hashPin(enteredPin, storedSalt);
            if (hashedEnteredPin === storedPinHash) {
                hide(loginContainer);
                show(otpContainer);
                hide(addOtpSection);
                pinInput.value = "";
                localStorage.setItem("lastUsedPin", enteredPin);
                localStorage.setItem("loginTime", new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
                const encryptionSalt = localStorage.getItem("encryptionSalt");
                if (encryptionSalt) {
                    currentEncryptionKey = await deriveKeyFromPin(enteredPin, encryptionSalt);
                    await displayOtpList();
                    startOtpGenerator();
                    startLogoutTimer();
                    await fetchServerTime();
                } else {
                    showNotification("Error: Encryption salt missing.");
                    logout();
                }
            } else {
                showNotification("The entered PIN is incorrect.");
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
        showCustomAlert("Are you sure you want to delete all data?", async (result) => {
            if (result) {
                localStorage.clear();
                pin = null;
                otpAccounts = [];
                stopOtpGenerator();
                clearLogoutTimer();
                hide(otpContainer);
                hide(loginContainer);
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
            showNotification("PIN must be exactly 4 numeric digits.");
        }
    }

    async function addNewOTPAccount() {
        const accountName = accountNameInput.value.trim();
        const newSecretKey = newSecretKeyInput.value.trim().toUpperCase().replace(/\s+/g, "");
        if (!accountName || !newSecretKey) return showNotification("Please fill in both fields.");
        if (currentEncryptionKey) {
            const encrypted = await encryptSecret(newSecretKey, currentEncryptionKey);
            otpAccounts.push({ id: Date.now(), name: accountName, encryptedSecret: encrypted.ciphertext, iv: encrypted.iv });
            saveOtpAccounts();
            await displayOtpList();
            accountNameInput.value = "";
            newSecretKeyInput.value = "";
            showNotification("OTP account added.");
        }
    }

    async function deleteOtpAccount(accountId) {
        const accountToDelete = otpAccounts.find((acc) => acc.id === accountId);
        if (accountToDelete) {
            showCustomAlert(`Delete "${accountToDelete.name}"?`, async (result) => {
                if (result) {
                    otpAccounts = otpAccounts.filter((account) => account.id !== accountId);
                    saveOtpAccounts();
                    await displayOtpList();
                }
            });
        }
    }

    async function displayOtpList() {
        otpListDiv.innerHTML = '';
        if (otpAccounts.length === 0) {
            otpListDiv.innerHTML = '<p>No OTP accounts added yet.</p>';
            return;
        }
        for (const account of otpAccounts) {
            const listItem = document.createElement('div');
            listItem.className = 'otp-list-item';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'account-name';
            nameSpan.textContent = account.name;
            const otpDisplayInput = document.createElement('input');
            otpDisplayInput.type = 'text';
            otpDisplayInput.className = 'otp-display';
            otpDisplayInput.readOnly = true;
            otpDisplayInput.value = '------';
            otpDisplayInput.id = `otp-display-${account.id}`;
            const timerSpan = document.createElement('span');
            timerSpan.className = 'otp-timer';
            timerSpan.id = `otp-timer-${account.id}`;
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.textContent = 'Copy';
            copyButton.onclick = () => copyToClipboard(otpDisplayInput.value);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteOtpAccount(account.id);
            listItem.append(nameSpan, otpDisplayInput, timerSpan, copyButton, deleteBtn);
            otpListDiv.appendChild(listItem);
        }
        await updateDisplayedOTPs();
        updateOtpTimers();
    }

    async function updateDisplayedOTPs() {
        if (!currentEncryptionKey) return;
        for (const account of otpAccounts) {
            const otpDisplayElement = document.getElementById(`otp-display-${account.id}`);
            if (otpDisplayElement) {
                try {
                    const decryptedSecret = await decryptSecret({ ciphertext: account.encryptedSecret, iv: account.iv }, currentEncryptionKey);
                    otpDisplayElement.value = generateTOTPCode(decryptedSecret, getCurrentTimeWithOffset());
                } catch (error) {
                    otpDisplayElement.value = "Error";
                }
            }
        }
    }

    function showCustomAlert(message, callback, isPinPrompt = false) {
        modalMessage.textContent = message;
        if (isPinPrompt) {
            const input = document.createElement('input');
            input.type = 'password';
            input.maxLength = 4;
            input.id = 'pin-prompt-input';
            input.inputMode = 'numeric';
            modalMessage.appendChild(document.createElement('br'));
            modalMessage.appendChild(input);
            input.focus();
            modalYesBtn.onclick = () => {
                const pinValue = input.value;
                if (pinValue && pinValue.length === 4 && /^\d+$/.test(pinValue)) {
                    callback(pinValue);
                    hideCustomAlert();
                } else {
                    showNotification("PIN must be 4 digits.");
                }
            };
        } else {
            modalYesBtn.onclick = () => { callback(true); hideCustomAlert(); };
        }
        modalNoBtn.onclick = () => { callback(false); hideCustomAlert(); };
        show(customAlertModal);
    }

    function hideCustomAlert() {
        hide(customAlertModal);
        modalMessage.innerHTML = '';
    }

    function updateOtpTimers() {
        const secondsRemaining = 30 - (Math.floor(new Date().getTime() / 1000) % 30);
        document.querySelectorAll('.otp-timer').forEach(timer => {
            timer.textContent = `${secondsRemaining}s`;
        });
    }

    function copyToClipboard(text) {
        if (text && text !== "------" && text !== "Error") {
            navigator.clipboard.writeText(text).then(() => showNotification(`Copied!`)).catch(() => showNotification("Copy failed."));
        }
    }

    function startOtpGenerator() {
        stopOtpGenerator();
        updateDisplayedOTPs();
        timerInterval = setInterval(updateOtpTimers, 1000);
        const delay = (30 - (new Date().getSeconds() % 30)) * 1000;
        otpInterval = setTimeout(function run() {
            updateDisplayedOTPs();
            otpInterval = setTimeout(run, 30000);
        }, delay);
    }

    function stopOtpGenerator() {
        clearTimeout(otpInterval);
        clearInterval(timerInterval);
    }

    function startLogoutTimer() {
        clearLogoutTimer();
        logoutTimeRemaining = 120;
        logoutCheckInterval = setInterval(checkLogoutStatus, 1000);
    }

    function checkLogoutStatus() {
        const loginTimeString = localStorage.getItem("loginTime");
        if (loginTimeString) {
            const [h, m, s] = loginTimeString.split(":").map(Number);
            const loginDate = new Date();
            loginDate.setHours(h, m, s, 0);
            const timeDifference = (new Date().getTime() - loginDate.getTime()) / 1000;
            if (timeDifference >= 120) {
                logout();
            } else {
                logoutTimeRemaining = Math.max(0, 120 - Math.floor(timeDifference));
                updateLogoutCountdownDisplay();
            }
        }
    }

    function clearLogoutTimer() {
        clearInterval(logoutCheckInterval);
        logoutCountdownElement.textContent = "";
    }

    function updateLogoutCountdownDisplay() {
        const minutes = Math.floor(logoutTimeRemaining / 60);
        const seconds = logoutTimeRemaining % 60;
        logoutCountdownElement.textContent = `Auto logout in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async function loadPin() {
        const storedPinHash = localStorage.getItem("pin");
        if (storedPinHash) pin = storedPinHash;
    }

    function loadOtpAccounts() {
        try {
            otpAccounts = JSON.parse(localStorage.getItem("otpAccounts")) || [];
            if (!Array.isArray(otpAccounts)) otpAccounts = [];
        } catch (e) {
            otpAccounts = [];
        }
    }

    function saveOtpAccounts() {
        localStorage.setItem("otpAccounts", JSON.stringify(otpAccounts));
    }

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

    function concatBytes(a, b) { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }
    function base32ToBytes(s) { const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; s = s.toUpperCase().replace(/=+$/, ""); let b = ""; for (let i = 0; i < s.length; i++) b += c.indexOf(s[i]).toString(2).padStart(5, "0"); const r = new Uint8Array(Math.floor(b.length / 8)); for (let i = 0; i < r.length; i++) r[i] = parseInt(b.substring(i * 8, (i + 1) * 8), 2); return r; }
    function timeToBytes(t) { const b = new ArrayBuffer(8); const v = new DataView(b); v.setUint32(0, 0, false); v.setUint32(4, t, false); return new Uint8Array(b); }
    function sha1(i) { function r(n, s) { return (n << s) | (n >>> (32 - s)); } const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]; const B = Array.from(i); const L = B.length * 8; B.push(0x80); while (B.length % 64 !== 56) B.push(0); B.push(L >>> 24 & 0xff, L >>> 16 & 0xff, L >>> 8 & 0xff, L & 0xff); for (let j = 0; j < B.length; j += 64) { const w = new Array(80); for (let k = 0; k < 16; k++) w[k] = (B[j + k * 4] << 24) | (B[j + k * 4 + 1] << 16) | (B[j + k * 4 + 2] << 8) | B[j + k * 4 + 3]; for (let k = 16; k < 80; k++) w[k] = r(w[k - 3] ^ w[k - 8] ^ w[k - 14] ^ w[k - 16], 1); let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4]; for (let k = 0; k < 80; k++) { const f = k < 20 ? (b & c) | (~b & d) : k < 40 ? b ^ c ^ d : k < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d; const K = k < 20 ? 0x5a827999 : k < 40 ? 0x6ed9eba1 : k < 60 ? 0x8f1bbcdc : 0xca62c1d6; const t = (r(a, 5) + f + e + K + w[k]) >>> 0; e = d; d = c; c = r(b, 30); b = a; a = t; } H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0; } const h = new Uint8Array(20); for (let j = 0; j < 5; j++) { h[j * 4] = H[j] >>> 24; h[j * 4 + 1] = H[j] >>> 16; h[j * 4 + 2] = H[j] >>> 8; h[j * 4 + 3] = H[j]; } return h; }
    function hmacSha1(k, d) { const z = 64; if (k.length > z) k = sha1(k); const p = new Uint8Array(z); p.set(k); const o = new Uint8Array(z), i = new Uint8Array(z); for (let j = 0; j < z; j++) { o[j] = p[j] ^ 0x5c; i[j] = p[j] ^ 0x36; } return sha1(concatBytes(o, sha1(concatBytes(i, d)))); }
    function generateTOTPCode(s, t) { if (!s) return "------"; try { const T = Math.floor((t ? t.getTime() : Date.now()) / 30000); const H = hmacSha1(base32ToBytes(s), timeToBytes(T)); const o = H[H.length - 1] & 0x0f; const v = ((H[o] & 0x7f) << 24) | ((H[o + 1] & 0xff) << 16) | ((H[o + 2] & 0xff) << 8) | (H[o + 3] & 0xff); return (v % 1000000).toString().padStart(6, "0"); } catch (e) { return "Error"; } }

    initializeApp();

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && !otpContainer.classList.contains('hidden')) {
            startOtpGenerator();
        } else if (document.hidden && !otpContainer.classList.contains('hidden')) {
            stopOtpGenerator();
        }
    });
});