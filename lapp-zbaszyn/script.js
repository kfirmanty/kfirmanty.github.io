function tryToAcquireWakeLock() {
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request("screen").catch(() => {
            console.log("Nie udało się włączyć blokady wygaszania ekranu.");
        });
    } else {
        console.log("Urządzenie nie obsługuje blokady wygaszania ekranu.");
    }
}

function startExperience() {
    document.getElementById('startbutton').remove();

    const refreshButton = document.getElementById('refreshbutton')
    refreshButton.style.display = 'block';

    const pauseButton = document.getElementById('pausebutton');
    pauseButton.style.display = 'block';

    let isPaused = false;

    const storage = initStorageSystem();
    const audio = initAudioSystem({ storage });
    const map = initMapSystem();
    // GPS i sieć wyłączone — punkty uruchamiane są wyłącznie kodami QR.
    // const network = initNetworkSystem({ map, currentPlayerId });
    // const gps = initGpsSystem({ audio, network, map, currentPlayerId });

    tryToAcquireWakeLock();

    pauseButton.onclick = () => {
        if (isPaused) {
            audio.resume();
            pauseButton.innerText = "Pauza";
        } else {
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

    // Skan kolejnego QR w już otwartej karcie zmienia tylko hash (bez przeładowania).
    // Przeładowanie wymusza przejście przez przycisk "Rozpocznij" — odtwarzanie
    // audio wymaga gestu użytkownika.
    window.addEventListener('hashchange', () => {
        audio.savePlayingStatus();
        window.location.reload();
    });

    const app = document.getElementById('app');

    const triggerLookup = {
        "qr1": "1",
        "qr2": "2",
        "qr3": "3"
    };
    const hashTrigger = window.location.hash?.substring(1);
    const triggerId = triggerLookup[hashTrigger];
    if (triggerId) {
        const target = targets.find(t => t.id === triggerId);
        const name = target ? target.name : `Punkt ${triggerId}`;
        console.log(`🔗 Odtwórz z hash: ${hashTrigger}`);
        audio.playFromTrigger({ id: triggerId, name });
        app.innerText = `Odtwarzanie: ${name}`;
    } else {
        if (hashTrigger) {
            console.log(`🔗 Nie znaleziono triggera dla ${hashTrigger}`);
        }
        app.innerText = "Zeskanuj kod QR przy jednym z punktów, aby odtworzyć nagranie.";
        audio.resumeLastPlaying();
    }
}
