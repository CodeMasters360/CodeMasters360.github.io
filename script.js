document.addEventListener("DOMContentLoaded", function () {
    // Element References
    const pinInput = document.getElementById("pin-input");
    const loginBtn = document.getElementById("login-btn");
    const otpContainer = document.querySelector(".otp-container");
    const otpListDiv = document.getElementById("otp-list"); // Container for the list
    const addOtpBtn = document.getElementById("add-otp-btn");
    const accountNameInput = document.getElementById("account-name-input");
    const newSecretKeyInput = document.getElementById("new-secret-key-input");
    const logoutBtn = document.getElementById("logout-btn");
    const setPinContainer = document.querySelector(".set-pin-container");
    const newPinInput = document.getElementById("new-pin-input");
    const setPinBtn = document.getElementById("set-pin-btn");
    const loginContainer = document.querySelector(".login-container"); // Reference login container
    const resetBtnLogin = document.getElementById("reset-btn-login"); // Reset button on Login screen
    const resetBtnSetPin = document.getElementById("reset-btn-setpin"); // Reset button on Set PIN screen
    const logoutCountdownElement = document.getElementById("logout-countdown"); // Reference to the logout countdown element
    const customAlertModal = document.getElementById("custom-alert-modal");
    const modalMessage = document.getElementById("modal-message");
    const modalYesBtn = document.getElementById("modal-yes-btn");
    const modalNoBtn = document.getElementById("modal-no-btn");
    let modalCallback; // برای ذخیره تابع callback

    // New references
    const showAddOtpBtn = document.getElementById("show-add-otp-btn");
    showAddOtpBtn.style.display = "block"; // یا "flex" بسته به طرح بندی مورد نظر شما
    const addOtpSection = document.getElementById("add-otp-section");
    const notificationContainer = document.getElementById("notification-container");
    const currentTimeDisplay = document.getElementById("current-time");
    const timeStatusDisplay = document.getElementById("time-status");
    const summerTimeToggle = document.getElementById("summer-time-toggle");
    const registerWebAuthnBtn = document.getElementById("register-webauthn-btn"); // دکمه ثبت نام WebAuthn
    const loginWebAuthnBtn = document.getElementById("login-webauthn-btn"); // دکمه ورود با WebAuthn

    // State Variables
    let pin = null;
    let otpAccounts = []; // Array to hold {id, name, secret} objects
    let logoutTimer;
    let otpInterval;
    let loginTimestamp = 0;
    let timerInterval; // Interval for the countdown timer
    let logoutCountdownInterval;
    let logoutCheckInterval;
    let logoutTimeRemaining = 120; // Remaining time for logout in seconds
    let lastOtpGeneratedTime = localStorage.getItem("lastOtpGeneratedTime")
        ?
        parseInt(localStorage.getItem("lastOtpGeneratedTime"))
        : null;
    let isSummerTime = false;
    let serverTimeOffset = 0;
    let timeServerOnline = false;
    let currentEncryptionKey = null; // To store the encryption key after login

    // --- Notification Function ---
    function showNotification(message) {
        notificationContainer.textContent = message;
        notificationContainer.classList.add("show");
        setTimeout(() => {
            notificationContainer.classList.remove("show");
        }, 2000);
    }

    // --- Hashing Function ---
    async function hashPin(pin, salt) {
        const textEncoder = new TextEncoder();
        const data = textEncoder.encode(salt + pin); // Add salt before hashing
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // --- Generate Salt Function ---
    function generateSalt() {
        const randomBytes = new Uint8Array(16); // 16 bytes for a good salt
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- Cryptographic Functions for Secret Key Security ---
    async function deriveKeyFromPin(pin, salt) {
        const textEncoder = new TextEncoder();
        const pinBytes = textEncoder.encode(pin);
        const saltBytes = textEncoder.encode(salt);

        // Import the PIN as a key
        const baseKey = await crypto.subtle.importKey(
            "raw", // Format of the key data
            pinBytes, // Key data
            { name: "PBKDF2" }, // Algorithm the key will be used with (though not directly)
            false, // Extractable
            ["deriveKey"] // Key usages
        );
        // Derive the AES key from the base key
        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBytes,
                iterations: 100000,
                hash: "SHA-256",
            },
            baseKey, // The base key derived from the PIN
            { name: "AES-GCM", length: 256 }, // Algorithm for the derived key
            false, // Extractable
            ["encrypt", "decrypt"] // Key usages for the derived key
        );
    }

    async function encryptSecret(secret, key) {
        const textEncoder = new TextEncoder();
        const data = textEncoder.encode(secret);
        const iv = crypto.getRandomValues(new Uint8Array(12)); // طول IV برای AES-GCM معمولاً 12 بایت است

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            data
        );
        // برگرداندن IV به همراه متن رمزنگاری شده (می‌توانید آن را به صورت دیگری نیز ذخیره کنید)
        return {
            iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
            ciphertext: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('')
        };
    }

    async function decryptSecret(encryptedData, key) {
        const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        const ciphertext = new Uint8Array(encryptedData.ciphertext.match(/.{2}/g).map(byte => parseInt(byte, 16)));

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            ciphertext
        );

        const textDecoder = new TextDecoder();
        return textDecoder.decode(decryptedData);
    }

    // --- WebAuthn Functions ---
    async function registerWebAuthn() {
        if (!window.PublicKeyCredential) {
            showNotification("WebAuthn is not supported in this browser.");
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const user = {
            id: new Uint8Array(16), // شناسه کاربری منحصر به فرد (می‌توانید از یک مقدار تصادفی استفاده کنید)
            name: "user", // نام کاربری (اختیاری)
            displayName: "User" // نام نمایشی کاربر (اختیاری)
        };
        window.crypto.getRandomValues(user.id);

        const publicKey = {
            challenge: challenge,
            rp: {
                name: window.location.hostname // نام وب سایت شما
            },
            user: user,
            pubKeyCredParams: [{
                type: "public-key",
                alg: -7 // ES256 (توصیه شده)
            }],
            authenticatorSelection: {
                requireResidentKey: false,
                userVerification: "preferred" // یا "required" یا "discouraged"
            },
            attestation: "none" // یا "direct" یا "indirect"
        };

        try {
            const credential = await navigator.credentials.create({
                publicKey
            });
            if (credential) {
                // در یک برنامه واقعی، شما باید این اطلاعات را به سرور ارسال کنید.
                // در اینجا، ما آن را در حافظه محلی ذخیره می کنیم (فقط برای نمونه).
                const credentialInfo = {
                    id: credential.id,
                    rawId: Array.from(new Uint8Array(credential.rawId)),
                    type: credential.type,
                    publicKey: Array.from(new Uint8Array(credential.response.clientDataJSON)),
                    attestationObject: Array.from(new Uint8Array(credential.response.attestationObject))
                };
                localStorage.setItem("webauthnCredential", JSON.stringify(credentialInfo));
                showNotification("WebAuthn credential registered successfully.");
            } else {
                showNotification("WebAuthn registration failed.");
            }
        } catch (error) {
            console.error("Error during WebAuthn registration:", error);
            showNotification("WebAuthn registration failed: " + error.message);
        }
    }


    async function loginWithWebAuthn() {
        if (!window.PublicKeyCredential) {
            showNotification("WebAuthn is not supported in this browser.");
            return;
        }
    
        const credentialInfo = localStorage.getItem("webauthnCredential");
        if (!credentialInfo) {
            showNotification("No WebAuthn credential found. Please register first.");
            return;
        }
        const parsedCredential = JSON.parse(credentialInfo);
    
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
    
        // تبدیل شناسه از رشته (احتمالاً Base64) به ArrayBuffer
        let credentialIdBuffer;
        if (typeof parsedCredential.id === 'string') {
            credentialIdBuffer = base64ToArrayBuffer(parsedCredential.id);
        } else if (parsedCredential.id instanceof Array) {
            // اگر به صورت آرایه ذخیره شده است (که در کد ثبت‌نام شما اینطور است)
            credentialIdBuffer = new Uint8Array(parsedCredential.id).buffer;
        } else {
            console.error("Unexpected type for credential ID:", parsedCredential.id);
            showNotification("Error reading WebAuthn credential ID.");
            return;
        }
    
        const publicKey = {
            challenge: challenge,
            allowCredentials: [{
                id: credentialIdBuffer, // استفاده از ArrayBuffer برای شناسه
                type: parsedCredential.type,
                transports: ["platform"] // یا ["platform", "cross-platform"]
            }],
            userVerification: "preferred" // یا "required" یا "discouraged"
        };
    
        try {
            const assertion = await navigator.credentials.get({
                publicKey
            });
            if (assertion) {
                showNotification("WebAuthn authentication successful.");
                loginContainer.style.display = "none";
                otpContainer.style.display = "flex";
                const showAddOtpBtn = document.getElementById("show-add-otp-btn");
                showAddOtpBtn.style.display = "block";
                const addOtpSection = document.getElementById("add-otp-section");
                addOtpSection.style.display = "none";
                pinInput.value = "";
                loginTimestamp = Date.now();
                localStorage.setItem("loginTime", new Date().toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }));
    
                const storedPinHash = pin;
                const storedSalt = localStorage.getItem("pinSalt");
                if (storedPinHash && storedSalt) {
                    const lastUsedPin = localStorage.getItem("lastUsedPin"); // Try to get the last used PIN
                    if (lastUsedPin) {
                        const hashedLastUsedPin = await hashPin(lastUsedPin, storedSalt);
                        if (hashedLastUsedPin === storedPinHash) {
                            const encryptionSalt = localStorage.getItem("encryptionSalt");
                            if (encryptionSalt) {
                                currentEncryptionKey = await deriveKeyFromPin(lastUsedPin, encryptionSalt);
                                await displayOtpList();
                                startOtpGenerator();
                                startLogoutTimer();
                                fetchServerTime();
                                return;
                            } else {
                                console.error("Encryption salt not found after WebAuthn login.");
                                showNotification("Error: Encryption salt missing. Please reset data and set a new PIN.");
                                logout();
                                return;
                            }
                        }
                    }
                    // If no last used PIN or it's incorrect, prompt for PIN
                    showCustomAlert("Please enter your PIN after WebAuthn login.", async function (resultPin) {
                        if (resultPin) {
                            localStorage.setItem("lastUsedPin", resultPin);
                            const hashedResultPin = await hashPin(resultPin, storedSalt);
                            if (hashedResultPin === storedPinHash) {
                                const encryptionSalt = localStorage.getItem("encryptionSalt");
                                if (encryptionSalt) {
                                    currentEncryptionKey = await deriveKeyFromPin(resultPin, encryptionSalt);
                                    await displayOtpList();
                                    startOtpGenerator();
                                    startLogoutTimer();
                                    fetchServerTime();
                                } else {
                                    console.error("Encryption salt not found after WebAuthn login.");
                                    showNotification("Error: Encryption salt missing. Please reset data and set a new PIN.");
                                    logout();
                                }
                            } else {
                                showNotification("Incorrect PIN.");
                                logout();
                            }
                        } else {
                            logout();
                        }
                    }, true); // Pass true to indicate it's a PIN prompt
                } else {
                    showNotification("No PIN set. Please set a PIN first.");
                    setPinContainer.style.display = "flex";
                    loginContainer.style.display = "none";
                }
    
            } else {
                showNotification("WebAuthn authentication failed.");
            }
        } catch (error) {
            console.error("Error during WebAuthn authentication:", error);
            showNotification("WebAuthn authentication failed: " + error.message);
        }
    }
    
    // تابع کمکی برای تبدیل Base64 به ArrayBuffer
    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }


    // --- Core Functions ---

    async function login() {
        const enteredPin = pinInput.value;
        const storedPinHash = pin; // Get the stored hashed PIN
        const storedSalt = localStorage.getItem("pinSalt");
        if (storedPinHash && storedSalt) {
            const hashedEnteredPin = await hashPin(enteredPin, storedSalt);
            if (hashedEnteredPin === storedPinHash) {
                loginContainer.style.display = "none";
                otpContainer.style.display = "flex";
                const showAddOtpBtn = document.getElementById("show-add-otp-btn");
                showAddOtpBtn.style.display = "block";
                // نمایش دکمه "Add new account"
                const addOtpSection = document.getElementById("add-otp-section");
                addOtpSection.style.display = "none"; // اطمینان از مخفی بودن بخش "Add new account"
                pinInput.value = "";
                localStorage.setItem("lastUsedPin", enteredPin); // Store the last used PIN
                loginTimestamp = Date.now(); // Record the exact timestamp of login
                localStorage.setItem(
                    "loginTime",
                    new Date().toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })
                );
                // Derive and store encryption key after successful login
                const encryptionSalt = localStorage.getItem("encryptionSalt");
                if (encryptionSalt) {
                    currentEncryptionKey = await deriveKeyFromPin(enteredPin, encryptionSalt);
                    await displayOtpList(); // Call displayOtpList to show OTPs immediately after key derivation
                    startOtpGenerator();
                    startLogoutTimer();
                    fetchServerTime(); // Fetch server time after login
                    //displayOtpGenerationTimes(); // Call the function to display OTP generation times
                } else {
                    console.error("Encryption salt not found after login.");
                    showNotification("Error: Encryption salt missing. Please reset data and set a new PIN.");
                    logout(); // Log out if encryption salt is missing
                }

            } else {
                showNotification("The entered PIN is incorrect. Please try again.");
                pinInput.value = "";
            }
        } else {
            showNotification("Error: Could not retrieve PIN or salt.");
            pinInput.value = "";
        }
    }

    function logout() {
        stopOtpGenerator(); // Stop OTP updates
        clearLogoutTimer(); // Stop auto-logout timer
        otpContainer.style.display = "none";
        loginContainer.style.display = "flex"; // Use flex or block
        const showAddOtpBtn = document.getElementById("show-add-otp-btn");
        showAddOtpBtn.style.display = "none"; // مخفی کردن دکمه هنگام خروج
        const addOtpSection = document.getElementById("add-otp-section");
        addOtpSection.style.display = "none"; // همچنین بخش افزودن OTP را مخفی کنید
        otpListDiv.innerHTML = ""; // Clear the list display
        pinInput.focus();// Clear the list display
        // Don't clear pin or otpAccounts here, just log out
        currentEncryptionKey = null; // Clear the encryption key on logout
    }

    function resetData() {
        showCustomAlert(
            "Are you sure you want to delete all data (PIN and OTP accounts)? This action is irreversible.",
            async function(result) {
                if (result) {
                    localStorage.removeItem("pin");
                    localStorage.removeItem("pinSalt"); // Remove the salt as well
                    localStorage.removeItem("otpAccounts"); // Remove the accounts array
                    localStorage.removeItem("encryptionSalt"); // Remove encryption salt
                    localStorage.removeItem("encryptionKey"); // Remove encryption key
                    localStorage.removeItem("webauthnCredential"); // Remove WebAuthn credential
                    localStorage.removeItem("lastUsedPin"); // Remove last used PIN
                    pin = null;
                    otpAccounts = [];
                    stopOtpGenerator(); // Stop updates if running
                    clearLogoutTimer(); // Clear timer if running

                    // Update UI: Hide all main views and show Set PIN view
                    otpContainer.style.display = "none";
                    loginContainer.style.display = "none"; // Hide login container too after reset
                    setPinContainer.style.display = "flex"; // Show PIN setup
                    newPinInput.focus();
                    showNotification("All data has been reset successfully. Please set a new PIN.");
                }
            }
        );
    }

    function displayOtpGenerationTimes() {
        const now = new Date();
        const currentSecond = now.getSeconds();
        const secondsIntoInterval = currentSecond % 30;
        // Calculate the current OTP generation time (round down to the nearest multiple of 30 seconds)
        const currentGenerationTime = new Date(
            now.getTime() - secondsIntoInterval * 1000
        );
        // Calculate the next OTP generation time (30 seconds after the current time)
        const nextGenerationTime = new Date(
            currentGenerationTime.getTime() + 30 * 1000
        );
        // Format the time as HH:MM:SS
        const formatTime = (date) => {
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            const seconds = date.getSeconds().toString().padStart(2, "0");
            return `${hours}:${minutes}:${seconds}`;
        };

        const currentTimeFormatted = formatTime(currentGenerationTime);
        const nextTimeFormatted = formatTime(nextGenerationTime);

        showNotification(
            `Current OTP generation time: ${currentTimeFormatted}\nNext OTP generation time: ${nextTimeFormatted}`
        );
    }
    async function setNewPin() {
        const newPin = newPinInput.value;
        if (newPin && newPin.length === 4 && /^\d+$/.test(newPin)) {
            const salt = generateSalt(); // Generate a new salt for PIN
            const hashedPin = await hashPin(newPin, salt);
            pin = hashedPin; // Store the hash in the pin variable
            localStorage.setItem("pin", hashedPin);
            localStorage.setItem("pinSalt", salt); // Store the salt in localStorage
            localStorage.setItem("lastUsedPin", newPin); // Store the new PIN as last used

            // Generate and store encryption salt for secret keys
            const encryptionSalt = generateSalt();
            localStorage.setItem("encryptionSalt", encryptionSalt);

            setPinContainer.style.display = "none";
            loginContainer.style.display = "flex";
            newPinInput.value = "";
            showNotification("PIN set successfully. You can now log in.");
            pinInput.focus();
        } else {
            showNotification("PIN must be exactly 4 numeric digits.");
            newPinInput.value = "";
        }
    }

    async function addNewOTPAccount() {
        const accountName = accountNameInput.value.trim();
        const newSecretKey = newSecretKeyInput.value
            .trim()
            .toUpperCase()
            .replace(/\s+/g, ""); // Uppercase, remove spaces

        if (!accountName) {
            showNotification("Please enter a name for the account.");
            return;
        }
        if (!newSecretKey) {
            showNotification("Please enter the Secret Key.");
            return;
        }
        // Basic Base32 validation (optional but recommended)
        const base32Regex = /^[A-Z2-7]+=*$/;
        if (!base32Regex.test(newSecretKey) || newSecretKey.length < 16) {
            // Common min length
            if (
                !confirm(
                    "The Secret Key format seems invalid or too short. Are you sure you want to continue?"
                )
            ) {
                return;
            }
        }

        if (currentEncryptionKey) {
            const encrypted = await encryptSecret(newSecretKey, currentEncryptionKey);
            const newAccount = {
                id: Date.now(), // Simple unique ID using timestamp
                name: accountName,
                encryptedSecret: encrypted.ciphertext,
                iv: encrypted.iv
            };
            otpAccounts.push(newAccount);
            saveOtpAccounts(); // Save updated list to localStorage
            await displayOtpList(); // Refresh the displayed list

            // Clear input fields
            accountNameInput.value = "";
            newSecretKeyInput.value = "";
            showNotification("OTP account added successfully.");
        } else {
            showNotification("Error: Could not encrypt secret key. Please ensure you are logged in.");
        }
    }

    async function deleteOtpAccount(accountId) {
        const accountToDelete = otpAccounts.find((acc) => acc.id === accountId);
        if (accountToDelete) {
            showCustomAlert(
                `Are you sure you want to delete the account "${accountToDelete.name}"?`,
                async function(result) {
                    if (result) {
                        otpAccounts = otpAccounts.filter((account) => account.id !== accountId);
                        saveOtpAccounts(); // Save updated list
                        await displayOtpList(); // Refresh the displayed list
                    }
                }
            );
        }
    }

    // --- Display and Update Functions ---

    async function displayOtpList() {
        otpListDiv.innerHTML = ''; // Clear previous list
        if (otpAccounts.length === 0) {
            otpListDiv.innerHTML = '<p>No OTP accounts have been added yet.</p>';
            return;
        }

        const loginTimeString = localStorage.getItem('loginTime');
        // If login time is stored
        if (loginTimeString) {
            const loginTimeParts = loginTimeString.split(':').map(Number);
            const loginSecond = loginTimeParts[2]; // Login second
            const now = new Date();
            const currentSecond = now.getSeconds();

            let lastIntervalStart;
            if (currentSecond < 30) {
                lastIntervalStart = now.getTime() - currentSecond * 1000; // Start of current 30s interval
            } else {
                lastIntervalStart = now.getTime() - (currentSecond - 30) * 1000; // Start of current 30s interval
            }

            for (const account of otpAccounts) {
                const listItem = document.createElement('div');
                listItem.className = 'otp-list-item';
                listItem.setAttribute('data-account-id', account.id);

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
                timerSpan.textContent = '30s'; // Initial value, immediately updated by updateOtpTimers

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-btn';
                copyButton.textContent = 'Copy';
                copyButton.onclick = () => {
                    const otpInput = document.getElementById(`otp-display-${account.id}`);
                    if (otpInput && otpInput.value !== "------" && otpInput.value !== "Error" && otpInput.value !== "Locked") {
                        copyToClipboard(otpInput.value);
                    } else {
                        showNotification("OTP not available or locked.");
                    }
                };
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => deleteOtpAccount(account.id);

                listItem.appendChild(nameSpan);
                listItem.appendChild(otpDisplayInput);
                listItem.appendChild(timerSpan);
                listItem.appendChild(copyButton);
                listItem.appendChild(deleteBtn);
                otpListDiv.appendChild(listItem);

                localStorage.setItem(`lastOtpGenerationTime-${account.id}`, lastIntervalStart);
            }
        } else {
            // If login time is not stored (default or error state)
            for (const account of otpAccounts) {
                // ... (Create HTML elements as before)
                const timerSpan = document.createElement('span');
                timerSpan.className = 'otp-timer';
                timerSpan.id = `otp-timer-${account.id}`;
                timerSpan.textContent = '30s'; // Default value
                // ... (Add other elements)
                localStorage.setItem(`lastOtpGenerationTime-${account.id}`, Date.now() - (Date.now() % 30000)); // Estimate start time of current interval
            }
        }

        await updateDisplayedOTPs(); // Generate initial OTPs for the displayed list
        updateOtpTimers(); // Initialize the timers
    }

    async function updateDisplayedOTPs() {
        // This function now directly uses currentEncryptionKey for decryption
        if (currentEncryptionKey) {
            for (const account of otpAccounts) {
                const otpDisplayElement = document.getElementById(
                    `otp-display-${account.id}`
                );
                if (otpDisplayElement) {
                    try {
                        const decryptedSecret = await decryptSecret({ ciphertext: account.encryptedSecret, iv: account.iv }, currentEncryptionKey);
                        if (decryptedSecret) {
                            const currentTime = getCurrentTimeWithOffset();
                            const otp = generateTOTPCode(decryptedSecret, currentTime);
                            otpDisplayElement.value = otp; // Update the input field value
                        } else {
                            otpDisplayElement.value = "Locked";
                        }
                    } catch (error) {
                        console.error(
                            `Error generating OTP for account ${account.name} (ID: ${account.id}):`,
                            error
                        );
                        otpDisplayElement.value = "Error"; // Show error in display
                    }
                }
            }
        } else {
            // This case might occur if the user somehow gets to the OTP screen without proper login
            console.warn("Encryption key not available. OTPs will not be displayed.");
            for (const account of otpAccounts) {
                const otpDisplayElement = document.getElementById(
                    `otp-display-${account.id}`
                );
                if (otpDisplayElement) {
                    otpDisplayElement.value = "Locked";
                }
            }
        }
    }

    function showCustomAlert(message, callback, isPinPrompt = false) {
        modalMessage.textContent = message;
        modalCallback = callback;
        // اگر این یک درخواست پین است، نوع ورودی را تنظیم کنید
        if (isPinPrompt) {
            const input = document.createElement('input');
            input.type = 'password';
            input.maxLength = 4;
            input.id = 'pin-prompt-input';
            modalMessage.appendChild(document.createElement('br'));
            modalMessage.appendChild(input);
            modalYesBtn.onclick = async function() {
                const pinValue = document.getElementById('pin-prompt-input').value;
                if (pinValue && pinValue.length === 4 && /^\d+$/.test(pinValue)) {
                    if (modalCallback) {
                        modalCallback(pinValue);
                    }
                    hideCustomAlert();
                } else {
                    showNotification("PIN must be exactly 4 numeric digits.");
                }
            };
        } else {
            modalYesBtn.onclick = function() {
                if (modalCallback) {
                    modalCallback(true); // ارسال true برای "Yes"
                }
                hideCustomAlert();
            };
        }
        modalNoBtn.onclick = function() {
            if (modalCallback) {
                modalCallback(false); // ارسال false برای "No"
            }
            hideCustomAlert();
            if (loginContainer.style.display === "flex") { // بررسی کنید که آیا صفحه ورود نمایش داده می‌شود
                pinInput.focus();
            }
        };
        customAlertModal.style.display = "block";
    }

    function hideCustomAlert() {
        modalMessage.innerHTML = ''; // پاک کردن محتوای قبلی
        modalYesBtn.onclick = null; // پاک کردن هندلر قبلی
        modalNoBtn.onclick = null;   // پاک کردن هندلر قبلی
        customAlertModal.style.display = "none";
        modalCallback = null; // پاک کردن callback بعد از استفاده
    }

    // بستن modal اگر کاربر خارج از آن کلیک کرد
    window.addEventListener('click', function(event) {
        if (event.target == customAlertModal) {
            hideCustomAlert();
        }
    });
    function getCurrentTimeWithOffset() {
        const now = new Date();
        const adjustedTime = new Date(now.getTime() + serverTimeOffset);
        if (isSummerTime) {
            adjustedTime.setTime(adjustedTime.getTime() + 60 * 60 * 1000); // Add one hour for summer time
        }
        return adjustedTime;
    }

    function updateCurrentTimeDisplay() {
        const now = getCurrentTimeWithOffset();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        currentTimeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }

    async function fetchServerTime() {
        try {
            const response = await fetch('http://worldtimeapi.org/api/ip');
            if (response.ok) {
                const data = await response.json();
                const currentTime = data.datetime; // Get the datetime string from the response
                const serverTime = new Date(currentTime); // Create a Date object from the string
                const localTime = new Date();
                serverTimeOffset = serverTime.getTime() - localTime.getTime();
                timeServerOnline = true;
                timeStatusDisplay.textContent = "Online";
                timeStatusDisplay.className = "online";
                showNotification("Time synchronized with server.");
            } else {
                timeServerOnline = false;
                timeStatusDisplay.textContent = "Offline";
                timeStatusDisplay.className = "";
                console.error("Failed to fetch server time:", response.status);
            }
        } catch (error) {
            timeServerOnline = false;
            timeStatusDisplay.textContent = "Offline";
            timeStatusDisplay.className = "";
            console.error("Error fetching server time:", error);
        }
    }

    function updateOtpTimers() {
        otpAccounts.forEach(account => {
            const timerElement = document.getElementById(`otp-timer-${account.id}`);
            const lastGenerationTime = localStorage.getItem(`lastOtpGenerationTime-${account.id}`);

            if (timerElement) {
                if (lastGenerationTime) {
                    const elapsed = Math.floor((Date.now() - parseInt(lastGenerationTime)) / 1000);
                    const secondsRemaining = 30 - (elapsed % 30);
                    timerElement.textContent = `${secondsRemaining <
                    0 ? 0 : secondsRemaining}s`;
                } else {
                    // Initial state or if no stored time
                    timerElement.textContent = '30s';
                }
            }
        });
    }

    function copyToClipboard(text) {
        if (!text || text === "------" || text === "Error" || text === "Locked") return; // Don't copy placeholders/errors
        navigator.clipboard
            .writeText(text)
            .then(() => {
                // Optional: Show temporary feedback instead of alert
                // e.g., change button text temporarily
                showNotification(`Code ${text} copied!`);
            })
            .catch((err) => {
                console.error("Failed to copy OTP: ", err);
                showNotification("Error copying code.");
            });
    }

    function startOtpGenerator() {
        stopOtpGenerator();
        updateDisplayedOTPs();
        //updateOtpTimers();
        localStorage.setItem("lastOtpGeneratedTime", Date.now());
        // Change timer update interval to 2 seconds (2000 milliseconds)
        timerInterval = setInterval(updateOtpTimers, 1000);
        function scheduleFirstUpdate() {
            const now = new Date();
            const currentSecond = now.getSeconds();
            let delay;

            if (currentSecond < 30) {
                delay = (30 - currentSecond) * 1000;
            } else {
                delay = (60 - currentSecond) * 1000;
            }

            setTimeout(scheduleNextOtpUpdate, delay);
        }

        scheduleFirstUpdate();
    }
    function stopOtpGenerator() {
        clearInterval(otpInterval);
        otpInterval = null;
        clearInterval(timerInterval); // Clear the timer interval as well
        timerInterval = null;
    }
    function scheduleNextOtpUpdate() {
        updateDisplayedOTPs();
        otpAccounts.forEach((account) => {
            localStorage.setItem(`lastOtpGenerationTime-${account.id}`, Date.now());
        });
        setTimeout(scheduleNextOtpUpdate, 30000); // Schedule the next update in 30 seconds
    }

    // --- Timer Functions ---

    function startLogoutTimer() {
        clearLogoutTimer(); // Clear previous timer
        logoutTimeRemaining = 120; // Reset time
        updateLogoutCountdownDisplay();
        // Set interval to check logout status every 2 seconds
        logoutCheckInterval = setInterval(checkLogoutStatus, 1000);
        // Set interval to update the timer display every second (optional, for visual feedback)
        logoutCountdownInterval = setInterval(updateLogoutCountdownDisplay, 1000);
    }

    function checkLogoutStatus() {
        const loginTimeString = localStorage.getItem("loginTime");
        if (loginTimeString) {
            const loginTimeParts = loginTimeString.split(":").map(Number);
            const loginDate = new Date();
            loginDate.setHours(loginTimeParts[0]);
            loginDate.setMinutes(loginTimeParts[1]);
            loginDate.setSeconds(loginTimeParts[2]);

            const currentTime = new Date();
            const timeDifference =
                (currentTime.getTime() - loginDate.getTime()) / 1000; // Difference in seconds

            if (timeDifference >= 120) {
                logout(); // Call the logout function
            } else {
                logoutTimeRemaining = 120 - Math.floor(timeDifference); // logoutTimeRemaining is updated for display in updateLogoutCountdownDisplay
            }
        } else {
            // If login time is not found in cache (likely an error occurred)
            console.warn("Login time not found in cache.");
            clearLogoutTimer(); // Stop the check interval
        }
    }

    function clearLogoutTimer() {
        clearTimeout(logoutTimer); // If still using setTimeout
        logoutTimer = null;
        clearInterval(logoutCountdownInterval);
        logoutCountdownInterval = null;
        clearInterval(logoutCheckInterval); // Clear the logout check interval
        logoutCheckInterval = null;
        logoutTimeRemaining = 120; // Reset remaining time
        const countdownElement = document.getElementById("logout-countdown");
        if (countdownElement) {
            countdownElement.textContent = ""; // Clear the display
        }
    }

    function resetLogoutTimer() {
        startLogoutTimer(); // Restart the timer and countdown display
    }

    function updateLogoutCountdownDisplay() {
        if (logoutCountdownElement) {
            const minutes = Math.floor(logoutTimeRemaining / 60);
            const seconds = logoutTimeRemaining % 60;
            const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
            logoutCountdownElement.textContent = `Auto logout in: ${formattedTime}`;
            logoutTimeRemaining--;

            if (logoutTimeRemaining < 0) {
                clearInterval(logoutCountdownInterval); // Logout should be handled by setTimeout in startLogoutTimer
            }
        }
    }

    // --- Local Storage Handling ---

    async function loadPin() {
        const storedPinHash = localStorage.getItem("pin");
        const storedSalt = localStorage.getItem("pinSalt");
        if (storedPinHash && storedSalt) {
            // We have both hash and salt, assume PIN is already secured
            pin = storedPinHash;
            return true;
        } else if (storedPinHash && !storedSalt) {
            // This is the old PIN (only hash stored), we need to reset
            localStorage.removeItem("pin");
            showNotification("Security update requires setting a new PIN.");
            return false;
        }
        return false;
    }

    function loadOtpAccounts() {
        const storedAccounts = localStorage.getItem("otpAccounts");
        if (storedAccounts) {
            try {
                otpAccounts = JSON.parse(storedAccounts);
                if (!Array.isArray(otpAccounts)) {
                    // Basic validation
                    console.warn("Stored otpAccounts data is not an array. Resetting.");
                    otpAccounts = [];
                }
            } catch (e) {
                console.error("Error parsing stored OTP accounts:", e);
                otpAccounts = []; // Reset if parsing fails
            }
        } else {
            otpAccounts = []; // Initialize if nothing is stored
        }
    }

    function saveOtpAccounts() {
        try {
            localStorage.setItem("otpAccounts", JSON.stringify(otpAccounts));
        } catch (e) {
            console.error("Error saving OTP accounts to localStorage:", e);
            showNotification("Error saving account information. Storage may be full.");
        }
    }

    // --- Initialization ---

    async function initializeApp() {
        await loadPin(); // Load PIN first to check if setup is needed
        loadOtpAccounts(); // Load accounts

        const pinExists = localStorage.getItem("pin");
        const webauthnCredentialExists = localStorage.getItem("webauthnCredential");

        if (webauthnCredentialExists) {
            loginContainer.style.display = "flex"; // Show login container with both options
            otpContainer.style.display = "none";
            setPinContainer.style.display = "none";
            pinInput.focus();
        } else if (pinExists) {
            // PIN exists, show login screen
            loginContainer.style.display = "flex";
            otpContainer.style.display = "none";
            setPinContainer.style.display = "none";
            pinInput.focus();
        } else {
            // No PIN, show set PIN screen
            setPinContainer.style.display = "flex";
            loginContainer.style.display = "none";
            otpContainer.style.display = "none";
            newPinInput.focus();
        }

        // Add event listeners
        loginBtn.addEventListener("click", async function() { await login(); });
        logoutBtn.addEventListener("click", logout);
        setPinBtn.addEventListener("click", async function() { await setNewPin(); });
        addOtpBtn.addEventListener("click", addNewOTPAccount); // Connect the correct button

        // Attach resetData function to BOTH reset buttons
        resetBtnLogin.addEventListener("click", resetData);
        resetBtnSetPin.addEventListener("click", resetData);

        // Add keypress listener for PIN input (login on Enter)
        pinInput.addEventListener("keypress", async function (event) {
            if (event.key === "Enter") {
                await login();
            }
        });
        // Add input event listener to check for automatic login after entering 4 digits
        pinInput.addEventListener("input", async function () {
            const enteredPin = this.value;
            if (enteredPin.length === 4 && pin) {
                const storedSalt = localStorage.getItem("pinSalt");
                if (storedSalt) {
                    const hashedEnteredPin = await hashPin(enteredPin, storedSalt);
                    if (hashedEnteredPin === pin) {
                        await login(); // Call the login function if PIN is 4 digits and correct
                    }
                }
            }
        });
        // Add keypress listener for Set PIN input (set PIN on Enter)
        newPinInput.addEventListener("keypress", async function (event) {
            if (event.key === "Enter") {
                await setNewPin();
            }
        });
        // Add keypress listener for Add OTP inputs (add on Enter in secret key field)
        newSecretKeyInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                addNewOTPAccount();
            }
        });
        newPinInput.addEventListener("keypress", async function (event) {
            if (event.key === "Enter") {
                await setNewPin();
            }
        });
        // Reset logout timer on activity (clicks or keypresses anywhere within otpContainer)
        //  otpContainer.addEventListener('mousemove', resetLogoutTimer);
        // otpContainer.addEventListener('keydown', resetLogoutTimer);

        // Event listener for showing/hiding add OTP section
        showAddOtpBtn.addEventListener("click", function() {
            addOtpSection.style.display = addOtpSection.style.display === "none" ? "block" : "none";
        });
        // Event listener for summer time toggle
        summerTimeToggle.addEventListener('change', function() {
            isSummerTime = this.checked;
            updateCurrentTimeDisplay();
            updateDisplayedOTPs();
        });
        // Initial display of current time
        updateCurrentTimeDisplay();
        setInterval(updateCurrentTimeDisplay, 1000); // Update every second

        // Periodic fetch of server time
        setInterval(fetchServerTime, 60000); // Fetch every 1 minute

        // WebAuthn event listeners
        if (registerWebAuthnBtn) {
            registerWebAuthnBtn.addEventListener("click", registerWebAuthn);
        }
        if (loginWebAuthnBtn) {
            loginWebAuthnBtn.addEventListener("click", loginWithWebAuthn);
        }
    }


    // --- Cryptographic Functions (HMAC, SHA1, Base32, TOTP) ---
    // IMPORTANT: These functions must be included for the OTP generation to work.
    function concatBytes(arr1, arr2) {
        if (!(arr1 instanceof Uint8Array) || !(arr2 instanceof Uint8Array)) {
            throw new Error("concatBytes expects two Uint8Array arguments.");
        }
        const result = new Uint8Array(arr1.length + arr2.length);
        result.set(arr1); // Copy first array into the result
        result.set(arr2, arr1.length); // Copy second array into the result, starting after the first one
        return result;
    }
    function base32ToBytes(base32String) {
        const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        base32String = base32String.toUpperCase().replace(/=+$/, ""); // Remove padding, uppercase
        let bits = "";
        for (let i = 0; i < base32String.length; i++) {
            const char = base32String[i];
            const index = base32Chars.indexOf(char);
            if (index === -1) {
                throw new Error("Invalid Base32 character: " + char);
            }
            bits += index.toString(2).padStart(5, "0");
        }
        const bytes = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            const byteBits = bits.substring(i * 8, (i + 1) * 8);
            bytes[i] = parseInt(byteBits, 2);
        }
        return bytes;
    }
    function timeStepToBytes(timeStep) {
        const buffer = new ArrayBuffer(8); // 8 bytes for 64-bit counter
        const view = new DataView(buffer);
        // Write 0 for the high 32 bits (JS numbers handle up to 2^53 safely)
        view.setUint32(0, 0, false); // Offset 0, Value 0, Big Endian false
        // Write the timeStep for the low 32 bits
        view.setUint32(4, timeStep, false); // Offset 4, Value timeStep, Big Endian false
        return new Uint8Array(buffer);
    }
    function sha1(input) {
        function rotateLeft(n, s) {
            return (n << s) |
                (n >>> (32 - s));
        }
        const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
        if (!(input instanceof Uint8Array)) {
            throw new Error("sha1 function expects a Uint8Array input.");
        }
        const bytes = Array.from(input);
        const originalByteLength = bytes.length;
        bytes.push(0x80); // Append '1' bit (0x80)
        while (bytes.length % 64 !== 56) {
            bytes.push(0);
        }
        const bitLength = originalByteLength * 8;
        for (let i = 0; i < 4; i++) bytes.push(0);
        bytes.push((bitLength >>> 24) & 0xff);
        bytes.push((bitLength >>> 16) & 0xff);
        bytes.push((bitLength >>> 8) & 0xff);
        bytes.push(bitLength & 0xff);
        for (let i = 0; i < bytes.length; i += 64) {
            const chunkBytes = bytes.slice(i, i + 64);
            const W = new Array(80);
            for (let j = 0; j < 16; j++) {
                W[j] =
                    (chunkBytes[j * 4] << 24) |
                    (chunkBytes[j * 4 + 1] << 16) |
                    (chunkBytes[j * 4 + 2] << 8) |
                    chunkBytes[j * 4 + 3];
            }
            for (let j = 16; j < 80; j++) {
                W[j] = rotateLeft(W[j - 3] ^ W[j - 8] ^ W[j - 14] ^ W[j - 16], 1);
            }
            let a = H[0],
                b = H[1],
                c = H[2],
                d = H[3],
                e = H[4];
            for (let j = 0; j < 80; j++) {
                let f, k;
                if (j < 20) {
                    f = (b & c) |
                        (~b & d);
                    k = 0x5a827999;
                } else if (j < 40) {
                    f = b ^ c ^ d;
                    k = 0x6ed9eba1;
                } else if (j < 60) {
                    f = (b & c) |
                        (b & d) | (c & d);
                    k = 0x8f1bbcdc;
                } else {
                    f = b ^ c ^ d;
                    k = 0xca62c1d6;
                }
                const temp = (rotateLeft(a, 5) + f + e + k + W[j]) >>> 0;
                e = d;
                d = c;
                c = rotateLeft(b, 30);
                b = a;
                a = temp;
            }
            H[0] = (H[0] + a) >>> 0;
            H[1] = (H[1] + b) >>> 0;
            H[2] = (H[2] + c) >>> 0;
            H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0;
        }
        const hashBytes = [];
        for (let h of H) {
            hashBytes.push((h >> 24) & 0xff);
            hashBytes.push((h >> 16) & 0xff);
            hashBytes.push((h >> 8) & 0xff);
            hashBytes.push(h & 0xff);
        }
        return new Uint8Array(hashBytes); // Return raw bytes
    }
    function hmacSha1(keyBytes, dataBytes) {
        const blockSize = 64; // SHA-1 block size
        if (
            !(keyBytes instanceof Uint8Array) ||
            !(dataBytes instanceof Uint8Array)
        ) {
            throw new Error(
                "hmacSha1 function expects Uint8Array inputs for key and data."
            );
        }
        if (keyBytes.length > blockSize) {
            keyBytes = sha1(keyBytes); // sha1 must return Uint8Array
        }
        const paddedKey = new Uint8Array(blockSize);
        paddedKey.set(keyBytes); // Copies keyBytes into the beginning of paddedKey
        const oKeyPad = new Uint8Array(blockSize);
        const iKeyPad = new Uint8Array(blockSize);
        for (let i = 0; i < blockSize; i++) {
            oKeyPad[i] = paddedKey[i] ^ 0x5c; // Outer padding
            iKeyPad[i] = paddedKey[i] ^ 0x36; // Inner padding
        }
        const innerConcat = concatBytes(iKeyPad, dataBytes);
        const innerHash = sha1(innerConcat); // Pass Uint8Array, expect Uint8Array back
        const outerConcat = concatBytes(oKeyPad, innerHash); // innerHash is Uint8Array
        const hmac = sha1(outerConcat); // Pass Uint8Array, expect Uint8Array back
        return hmac; // Return the final HMAC hash as Uint8Array
    }
    function generateTOTPCode(secret, currentTimeOverride = null) {
        // secret is the Base32 string
        if (!secret) {
            console.error("Secret key is missing for TOTP generation.");
            return "------"; // Or handle appropriately
        }
        try {
            const secretBytes = base32ToBytes(secret);
            const currentTime = currentTimeOverride ? Math.floor(currentTimeOverride.getTime() / 1000) : Math.floor(Date.now() / 1000);
            const timeStep = Math.floor(currentTime / 30);
            const timeBytes = timeStepToBytes(timeStep);
            const hmacOutput = hmacSha1(secretBytes, timeBytes); // Pass Uint8Arrays, expect Uint8Array back
            const offset = hmacOutput[hmacOutput.length - 1] & 0x0f;
            if (offset > hmacOutput.length - 4) {
                console.error("Calculated offset is out of bounds for HMAC hash.");
                return "Error"; // Return Error string
            }
            const truncatedHash =
                ((hmacOutput[offset] & 0x7f) << 24) | // Use 0x7f to zero out the MSB
                ((hmacOutput[offset + 1] & 0xff) << 16) |
                ((hmacOutput[offset + 2] & 0xff) << 8) |
                (hmacOutput[offset + 3] & 0xff);
            const otp = truncatedHash % 1000000;
            return otp.toString().padStart(6, "0");
        } catch (error) {
            console.error("Error generating TOTP:", error);
            if (error.message.includes("Invalid Base32")) {
                // Optionally provide more specific feedback or just return error
            }
            return "Error"; // Return an error indicator string
        }
    }

    // --- Run Initialization ---
    initializeApp();
    startOtpGenerator(); // Start generating OTPs and timers

    // Handle visibility change to re-sync OTP if tab was in background
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && otpContainer.style.display === "flex") {
            startOtpGenerator();
        } else if (document.hidden && otpContainer.style.display === "flex") {
            stopOtpGenerator();
        }
    });
});