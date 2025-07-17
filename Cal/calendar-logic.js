// calendar-logic.js (نسخه نهایی با تغییرات ریسپانسیو و فرمت تاریخ قمری)

const PersianCalendar = {
    currentYear: 1404,
    currentMonth: 1,
    MOBILE_BREAKPOINT: 400, // نقطه شکست برای فعالسازی فرمت موبایل

    init: function () {
        const today = new Date();
        const todayJalaali = this.getJalaliFromGregorian(today.getFullYear(), today.getMonth() + 1, today.getDate());
        this.currentYear = todayJalaali.jy;
        this.currentMonth = todayJalaali.jm;

        this.populateMonthSelector();

        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('goto-today').addEventListener('click', () => this.gotoToday());
        document.getElementById('month-selector').addEventListener('change', (e) => this.selectMonth(e));

        this.renderCalendar(this.currentYear, this.currentMonth);

        // افزودن listener برای تشخیص تغییر اندازه صفحه
        window.addEventListener('resize', () => {
            // برای جلوگیری از فراخوانی مکرر هنگام تغییر سایز شدید، می‌توان از debounce استفاده کرد
            // اما برای سادگی در اینجا مستقیماً فراخوانی می‌شود.
            this.renderCalendar(this.currentYear, this.currentMonth);
        });
    },

    populateMonthSelector: function() {
        const selector = document.getElementById('month-selector');
        selector.innerHTML = '';
        CalendarData.JALALI_MONTHS.forEach((monthName, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = monthName;
            selector.appendChild(option);
        });
    },

    selectMonth: function(event) {
        this.currentMonth = parseInt(event.target.value);
        this.renderCalendar(this.currentYear, this.currentMonth);
    },

    gotoToday: function() {
        const today = new Date();
        const todayJalaali = this.getJalaliFromGregorian(today.getFullYear(), today.getMonth() + 1, today.getDate());
        this.currentYear = todayJalaali.jy;
        this.currentMonth = todayJalaali.jm;
        this.renderCalendar(this.currentYear, this.currentMonth);
    },

    changeMonth: function (direction) {
        this.currentMonth += direction;
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
        }
        if (this.currentMonth < 1) {
            this.currentMonth = 12;
            this.currentYear--;
        }
        this.renderCalendar(this.currentYear, this.currentMonth);
    },

    padZero: (num) => (num < 10 ? '0' + num : String(num)),
    
    getJalaliFromGregorian(gy, gm, gd) {
        const dateStr = `${gy}-${this.padZero(gm)}-${this.padZero(gd)}`;
        for (const key in masterData1404) {
            if (masterData1404[key].g === dateStr) {
                const [jy, jm, jd] = key.split('-').map(Number);
                return { jy, jm, jd };
            }
        }
        // Fallback for years outside masterData1404 range or if not found
        // This part should ideally use a robust date conversion library if comprehensive range is needed.
        // For 1404, the masterData should cover all dates.
        const converter = CalendarConverter.jalaali.toJalaali(gy, gm, gd);
        return { jy: converter.jy, jm: converter.jm, jd: converter.jd };
    },

    renderCalendar: function (year, month) {
        const gridEl = document.getElementById('calendar-grid');
        const eventsEl = document.getElementById('events-container');
        const monthSelector = document.getElementById('month-selector');
        const yearDisplay = document.getElementById('year-display');
        const subtitleDisplay = document.getElementById('subtitle-display');

        gridEl.style.opacity = 0;
        eventsEl.style.opacity = 0;

        setTimeout(() => {
            monthSelector.value = month;
            yearDisplay.textContent = year;

            const daysInMonth = Object.keys(masterData1404).filter(k => k.startsWith(`${year}-${this.padZero(month)}`)).length;
            if (daysInMonth === 0) {
                gridEl.innerHTML = "<p>اطلاعات این ماه موجود نیست.</p>";
                eventsEl.innerHTML = "";
                subtitleDisplay.textContent = "";
                gridEl.style.opacity = 1;
                return;
            }

            const startOfMonthKey = `${year}-${this.padZero(month)}-01`;
            const endOfMonthKey = `${year}-${this.padZero(month)}-${this.padZero(daysInMonth)}`;
            const startOfMonthData = masterData1404[startOfMonthKey];
            const endOfMonthData = masterData1404[endOfMonthKey];
            
            const [startGy, startGm] = startOfMonthData.g.split('-').map(Number);
            const [endGy, endGm] = endOfMonthData.g.split('-').map(Number);
            const [startHy, startHm] = startOfMonthData.h.split('-').map(Number);
            
            const gregorianMonthNameStart = CalendarData.GREGORIAN_MONTHS[startGm - 1];
            const gregorianMonthNameEnd = CalendarData.GREGORIAN_MONTHS[endGm - 1];
            const gregorianSubtitle = gregorianMonthNameStart === gregorianMonthNameEnd ? gregorianMonthNameStart : `${gregorianMonthNameStart} - ${gregorianMonthNameEnd}`;
            
            const hijriMonthNameStart = CalendarData.HIJRI_MONTHS[startHm - 1];
            const hijriMonthNameEnd = CalendarData.HIJRI_MONTHS[endOfMonthData.h.split('-').map(Number)[1] - 1];
            const hijriSubtitle = hijriMonthNameStart === hijriMonthNameEnd ? hijriMonthNameStart : `${hijriMonthNameStart} - ${hijriMonthNameEnd}`;
            
            subtitleDisplay.textContent = `${gregorianSubtitle} ${startGy} | ${hijriSubtitle} ${startHy}`;

            const firstDayDate = new Date(startOfMonthData.g);
            const firstDayOfWeek = firstDayDate.getDay();
            const emptyCellsAtStart = (firstDayOfWeek + 1) % 7; // +1 because JS getDay() is 0 for Sunday, we want Saturday to be 0

            let tableHtml = `<table>
                <thead>
                    <tr>
                        <th><div class="weekday-modern">شنبه</div><div class="weekday-ancient">کیوان شید</div></th>
                        <th><div class="weekday-modern">یک‌شنبه</div><div class="weekday-ancient">مهرشید</div></th>
                        <th><div class="weekday-modern">دوشنبه</div><div class="weekday-ancient">مهشید</div></th>
                        <th><div class="weekday-modern">سه‌شنبه</div><div class="weekday-ancient">بهرام شید</div></th>
                        <th><div class="weekday-modern">چهارشنبه</div><div class="weekday-ancient">تیرشید</div></th>
                        <th><div class="weekday-modern">پنج‌شنبه</div><div class="weekday-ancient">اورمزد شید</div></th>
                        <th><div class="weekday-modern">آدینه</div><div class="weekday-ancient">ناهیدشید</div></th>
                    </tr>
                </thead>
                <tbody>`;

            let row = "<tr>";
            for (let i = 0; i < emptyCellsAtStart; i++) { row += "<td></td>"; }

            let monthEvents = [];
            const today = new Date();
            const todayJalaali = this.getJalaliFromGregorian(today.getFullYear(), today.getMonth() + 1, today.getDate());
            const todayKey = `${todayJalaali.jy}-${this.padZero(todayJalaali.jm)}-${this.padZero(todayJalaali.jd)}`;

            for (let day = 1; day <= daysInMonth; day++) {
                const key = `${year}-${this.padZero(month)}-${this.padZero(day)}`;
                const dayData = masterData1404[key];
                if (!dayData) continue;

                const [gy, gm, gd] = dayData.g.split('-').map(Number);
                const [hy, hm, hd] = dayData.h.split('-').map(Number);

                let miladiStr;
                let hijriStr;
                let hijriDateClass = 'date-info'; // Default class

                if (window.innerWidth <= this.MOBILE_BREAKPOINT) {
                    // فرمت کوتاه برای موبایل
                    miladiStr = `${this.padZero(gm)}-${this.padZero(gd)}`; // 07-17
                    const hijriMonthName = CalendarData.HIJRI_MONTHS[hm - 1];
                    hijriStr = `${hd} ${hijriMonthName}`; // 21 محرم  <-- بازگرداندن به فرمت "روز ماه"
                    hijriDateClass = 'date-info date-info-hijri-mobile'; // اضافه کردن کلاس جدید برای استایل
                } else {
                    // فرمت کامل برای دسکتاپ
                    miladiStr = `${dayData.g} (${CalendarData.GREGORIAN_MONTHS[gm - 1].substring(0, 3)})`;
                    hijriStr = `${hy}/${this.padZero(hm)}/${this.padZero(hd)} (${CalendarData.HIJRI_MONTHS[hm - 1]})`;
                }
                
                const dayOfWeek = new Date(dayData.g).getDay();
                const isHoliday = publicHolidays.has(key);

                let classes = "";
                if (dayOfWeek === 5 && !isHoliday) classes += "friday ";
                if (isHoliday) classes += "holiday ";
                if (key === todayKey) classes += "today ";

                if (events[key]) {
                    monthEvents.push({ day: day, text: events[key].join('، '), isHoliday: isHoliday });
                }

                row += `<td class="${classes.trim()}">
                            <div class="cell-content">
                                <div class="day-number">${day}</div>
                                <div class="date-info-container">
                                    <div class="date-info">${miladiStr}</div>
                                    <div class="${hijriDateClass}">${hijriStr}</div>
                                </div>
                            </div>
                        </td>`;

                if (dayOfWeek === 5) { // If it's Friday (day 5 in JS, assuming Saturday is 0 in table header)
                    tableHtml += row + "</tr>";
                    row = "<tr>";
                }
            }

            // Fill remaining cells of the last row
            if (row !== "<tr>") {
                const lastDayDate = new Date(endOfMonthData.g);
                const lastDayOfWeek = lastDayDate.getDay();
                // calculate remaining cells to fill the week (Saturday-Friday)
                const remainingCells = (5 - lastDayOfWeek + 7) % 7; // (5 is Friday)
                for (let i = 0; i < remainingCells; i++) { row += "<td></td>"; }
                tableHtml += row + "</tr>";
            }
            
            tableHtml += `</tbody></table>`;
            gridEl.innerHTML = tableHtml;

            let eventsHtml = '<h3>مناسبت‌های ماه</h3>';
            if (monthEvents.length > 0) {
                eventsHtml += '<ul>';
                monthEvents.sort((a,b) => a.day - b.day);
                monthEvents.forEach(event => {
                    const holidayClass = event.isHoliday ? ' class="holiday-event"' : '';
                    eventsHtml += `<li${holidayClass}><strong>روز ${event.day}:</strong> ${event.text}</li>`;
                });
                eventsHtml += '</ul>';
            } else {
                eventsHtml += '<p>مناسبتی برای این ماه ثبت نشده است.</p>';
            }
            eventsEl.innerHTML = eventsHtml;
            
            gridEl.style.opacity = 1;
            eventsEl.style.opacity = 1;

        }, 250);
    }
};

document.addEventListener('DOMContentLoaded', () => PersianCalendar.init());