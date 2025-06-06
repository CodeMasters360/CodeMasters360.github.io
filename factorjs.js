let items = [];
let messageTimeout;
let confirmCallbacks = {
    yes: null,
    no: null
};

const englishDigits = '0123456789';
const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

function toPersianDigits(num) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, digit => persianDigits[digit]);
}

// تابع نمایش پیام شناور سفارشی
function displayMessage(message, duration = 1000) { // زمان نمایش پیش‌فرض 1 ثانیه
    const messageArea = document.getElementById('floatingMessageArea');
    // پاک کردن تایم اوت قبلی اگر وجود دارد
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }

    // اگر پیام خالی و زمان 0 است، بلافاصله مخفی کن (برای پاک کردن پیام هنگام بستن تاریخچه)
    if (message === '' && duration === 0) {
         messageArea.style.display = 'none';
         messageArea.style.opacity = '0';
         messageArea.innerText = '';
         return;
    }

    messageArea.innerText = message;
    messageArea.style.display = 'block'; // نمایش ناحیه پیام
    // استفاده از setTimeout کوتاه برای اجازه اعمال 'display: block' قبل از تغییر opacity
    setTimeout(() => {
         messageArea.style.opacity = '1'; // نمایش با انیمیشن محو شونده
    }, 10); // کمی تأخیر

    // تنظیم تایم اوت برای مخفی کردن پیام (فقط اگر duration > 0 است)
    if (duration > 0) {
        messageTimeout = setTimeout(() => {
            messageArea.style.opacity = '0'; // شروع انیمیشن مخفی شدن
            // بعد از اتمام انیمیشن، display را به none تغییر دهید
            setTimeout(() => {
                messageArea.style.display = 'none';
                messageArea.innerText = ''; // پاک کردن متن
            }, 500); // مدت زمان باید با transition-duration در CSS همخوانی داشته باشد (0.5s)
        }, duration);
    }
}

// تابع نمایش دیالوگ تایید سفارشی
function showConfirmDialog(message, onYes, onNo) {
    const overlay = document.getElementById('customConfirmOverlay');
    const messageElement = document.getElementById('customConfirmMessage');
    const yesBtn = document.getElementById('customConfirmYes');
    const noBtn = document.getElementById('customConfirmNo');

    messageElement.innerText = message;

    // تنظیم رویدادها مستقیم
    yesBtn.onclick = () => {
        hideConfirmDialog();
        if (onYes && typeof onYes === 'function') {
            onYes(); // ← اجرا مستقیم callback
        }
    };

    noBtn.onclick = () => {
        hideConfirmDialog();
        if (onNo && typeof onNo === 'function') {
            onNo(); // ← اجرا مستقیم callback
        }
    };

    // بستن با کلیک روی Overlay (اگر روی Container کلیک نشود)
    overlay.onclick = (event) => {
        if (event.target === overlay) {
            hideConfirmDialog();
            if (onNo && typeof onNo === 'function') {
                onNo();
            }
        }
    };

    overlay.style.display = 'flex';
}

// تابع مخفی کردن دیالوگ تایید سفارشی
function hideConfirmDialog() {
    const overlay = document.getElementById('customConfirmOverlay');
    overlay.style.display = 'none';
    // پاک کردن callback ها
    confirmCallbacks.yes = null;
    confirmCallbacks.no = null;
     // پاک کردن شنونده‌ها برای جلوگیری از رفرنس‌های رها شده
     document.getElementById('customConfirmYes').onclick = null;
     document.getElementById('customConfirmNo').onclick = null;
     document.getElementById('customConfirmOverlay').onclick = null; // پاک کردن شنونده overlay
}


function formatNumberForInput(num) {
    if (num === 0) return '0';
    return num.toLocaleString('en-US');
}
	
	
function formatNumberForDisplay(num) {
    return num.toLocaleString('en-US', { useGrouping: true });
}

 
function parseFormattedNumber(str) {
    const raw = str.replace(/[^\d]/g, '');
    return parseInt(raw) || 0;
}

function addItem() {
    const nameInput = document.getElementById('itemName');
    const priceInput = document.getElementById('itemPrice');
    const price = parseFormattedNumber(priceInput.value);

    if (!price) {
        displayMessage("قیمت را وارد کنید.", 1000);
        priceInput.focus();
        return;
    }
    items.push({ name: nameInput.value || '—', price, quantity: 1 }); // Added quantity
    nameInput.value = '';
    priceInput.value = '';
    nameInput.focus();
    renderItems();
    displayMessage("کالا به لیست اضافه شد.", 1000);
}

function removeItem(index) {
      // نیازی به تایید برای حذف یک آیتم نیست
      items.splice(index, 1);
      renderItems();
      displayMessage("کالا از لیست حذف شد.", 1000); // پیام شناور 1 ثانیه‌ای
    }

function updateItemName(index, value) {
      items[index].name = value || '—';
    }

// تابع اصلاح شده updateItemPrice برای مدیریت تبدیل و فرمت فارسی
 function updateItemPrice(index, input) {
    const currentValue = input.value;
    const rawDigitsOnly = currentValue.replace(/[^\d]/g, '');
    
    // اگر هیچ عددی وجود نداشته باشد، قیمت را صفر قرار نده، بلکه خالی کن
    let price = rawDigitsOnly === '' ? 0 : parseInt(rawDigitsOnly);
    
    items[index].price = price;

    // فقط در صورت وجود رقم، فرمت کن، در غیر این صورت خالی کن
    if (rawDigitsOnly === '') {
        input.value = '';
    } else {
        const formattedValue = formatNumberForInput(price);
        const cursorPosition = input.selectionStart;
        const lengthDiff = formattedValue.length - currentValue.length;
        input.value = formattedValue;
        input.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    }

    updateTotal();
}
	
	function liveFormatPrice(input) {
    const currentValue = input.value;
    const rawDigitsOnly = currentValue.replace(/[^\d]/g, '');
    if (rawDigitsOnly === '') {
        input.value = '';
        return;
    }
    const price = parseInt(rawDigitsOnly);
    if (!isNaN(price)) {
        const formattedValue = formatNumberForInput(price);
        const cursorPosition = input.selectionStart;
        const lengthDiff = formattedValue.length - currentValue.length;

        input.value = formattedValue;
        input.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    }
}


function updateQuantity(index, delta) {
    const newQuantity = (items[index].quantity || 1) + delta;
    if (newQuantity > 0) {
        items[index].quantity = newQuantity;
        renderItems();
        displayMessage(`تعداد به ${toPersianDigits(newQuantity)} تغییر کرد.`, 1000);
    }
}

function updateTotal() {
    const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    document.getElementById('totalPrice').innerText = `جمع کل: ${formatNumberForDisplay(total)} تومان`;
}

function renderItems() {
    const list = document.getElementById('itemList');
    list.innerHTML = ''; // **اطمینان از پاک شدن کامل لیست قبل از رندر مجدد**
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <input type="text" value="${item.name}" onchange="updateItemName(${index}, this.value)" style="flex: 2; font-size: 0.9rem; padding: 0.05rem;">
            <input type="text" class="price-input" value="${formatNumberForInput(item.price)}" oninput="updateItemPrice(${index}, this)" inputmode="numeric" style="flex: 1; min-width: 80px; font-size: 0.9rem; padding: 0.05rem;">
            <div style="display: flex; align-items: center; gap: 2px; margin: 0 4px;">
                <button onclick="updateQuantity(${index}, -1)" style="padding: 0.05rem 0.3rem; font-size: 0.8rem;">-</button>
                <span style="min-width: 20px; text-align: center; font-size: 0.8rem;">${toPersianDigits(item.quantity || 1)}</span>
                <button onclick="updateQuantity(${index}, 1)" style="padding: 0.05rem 0.3rem; font-size: 0.8rem;">+</button>
            </div>
            <button onclick="removeItem(${index})" style="flex-shrink: 0; min-width: 30px; font-size: 0.9rem; padding: 0.05rem 0.1rem;">❌</button>
`;
        list.appendChild(div);
    });
    updateTotal();
}

// تابع اصلاح شده clearItems با استفاده از دیالوگ تایید سفارشی
function clearItems() {
    if (items.length === 0) {
        displayMessage("لیست خالی است.", 2000);
        return;
    }

    showConfirmDialog("آیا مطمئنید که می‌خواهید همه آیتم‌های فعلی را حذف کنید؟", () => {
        items = [];
        renderItems(); // ← فراخوانی renderItems برای نمایش لیست خالی
        displayMessage("لیست اجناس حذف شد.", 2000);
    });
}

// تابع createNewInvoice: ذخیره فاکتور فعلی و شروع فاکتور جدید (بدون تایید)
    function createNewInvoice() {
      if (items.length === 0) {
         displayMessage("لیست خالیه، برای فاکتور جدید، جنس ها را اضافه کنید.", 2000);
         return;
      }
      const now = new Date();
      const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');
      const currentTotal = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
      
      // Save items with both unit price and total price
      const itemsWithPrices = items.map(item => ({
          name: item.name,
          unitPrice: item.price, // قیمت واحد
          quantity: item.quantity || 1,
          totalPrice: item.price * (item.quantity || 1) // قیمت کل
      }));

      history.push({
          date: now.toLocaleDateString('fa-IR'),
          time: now.toLocaleTimeString('fa-IR'),
          items: itemsWithPrices,
          total: currentTotal
      });
      
      localStorage.setItem('invoiceHistory', JSON.stringify(history));
      items = [];
      renderItems();
      displayMessage(`فاکتور ذخیره شد.`, 3000);
    }

    // تابع حذف یک فاکتور از تاریخچه (با استفاده از دیالوگ تایید سفارشی)
    function deleteHistoryEntry(index) {
        // تاریخچه را داخل تابع callback بخوانید تا همیشه آخرین نسخه را داشته باشید
        showConfirmDialog("آیا مطمئنید که می‌خواهید این فاکتور را از تاریخچه حذف کنید؟", () => {
            // تابع callback برای 'بله'
            const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]'); // **خواندن مجدد تاریخچه**
            if (index < 0 || index >= history.length) {
                 displayMessage("خطا در حذف فاکتور: شاخص نامعتبر است.", 3000);
                 renderHistory(); // رندر مجدد احتیاطی در صورت خطا
                 return;
            }
            history.splice(index, 1); // حذف فاکتور در شاخص مشخص شده
            localStorage.setItem('invoiceHistory', JSON.stringify(history)); // به‌روزرسانی localStorage
            renderHistory(); // **فراخوانی renderHistory برای به‌روزرسانی نمایش**
            displayMessage("فاکتور از تاریخچه حذف شد.", 2000);
        });
    }


    // تابع برای خروجی گرفتن از تاریخچه به صورت CSV
    function exportHistory() {
        const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');
        if (history.length === 0) {
            displayMessage("تاریخچه‌ای برای خروجی گرفتن وجود ندارد.", 2000);
            return;
        }

        // سربرگ CSV - ستون‌ها باید سازگار با نرم‌افزارهای صفحه گسترده باشند (اعداد انگلیسی)
        let csvContent = "تاریخ,زمان,جمع کل فاکتور (تومان),نام کالا,قیمت کالا (تومان)\n";

        history.forEach(entry => {
            // تاریخ و زمان را برای CSV شاید بهتر باشد به فرمت انگلیسی درآورد
			const invoiceDate = entry.date;
             // زمان را هم به فرمت 24 ساعته و انگلیسی
            const invoiceTime = new Date('1970/01/01 ' + entry.time.replace(/ص|ق.ظ|ب.ظ/g, '') // حذف عبارات فارسی زمان
                .replace(':', ':')).toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-'); // HH-MM-SS

            const invoiceTotal = entry.total; // عدد خام (انگلیسی) برای CSV

            entry.items.forEach(item => {
                 // برای اطمینان از اینکه نام کالا اگر شامل کاما یا کوتیشن بود مشکلی ایجاد نکند
                const itemName = `"${item.name.replace(/"/g, '""')}"`; // Double quotes inside field are escaped by double double quotes
                const itemPrice = item.price; // عدد خام (انگلیسی) برای CSV

                csvContent += `${invoiceDate},${invoiceTime},${invoiceTotal},${itemName},${itemPrice}\n`;
            });
        });

        // BOM برای اطمینان از نمایش صحیح کاراکترهای فارسی در اکسل
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
             // نام فایل CSV شامل تاریخ و زمان فعلی باشد (با ارقام انگلیسی)
            const now = new Date();
            const fileNameDate = now.toISOString().slice(0,10); // YYYY-MM-DD
            const fileNameTime = now.toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-'); // HH-MM-SS
            link.setAttribute('download', `invoice_history_${fileNameDate}_${fileNameTime}.csv`);

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            // پیام موفقیت در دانلود نیازی نیست، مرورگر خودش پیام می‌دهد یا فایل را نمایش می‌دهد.
        } else {
            // فال‌بک برای مرورگرهای قدیمی‌تر
            displayMessage("مرورگر شما از دانلود مستقیم فایل پشتیبانی نمی‌کند. محتوا را کپی کنید:\n\n" + csvContent, 10000); // پیام با مدت زمان طولانی‌تر
        }
    }


    // تابع رندر کردن تاریخچه با دکمه حذف برای هر آیتم
    function renderHistory() {
      const historyDiv = document.getElementById('invoiceHistory');
      historyDiv.innerHTML = '';
      const history = JSON.parse(localStorage.getItem('invoiceHistory') || '[]');

      if (history.length === 0) {
          historyDiv.innerHTML = '<p style="text-align: center;">تاریخچه‌ای وجود ندارد.</p>';
          return;
      }

      // نمایش تاریخچه از جدیدترین به قدیمی‌ترین
      // توجه: هنگام رندر کردن معکوس، باید شاخص اصلی را برای تابع حذف ذخیره کنیم
      history.slice().reverse().forEach((entry, reversedIndex) => {
        // محاسبه شاخص اصلی در آرایه history قبل از معکوس شدن
        const originalIndex = history.length - 1 - reversedIndex;

        const div = document.createElement('div');
        div.className = 'history-entry';
        div.innerHTML = `
          <div> <!-- محتوای متنی فاکتور در یک div داخلی -->
              <strong>${entry.date} - ${entry.time}</strong><br>
              <ul>
                ${entry.items.map(i => 
                    `<li>${i.name} (${toPersianDigits(i.quantity)} عدد × ${formatNumberForDisplay(i.unitPrice)} = ${formatNumberForDisplay(i.totalPrice)} تومان)</li>`
                ).join('')}
              </ul>
              جمع کل: ${formatNumberForDisplay(entry.total)} تومان
          </div>
          <!-- دکمه حذف با ارسال شاخص اصلی -->
          <button onclick="deleteHistoryEntry(${originalIndex})">حذف</button>
        `;
        historyDiv.appendChild(div);
      });
    }

    function toggleHistory(event) {
      const overlay = document.getElementById('historyOverlay');
      // جلوگیری از بسته شدن با کلیک داخل محتوا
      if (event && event.target !== overlay && event.target.parentNode !== document.getElementById('historyOverlay')) {
          return;
      }
      // مطمئن می‌شویم که دیالوگ تایید سفارشی باز نیست
      if (document.getElementById('customConfirmOverlay').style.display === 'flex') {
          return;
      }

      if (overlay.style.display === 'flex') {
          overlay.style.display = 'none';
           // هنگام بسته شدن تاریخچه، پیام‌های شناور را پاک کنید
          displayMessage('', 0); // پیام خالی با زمان 0 برای پاک کردن فوری
      } else {
          overlay.style.display = 'flex';
          renderHistory(); // فقط هنگام باز شدن، تاریخچه را رندر کن
      }
    }


function getLocalizedDate(date) {
    if (isPersianLocaleSupported()) {
        return date.toLocaleDateString('fa-IR');
    } else {
        const pDate = toPersianDate(date);
        return formatPersianDate(pDate);
    }
}

function updateClock() {
    const now = new Date();
    const daysOfWeek = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"]; // آرایه نام روزهای هفته
    const dayOfWeek = daysOfWeek[now.getDay()]; // بدست آوردن نام روز هفته
    const time = now.toLocaleTimeString('fa-IR');
    const date = now.toLocaleDateString('fa-IR');
    document.getElementById('clock').innerText = `${dayOfWeek}، ${date} - ${time}`; // اضافه کردن نام روز هفته به خروجی
}

    // رویداد DOMContentLoaded برای اجرای کد پس از بارگذاری کامل DOM
    document.addEventListener('DOMContentLoaded', () => {
        renderItems();
        updateClock();
        setInterval(updateClock, 1000);

         // افزودن شنونده رویداد برای کلید Escape برای بستن overlay ها
         document.addEventListener('keydown', (event) => {
             if (event.key === 'Escape') {
                 // اگر دیالوگ تایید باز است، آن را ببند
                 if (document.getElementById('customConfirmOverlay').style.display === 'flex') {
                     hideConfirmDialog();
                     // اگر callback برای No وجود دارد، آن را اجرا کن (رفتار پیش‌فرض Esc مانند No است)
                     // این بخش نیازمند اصلاح در منطق callback ها است یا باید آن را نادیده گرفت
                     // برای سادگی فعلا فقط دیالوگ را می‌بندیم.
                 }
                 // اگر تاریخچه باز است، آن را ببند
                 else if (document.getElementById('historyOverlay').style.display === 'flex') {
                     toggleHistory();
                 }
             }
         });
    });



function toPersianDate(date) {
    const gregorian = new Date(date);
    let gy = gregorian.getFullYear(),
        gm = gregorian.getMonth() + 1,
        gd = gregorian.getDate();

    let daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0)) {
        daysInMonth[1] = 29;
    }

    let pYear = 0,
        pMonth = 0,
        pDay = 0;

    // تبدیل میلادی به هجری شمسی
    function isLeap(year) {
        return (((year % 631) % 4) !== 0) ? false : true;
    }

    function getDaysInMonth(month, year) {
        if (month === 12) {
            return isLeap(year) ? 29 : 28;
        } else if (month < 7) {
            return 31;
        } else {
            return 30;
        }
    }

    function getPersianDate(gy, gm, gd) {
        let g_day_no = Math.floor(365.25 * (gy - 1)) +
            Math.floor((gm - 1) * 30.6001) +
            (gd - 32075);

        let z = g_day_no - 1948440 + 1;
        let a = Math.floor((z - 1) / 1461);
        let b = ((z - 1) % 1461);
        let c;
        if (b >= 366) {
            a++;
            c = b - 366;
        } else {
            c = b;
        }

        let d = Math.floor(c / 365);
        let e = c % 365;
        let m = Math.floor((e + 10) * 682 / 2145);

        if (m < 10) {
            pMonth = m;
        } else if (m < 13) {
            pMonth = m - 9;
        } else {
            pMonth = m - 10;
        }

        let pYear = 474 + a + 2 * d;
        let pDay = e - Math.floor((m < 10) ? (m * 30671 / 2145) :
            (m === 10 || m === 13) ? 274 : 305);

        if (pMonth <= 0) {
            pMonth += 12;
            pYear--;
        }

        return { year: pYear, month: pMonth, day: pDay };
    }

    return getPersianDate(gy, gm, gd);
}



function formatPersianDate(pDate) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const year = pDate.year.toString().replace(/\d/g, digit => persianDigits[digit]);
    const month = pDate.month.toString().replace(/\d/g, digit => persianDigits[digit]);
    const day = pDate.day.toString().replace(/\d/g, digit => persianDigits[digit]);

    return `${day}/${month}/${year}`;
}


function isPersianLocaleSupported() {
    const now = new Date();
    const faDate = now.toLocaleDateString('fa-IR');

    // تبدیل ارقام فارسی به انگلیسی
    const converted = convertToEnglishDigits(faDate);

    // استخراج سال
    const yearMatch = converted.match(/(\d{4})\//);
    if (!yearMatch) return false;

    const year = parseInt(yearMatch[1], 10);

    return year >= 1400 && year <= 2000;
}
