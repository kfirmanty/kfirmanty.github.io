function tryToAcquireWakeLock() {
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request("screen").catch(() => {
            alert("W trybie uśpienia nie ma możliwości zbierania pozycji GPS. Po przybyciu do punktu odblokuj telefon.");
        });
    } else {
        alert("Twoje urządzenie nie obsługuje blokady ekranu. Upewnij się, że ekran pozostaje włączony.");
    }
}

function startExperience() {
    document.getElementById('startbutton').remove();

    const refreshButton = document.getElementById('refreshbutton')
    refreshButton.style.display = 'block';

    const pauseButton = document.getElementById('pausebutton');
    pauseButton.style.display = 'block';

    let isPaused = false;

    const playerStartPos = [53.365490, 14.600213];
    const currentPlayerId = Math.floor(Math.random() * 10000000);

    const storage = initStorageSystem();
    const audio = initAudioSystem({ storage });
    const map = initMapSystem({ playerStartPos, currentPlayerId });
    const network = initNetworkSystem({ map, currentPlayerId });
    const gps = initGpsSystem({ audio, network, map, currentPlayerId });

    tryToAcquireWakeLock();

    pauseButton.onclick = () => {
        if (isPaused) {
            gps.resume();
            audio.resume();
            pauseButton.innerText = "Pauza";
        } else {
            gps.pause();
            audio.pause();
            pauseButton.innerText = "Wznów";
        }
        isPaused = !isPaused;
    };

    refreshButton.onclick = () => {
        audio.savePlayingStatus();
        window.location.reload();
    };
    window.onbeforeunload = () => audio.savePlayingStatus();

    const hashTrigger = window.location.hash?.substring(1);
    if (hashTrigger) {
        const triggerLookup = {
            "lapp_powstanie_qr1": "trasa 1/1. chryzostom",
        }
        const trigger = triggerLookup[hashTrigger];
        if (!trigger) {
            console.log(`🔗 Nie znaleziono triggera dla ${hashTrigger}`);
            return;
        }
        console.log(`🔗 Odtwórz z hash: ${hashTrigger}`);
        audio.playAudioForTarget({ id: trigger, name: hashTrigger.replace(/-/g, ' ') });
    } else {
        audio.resumeLastPlaying();
    }
}