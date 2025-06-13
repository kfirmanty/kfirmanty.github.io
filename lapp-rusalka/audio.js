const audioMap = {};
targets.forEach(t => {
    if (!audioMap[t.id]) {
        audioMap[t.id] = new Audio(`audio/${t.id}.mp3`);
        audioMap[t.id].preload = "auto"; // Preload audio
    }
});
const pauseAudio = new Audio("audio/pauza.mp3");

function initAudioSystem({ storage }) {
    const state = {
        playingId: null,
    }

    const app = document.getElementById('app');

    const stopAllExcept = (idToKeep) => {
        Object.entries(audioMap).forEach(([id, audio]) => {
            if (id !== idToKeep && !audio.paused) {
                audio.pause();
            }
        });
    }

    const playAudioForTarget = ({ id, name, position }) => {
        if (!audioMap[id]) return;
        if (state.playingId === id) return; // Prevent re-triggering the same audio

        stopAllExcept(id);
        audioMap[id].play();
        state.playingId = id;

        console.log('odtwarzanie pliku audio', { position, id, name });

        if (position) {
            audioMap[id].currentTime = position;
        }
    }

    const savePlayingStatus = () => {
        const currentlyPlaying = audioMap[state.playingId];
        if (currentlyPlaying) {
            if (currentlyPlaying.paused) {
                console.log('🎧 Audio already finished, clearing local storage');
                storage.clearLastPlayingAudio();
            } else {
                const currentTime = currentlyPlaying.currentTime;
                storage.storePlayingAudio(state.playingId, currentTime);
            }
        }
    };

    const hasBeenPlayingLessThan10MinutesAgo = (playedAt) => {
        const now = new Date();
        const playedTime = new Date(playedAt);
        const diffInMinutes = (now - playedTime) / (1000 * 60);
        return diffInMinutes < 10;
    }

    const resumeLastPlaying = () => {
        const lastPlayed = storage.loadLastPlayingAudio();
        console.log(`🔄 Odtwarzanie ostatniego: ${lastPlayed ? `${lastPlayed.id}:${lastPlayed.position}` : 'brak'}`);
        if (lastPlayed && audioMap[lastPlayed.id] && lastPlayed.playedAt) {
            if (hasBeenPlayingLessThan10MinutesAgo(lastPlayed.playedAt)) {
                playAudioForTarget({ id: lastPlayed.id, position: lastPlayed.position });
            } else {
                console.log('🔄 plik odtworzony więcej niż 10 minut temu, nie odtwarzam ponownie');
            }
        }
    }

    const resume = () => {
        pauseAudio.pause();
        pauseAudio.currentTime = 0;
        audioMap[state.playingId]?.play();
    }

    const pause = () => {
        audioMap[state.playingId]?.pause();
        pauseAudio.play();
    }

    return {
        playAudioForTarget,
        savePlayingStatus,
        resumeLastPlaying,
        resume,
        pause
    }
}