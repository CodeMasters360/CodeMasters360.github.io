// calendar-converter.js

const CalendarConverter = (function() {
    // ---===[ توابع کمکی ]===---
    function div(a, b) { return ~~(a / b); }
    function mod(a, b) { return a - ~~(a / b) * b; }

    // ---===[ بخش الگوریتم‌های تبدیل تاریخ جلالی ]===---
    const jalaali = (function() {
        const breaks = CalendarData.JALALI_BREAKS;

        function toGregorian(jy, jm, jd) {
            return d2g(j2d(jy, jm, jd));
        }

        function toJalaali(gy, gm, gd) {
            return d2j(g2d(gy, gm, gd));
        }

        function isLeapJalaaliYear(jy) {
            return jalCal(jy).leap === 0;
        }

        function jalaaliMonthLength(jy, jm) {
            if (jm <= 6) return 31;
            if (jm <= 11) return 30;
            if (isLeapJalaaliYear(jy)) return 30;
            return 29;
        }

        function jalCal(jy) {
            const bl = breaks.length;
            let gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump, leap, leapG, march, n, i;
            if (jy < jp || jy >= breaks[bl - 1]) throw new Error('Invalid Jalaali year ' + jy);
            for (i = 1; i < bl; i += 1) {
                jm = breaks[i];
                jump = jm - jp;
                if (jy < jm) break;
                leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
                jp = jm;
            }
            n = jy - jp;
            leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
            if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
            leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
            march = 20 + leapJ - leapG;
            if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
            leap = mod(mod(n + 1, 33) - 1, 4);
            if (leap === -1) leap = 4;
            return { leap: leap, gy: gy, march: march };
        }

        function j2d(jy, jm, jd) {
            const r = jalCal(jy);
            return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
        }

        function d2j(jdn) {
            const gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy);
            const jdn1f = g2d(gy, 3, r.march);
            let jd, jm, k = jdn - jdn1f;
            if (k >= 0) {
                if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy: jy, jm: jm, jd: jd }; }
                else { k -= 186; }
            } else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
            jm = 7 + div(k, 30);
            jd = mod(k, 30) + 1;
            return { jy: jy, jm: jm, jd: jd };
        }

        function g2d(gy, gm, gd) {
            let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
            d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
            return d;
        }

        function d2g(jdn) {
            let j = 4 * jdn + 139361631;
            j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
            const i = div(mod(j, 1461), 4) * 5 + 308;
            const gd = div(mod(i, 153), 5) + 1;
            const gm = mod(div(i, 153), 12) + 1;
            const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
            return { gy: gy, gm: gm, gd: gd };
        }

        return { toGregorian: toGregorian, toJalaali: toJalaali, jalaaliMonthLength: jalaaliMonthLength, g2d: g2d };
    })();

    // ---===[ بخش الگوریتم‌های تبدیل تاریخ قمری ]===---
    const hijri = (function() {
        const ummalquraData = CalendarData.HIJRI_EPOCH_DATA;
        function toHijri(gy, gm, gd) {
            const jdn = jalaali.g2d(gy, gm + 1, gd);
            return d2h(jdn);
        }
        function d2h(jdn) {
            const mjdn = jdn - 2400000;
            let i = 0; while (ummalquraData[i] <= mjdn) { i++; }
            const totalMonths = i + 16260;
            const cYears = Math.floor((totalMonths - 1) / 12);
            const hy = cYears + 1;
            const hm = totalMonths - 12 * cYears;
            const hd = mjdn - ummalquraData[i - 1] + 1;
            return { hy: hy, hm: hm, hd: hd };
        }
        return { toHijri: toHijri };
    })();

    return { jalaali: jalaali, hijri: hijri };
})();