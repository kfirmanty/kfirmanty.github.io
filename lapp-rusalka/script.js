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

    const playerStartPos = [52.4109013, 16.906778];
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
            "lapp-rusalka-start-1": "QR_1_punkt startowy golęcin",
            "lapp-rusalka-start-2": "QR_2_punkt startowy ośrodek",
            "lapp-rusalka-start-3": "QR_3_punkt startowy mostek bobrowy",
            "lapp-rusalka-start-4": "QR_4_punkt startowy plaża nudystów",
            "lapp-rusalka-start-5": "QR_5_punkt startowy ulica botaniczna",
        }
        const trigger = triggerLookup[hashTrigger];
        if (!trigger) {
            logDebug(`🔗 Nie znaleziono triggera dla ${hashTrigger}`);
            return;
        }
        logDebug(`🔗 Odtwórz z hash: ${hashTrigger}`);
        audio.playAudioForTarget({ id: hashTrigger, name: hashTrigger.replace(/-/g, ' ') });
    } else {
        audio.resumeLastPlaying();
    }
}