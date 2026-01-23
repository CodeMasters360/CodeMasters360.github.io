// ثبت Service Worker با مدیریت بهتر
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registered successfully!');
                console.log('Scope:', registration.scope);
                
                // بررسی آپدیت
                registration.addEventListener('updatefound', () => {
                    console.log('Service Worker update found!');
                });
            })
            .catch(err => console.error('❌ SW registration failed:', err));
    });
    
    // گوش دادن به تغییرات Service Worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
    });
}

// بررسی وضعیت آنلاین/آفلاین
function updateOnlineStatus() {
    const status = document.getElementById('status');
    if (navigator.onLine) {
        status.textContent = 'آنلاین';
        status.classList.add('online');
    } else {
        status.textContent = 'آفلاین';
        status.classList.remove('online');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// مدیریت تب‌ها
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// نمایش/مخفی کردن فیلد چیز
document.getElementById('protectEncrypted').addEventListener('change', (e) => {
    document.getElementById('protectPassGroup').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('hasProtection').addEventListener('change', (e) => {
    document.getElementById('protectDecryptGroup').style.display = e.target.checked ? 'block' : 'none';
});

// حروف فارسی برای (32 حرف)
const PERSIAN_CHARS = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';

// جداکننده‌های فارسی
const SEPARATOR = 'ئ'; // برای جدا کردن بخش‌ها
const PROTECTED_MARKER = 'ء'; 

// تبدیل رشته به ArrayBuffer
function str2ab(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// تبدیل ArrayBuffer به رشته
function ab2str(buffer) {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}

// تبدیل ArrayBuffer به رشته فارسی
function ab2persian(buffer) {
    const bytes = new Uint8Array(buffer);
    let result = '';
    
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        const high = (byte >> 4) & 0x0F;
        const low = byte & 0x0F;
        result += PERSIAN_CHARS[high] + PERSIAN_CHARS[low];
    }
    
    return result;
}
function persian2ab(persianStr) {
    const bytes = new Uint8Array(persianStr.length / 2);
    
    for (let i = 0; i < persianStr.length; i += 2) {
        const highChar = persianStr[i];
        const lowChar = persianStr[i + 1];
        
        const highIndex = PERSIAN_CHARS.indexOf(highChar);
        const lowIndex = PERSIAN_CHARS.indexOf(lowChar);
        
        if (highIndex === -1 || lowIndex === -1) {
            throw new Error('داده چیز نامعتبر است');
        }
        
        bytes[i / 2] = (highIndex << 4) | lowIndex;
    }
    
    return bytes.buffer;
}
// مشتق
async function deriveKey(password, salt) {
    const passwordBuffer = str2ab(password);
    const importedKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        importedKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encrypt(plaintext, password, protectPassword = null) {
    try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const key = await deriveKey(password, salt);
        const plaintextBuffer = str2ab(plaintext);
        
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            plaintextBuffer
        );

        // ترکیب به صورت: salt + جداکننده + iv + جداکننده + data
        let result = ab2persian(salt) + SEPARATOR + ab2persian(iv) + SEPARATOR + ab2persian(ciphertext);

     
        if (protectPassword) {
            const protectSalt = crypto.getRandomValues(new Uint8Array(16));
            const protectIv = crypto.getRandomValues(new Uint8Array(12));
            const protectKey = await deriveKey(protectPassword, protectSalt);
            
            const dataStr = result;
            const protectedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: protectIv },
                protectKey,
                str2ab(dataStr)
            );

   
            result = PROTECTED_MARKER + ab2persian(protectSalt) + SEPARATOR + 
                     ab2persian(protectIv) + SEPARATOR + ab2persian(protectedData);
        }

        return result;
    } catch (error) {
        throw new Error('خطا در چیز کردن: ' + error.message);
    }
}

// چیزگشا
async function decrypt(encryptedData, password, protectPassword = null) {
    try {
        let data = encryptedData;
        
        // بررسی چیز اضافی
        if (data.startsWith(PROTECTED_MARKER)) {
            if (!protectPassword) {
                throw new Error('چیز اضافه لازمع');
            }
            
            data = data.substring(1); // حذف نشانگر
            const parts = data.split(SEPARATOR);
            
            if (parts.length !== 3) {
                throw new Error('فرمت چیزه');
            }
            
            const protectSalt = persian2ab(parts[0]);
            const protectIv = persian2ab(parts[1]);
            const protectKey = await deriveKey(protectPassword, protectSalt);
            
            const decryptedProtected = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: protectIv },
                protectKey,
                persian2ab(parts[2])
            );
            
            data = ab2str(decryptedProtected);
        }

        const parts = data.split(SEPARATOR);
        
        if (parts.length !== 3) {
            throw new Error('فرمت چیزه آخه');
        }

        const salt = persian2ab(parts[0]);
        const iv = persian2ab(parts[1]);
        const ciphertext = persian2ab(parts[2]);
        
        const key = await deriveKey(password, salt);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        return ab2str(decrypted);
    } catch (error) {
        throw new Error('اشتب چیزی');
    }
}

// فرم چیز نگار
document.getElementById('encryptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const plaintext = document.getElementById('plaintext').value;
    const password = document.getElementById('encryptPassword').value;
    const hasProtection = document.getElementById('protectEncrypted').checked;
    const protectPassword = hasProtection ? document.getElementById('protectPassword').value : null;

    try {
        const encrypted = await encrypt(plaintext, password, protectPassword);
        document.getElementById('ciphertext').value = encrypted;
        document.getElementById('encryptResult').style.display = 'block';
    } catch (error) {
        alert(error.message);
    }
});

// فرم چیزززنگ
document.getElementById('decryptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const encryptedText = document.getElementById('encryptedText').value;
    const password = document.getElementById('decryptPassword').value;
    const hasProtection = document.getElementById('hasProtection').checked;
    const protectPassword = hasProtection ? document.getElementById('protectDecryptPassword').value : null;

    try {
        const decrypted = await decrypt(encryptedText, password, protectPassword);
        document.getElementById('decryptedText').value = decrypted;
        document.getElementById('decryptResult').style.display = 'block';
    } catch (error) {
        alert(error.message);
    }
});

// کپی به کلیپبورد
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    alert('متن کپی شد!');
}
