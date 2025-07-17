// calendar-logic.js (نسخه نهایی با تمام اصلاحات)

const PersianCalendar = {
    currentYear: 1404,
    currentMonth: 1,

    init: function () {
        const today = new Date();
        const todayJalaali = CalendarConverter.jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
        this.currentYear = todayJalaali.jy;
        this.currentMonth = todayJalaali.jm;

        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));

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

    renderCalendar: function (year, month) {
        const gridEl = document.getElementById('calendar-grid');
        const eventsEl = document.getElementById('events-container');
        const monthYearDisplayEl = document.getElementById('month-year-display');

        gridEl.style.opacity = 0;
        eventsEl.style.opacity = 0;

        setTimeout(() => {
            const daysInMonth = CalendarConverter.jalaali.jalaaliMonthLength(year, month);
            
            // --- محاسبه تاریخ ابتدا و انتهای ماه ---
            const startOfMonthGregorian = CalendarConverter.jalaali.toGregorian(year, month, 1);
            const endOfMonthGregorian = CalendarConverter.jalaali.toGregorian(year, month, daysInMonth);
            const startOfMonthHijri = CalendarConverter.hijri.toHijri(startOfMonthGregorian.gy, startOfMonthGregorian.gm - 1, startOfMonthGregorian.gd);
            const endOfMonthHijri = CalendarConverter.hijri.toHijri(endOfMonthGregorian.gy, endOfMonthGregorian.gm - 1, endOfMonthGregorian.gd);

            // --- بروزرسانی عنوان ---
            const jalaaliMonthName = CalendarData.JALALI_MONTHS[month - 1];

            const gregorianMonthNameStart = CalendarData.GREGORIAN_MONTHS[startOfMonthGregorian.gm - 1];
            const gregorianMonthNameEnd = CalendarData.GREGORIAN_MONTHS[endOfMonthGregorian.gm - 1];
            const gregorianSubtitle = gregorianMonthNameStart === gregorianMonthNameEnd ? gregorianMonthNameStart : `${gregorianMonthNameStart} - ${gregorianMonthNameEnd}`;

            const hijriMonthNameStart = CalendarData.HIJRI_MONTHS[startOfMonthHijri.hm - 1];
            const hijriMonthNameEnd = CalendarData.HIJRI_MONTHS[endOfMonthHijri.hm - 1];
            const hijriSubtitle = hijriMonthNameStart === hijriMonthNameEnd ? hijriMonthNameStart : `${hijriMonthNameStart} - ${hijriMonthNameEnd}`;
            
            monthYearDisplayEl.innerHTML = `
                ${jalaaliMonthName} ${year}
                <span class="subtitle">${gregorianSubtitle} ${startOfMonthGregorian.gy} | ${hijriSubtitle} ${startOfMonthHijri.hy}</span>
            `;

            // --- ساخت جدول تقویم ---
            const firstDayOfWeek = new Date(startOfMonthGregorian.gy, startOfMonthGregorian.gm - 1, startOfMonthGregorian.gd).getDay();
            const emptyCellsAtStart = (firstDayOfWeek + 1) % 7;
            
            let tableHtml = `<table>
                <thead><tr><th>ش</th><th>ی</th><th>د</th><th>س</th><th>چ</th><th>پ</th><th>ج</th></tr></thead>
                <tbody>`;

            let row = "<tr>";
            for (let i = 0; i < emptyCellsAtStart; i++) { row += "<td></td>"; }

            let monthEvents = [];
            const today = new Date();
            const todayJalaali = CalendarConverter.jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
            const todayKey = `${todayJalaali.jy}-${this.padZero(todayJalaali.jm)}-${this.padZero(todayJalaali.jd)}`;

            for (let day = 1; day <= daysInMonth; day++) {
                const key = `${year}-${this.padZero(month)}-${this.padZero(day)}`;
                const gregorianDate = CalendarConverter.jalaali.toGregorian(year, month, day);
                const hijriDate = CalendarConverter.hijri.toHijri(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd);

                const miladiStr = `${gregorianDate.gy}-${this.padZero(gregorianDate.gm)}-${this.padZero(gregorianDate.gd)} (${CalendarData.GREGORIAN_MONTHS[gregorianDate.gm - 1].substring(0, 3)})`;
                const hijriStr = `${hijriDate.hy}/${this.padZero(hijriDate.hm)}/${this.padZero(hijriDate.hd)} (${CalendarData.HIJRI_MONTHS[hijriDate.hm - 1]})`;

                const dayOfWeek = new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd).getDay();
                const isHoliday = publicHolidays.has(key);

                let classes = "";
                if (dayOfWeek === 5 && !isHoliday) classes += "friday ";
                if (isHoliday) classes += "holiday ";
                if (key === todayKey) classes += "today ";

                if (events[key]) {
                    monthEvents.push({ day: day, text: events[key].join('، '), isHoliday: isHoliday });
                }

                row += `<td class="${classes.trim()}">
                            <div class="day-number">${day}</div>
                            <div class="date-info">${miladiStr}</div>
                            <div class="date-info">${hijriStr}</div>
                        </td>`;

                if (dayOfWeek === 5) {
                    tableHtml += row + "</tr>";
                    row = "<tr>";
                }
            }

            if (row !== "<tr>") {
                const lastDayOfWeek = new Date(endOfMonthGregorian.gy, endOfMonthGregorian.gm - 1, endOfMonthGregorian.gd).getDay();
                const remainingCells = (5 - lastDayOfWeek + 7) % 7;
                for (let i = 0; i < remainingCells; i++) { row += "<td></td>"; }
                tableHtml += row + "</tr>";
            }
            
            tableHtml += `</tbody></table>`;
            gridEl.innerHTML = tableHtml;

            // --- ساخت لیست مناسبت‌ها ---
            let eventsHtml = '<h3>مناسبت‌های ماه</h3>';
            if (monthEvents.length > 0) {
                eventsHtml += '<ul>';
                monthEvents.sort((a,b) => a.day - b.day); // مرتب‌سازی مناسبت‌ها بر اساس روز
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

        }, 250); // زمان انیمیشن
    }
};

// شروع برنامه
document.addEventListener('DOMContentLoaded', () => PersianCalendar.init());