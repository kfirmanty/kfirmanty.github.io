function initStorageSystem() {
    const storePlayingAudio = (playingAudioIndex, position) => {
        if (!localStorage) {
            return;
        }
        try {
            const lastPlayingAudio = {
                id: playingAudioIndex,
                position
            };
            localStorage.setItem('lastPlayingAudio', JSON.stringify(lastPlayingAudio));
        } catch (e) {
            console.error("Error storing last playing audio in localStorage:", e);
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

            const { id, position } = JSON.parse(lastPlayingAudio);

            return {
                id,
                position
            };
        } catch (e) {
            console.error("Error loading last playing audio from localStorage:", e);
            return;
        }
    }

    return {
        storePlayingAudio,
        loadLastPlayingAudio
    }
}