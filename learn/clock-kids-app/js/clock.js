// filepath: clock-kids-app/clock-kids-app/js/clock.js

// Clock Functions
function updateAnalogClock(hours, minutes) {
    const hourHand = document.querySelector('.hour-hand');
    const minuteHand = document.querySelector('.minute-hand');

    const hourDegrees = (hours % 12) * 30 + minutes * 0.5;
    const minuteDegrees = minutes * 6;

    hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
}

function updateDigitalClock(hours, minutes) {
    const digitalHours = document.querySelector('.hours');
    const digitalMinutes = document.querySelector('.minutes');
    
    digitalHours.textContent = hours.toString().padStart(2, '0');
    digitalMinutes.textContent = minutes.toString().padStart(2, '0');
}

function speakCurrentTime(hours, minutes) {
    const timeString = formatTimeString(hours, minutes);
    
    const utterance = new SpeechSynthesisUtterance(timeString);
    speechSynthesis.speak(utterance);
}

function formatTimeString(hours, minutes) {
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
}