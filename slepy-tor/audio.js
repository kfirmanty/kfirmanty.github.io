const audioMap = {};

function loadAudio(id) {
    const audio = new Audio(`audio/${id}.mp3`);
    audio.preload = "auto";
    return audio;
}

function fadeIn(audio, duration = 1000) {
    audio.volume = 0;
    audio.play();
    let step = 0.05;
    let interval = setInterval(() => {
        if (audio.volume < 1) {
            audio.volume = Math.min(1, audio.volume + step);
        } else {
            clearInterval(interval);
        }
    }, duration * step);
}

function fadeOut(audio, duration = 1000) {
    let step = 0.05;
    let interval = setInterval(() => {
        if (audio.volume > 0) {
            audio.volume = Math.max(0, audio.volume - step);
        } else {
            audio.pause();
            //audio.currentTime = 0;
            clearInterval(interval);
        }
    }, duration * step);
}