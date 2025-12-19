const audioMap = {};
const preloadingTargets = new Set(); // Track what's being preloaded
const pauseAudio = new Audio("audio/pauza.mp3");

function initAudioSystem({ storage }) {
    const state = {
        playingId: null,
    }

    const app = document.getElementById('app');
    const bufferingIndicator = document.getElementById('bufferingIndicator');
    const bufferingMessage = document.getElementById('bufferingMessage');
    const bufferingProgress = document.getElementById('bufferingProgress');

    // UI Helper Functions
    const showBufferingIndicator = (name) => {
        if (bufferingIndicator) {
            bufferingMessage.textContent = `Ładowanie: ${name}...`;
            bufferingProgress.textContent = '0%';
            bufferingIndicator.style.display = 'block';
        }
    };

    const hideBufferingIndicator = () => {
        if (bufferingIndicator) {
            bufferingIndicator.style.display = 'none';
        }
    };

    const updateBufferProgress = (id, audio) => {
        if (!bufferingProgress || !audio.duration) return;

        const buffered = audio.buffered;
        if (buffered.length > 0) {
            const percent = Math.floor((buffered.end(0) / audio.duration) * 100);
            bufferingProgress.textContent = `${percent}%`;
        }
    };

    // Lazy Loading Function
    const ensureAudioLoaded = (id) => {
        if (!audioMap[id]) {
            console.log('🔄 Loading audio:', id);
            audioMap[id] = new Audio(`audio/${id}.mp3`);
            audioMap[id].preload = "auto";

            // Add buffering event listeners
            audioMap[id].addEventListener('loadstart', () => {
                console.log('📥 Starting download:', id);
            });

            audioMap[id].addEventListener('progress', () => {
                updateBufferProgress(id, audioMap[id]);
                const buffered = audioMap[id].buffered;
                if (buffered.length > 0 && audioMap[id].duration) {
                    const percent = ((buffered.end(0) / audioMap[id].duration) * 100).toFixed(0);
                    console.log(`📊 Buffered ${id}:`, percent + '%');
                }
            });

            audioMap[id].addEventListener('canplaythrough', () => {
                console.log('✅ Ready to play:', id);
            });
        }
        return audioMap[id];
    };

    // Preload Function
    const preloadAudioForTarget = (id) => {
        if (preloadingTargets.has(id)) return; // Already preloading
        preloadingTargets.add(id);

        const audio = ensureAudioLoaded(id);
        audio.load(); // Start buffering
    };

    const stopAllExcept = (idToKeep) => {
        Object.entries(audioMap).forEach(([id, audio]) => {
            if (id !== idToKeep && !audio.paused) {
                console.log('⏹️ Zatrzymywanie audio:', id);
                audio.pause();
            }
        });
    }

    const playAudioForTarget = ({ id, name, position }) => {
        // Ensure audio is loaded
        const audio = ensureAudioLoaded(id);

        if (state.playingId === id) return; // Prevent re-triggering the same audio

        stopAllExcept(id);
        state.playingId = id;

        console.log('odtwarzanie pliku audio', { position, id, name });

        // Check if sufficiently buffered
        if (audio.readyState < 3) { // Less than HAVE_FUTURE_DATA
            showBufferingIndicator(name);

            const onCanPlayThrough = () => {
                hideBufferingIndicator();
                audio.play();
                if (position) {
                    audio.currentTime = position;
                }
            };

            audio.addEventListener('canplaythrough', onCanPlayThrough, { once: true });

            // Also listen for 'waiting' event during playback
            audio.addEventListener('waiting', () => {
                showBufferingIndicator(name);
            }, { once: true });

            audio.addEventListener('playing', () => {
                hideBufferingIndicator();
            }, { once: true });
        } else {
            // Already buffered, play immediately
            audio.play();
            if (position) {
                audio.currentTime = position;
            }
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
        if (lastPlayed && lastPlayed.playedAt) {
            if (hasBeenPlayingLessThan10MinutesAgo(lastPlayed.playedAt)) {
                // Ensure audio is loaded before checking if it exists
                ensureAudioLoaded(lastPlayed.id);
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
        preloadAudioForTarget,
        savePlayingStatus,
        resumeLastPlaying,
        resume,
        pause
    }
}