function storePlayingAudio(playingAudioIndex, position) {
    if (!localStorage) {
        return;
    }
    try {
        const lastPlayingAudio = {
            index: playingAudioIndex,
            position
        };
        localStorage.setItem('lastPlayingAudio', JSON.stringify(lastPlayingAudio));
    } catch (e) {
        console.error("Error storing last playing audio in localStorage:", e);
    }
}

function loadLastPlayingAudio() {
    if (!localStorage) {
        return;
    }
    try {
        const lastPlayingAudio = localStorage.getItem('lastPlayingAudio');
        if (!lastPlayingAudio) {
            return;
        }

        const { index, position } = JSON.parse(lastPlayingAudio);

        if (typeof index !== 'number' || typeof position !== 'number') {
            console.error("Invalid data format in localStorage for last playing audio.");
            return;
        }
        return {
            index,
            position
        };
    } catch (e) {
        console.error("Error loading last playing audio from localStorage:", e);
        return;
    }
}