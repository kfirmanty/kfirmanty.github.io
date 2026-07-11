function initStorageSystem() {
    const storePlayingAudio = (playingAudioIndex, position) => {
        if (!localStorage) {
            return;
        }
        try {
            const lastPlayingAudio = {
                id: playingAudioIndex,
                position,
                playedAt: new Date().toISOString()
            };
            localStorage.setItem('lastPlayingAudio', JSON.stringify(lastPlayingAudio));
        } catch (e) {
            console.error("Error storing last playing audio in localStorage:", e);
        }
    }

    const clearLastPlayingAudio = () => {
        if (!localStorage) {
            return;
        }
        try {
            localStorage.setItem('lastPlayingAudio', undefined);
        } catch (e) {
            console.error("Error clearing last playing audio in localStorage:", e);
        }
    }

    const loadLastPlayingAudio = () => {
        if (!localStorage) {
            return;
        }
        try {
            const lastPlayingAudio = localStorage.getItem('lastPlayingAudio');
            if (!lastPlayingAudio) {
                return;
            }

            const { id, position, playedAt } = JSON.parse(lastPlayingAudio);

            return {
                id,
                position,
                playedAt: playedAt || new Date().toISOString()
            };
        } catch (e) {
            console.error("Error loading last playing audio from localStorage:", e);
            return;
        }
    }

    return {
        storePlayingAudio,
        loadLastPlayingAudio,
        clearLastPlayingAudio
    }
}