//0.01 == 1KM
//0.0001 == 10m
const MIN_DISTANCE = 0.0001; // 10m in degrees
const PRELOAD_DISTANCE = 0.001; // ~100m - start buffering

function isNear(target, crd) {
    const dist = target.minDistance || MIN_DISTANCE;
    return (
        Math.abs(target.lat - crd.latitude) <= dist &&
        Math.abs(target.lng - crd.longitude) <= dist
    );
}

function isWithinDistance(target, crd, distance) {
    return (
        Math.abs(target.lat - crd.latitude) <= distance &&
        Math.abs(target.lng - crd.longitude) <= distance
    );
}

function initGpsSystem({ audio, map, network, currentPlayerId }) {
    const state = {
        watchId: null
    }

    const gpsStatus = document.getElementById('gpsStatus');
    const coordsDisplay = document.getElementById('coords');

    const onPosition = pos => {
        const crd = pos.coords;
        gpsStatus.innerText = 'GPS Połączony';
        coordsDisplay.innerText = `${crd.latitude.toFixed(6)}, ${crd.longitude.toFixed(6)}`;

        // PHASE 1: Preload nearby targets
        for (const target of targets) {
            // Skip QR codes (lat/lng = 0)
            if (target.lat === 0 && target.lng === 0) continue;

            const dist = target.minDistance || MIN_DISTANCE;
            const preloadDist = Math.max(dist * 20, PRELOAD_DISTANCE); // 20x play distance or 100m

            if (isWithinDistance(target, crd, preloadDist)) {
                audio.preloadAudioForTarget(target.id);
            }
        }

        // PHASE 2: Play when close
        for (const target of targets) {
            if (isNear(target, crd)) {
                console.log(`🎯 Blisko: ${target.name}`);
                audio.playAudioForTarget({ id: target.id, name: target.name });

                app.innerText = `Znajdujesz się w: ${target.name}`;
                break;
            }
        }

        const currentPosition = [crd.latitude, crd.longitude]
        map.updatePlayerPosition(currentPlayerId, currentPosition);
        map.setView(currentPosition);
        network.sendPlayerPosition(currentPosition);
    };

    const onError = err => {
        console.log(`ERROR(${err.code}): ${err.message}`);
        gpsStatus.innerText = 'Błąd GPS';
        switch (err.code) {
            case 1:
                alert("Aplikacja potrzebuje dostępu do GPS!");
                break;
            case 2:
                alert("Nie można uzyskać pozycji GPS. Spróbuj ponownie.");
                break;
            case 3:
                alert("Czas oczekiwania na GPS upłynął. Spróbuj ponownie.");
                break;
            default:
                alert("Wystąpił nieznany błąd GPS.");
        }
    };

    const resume = () => {
        state.watchId = navigator.geolocation.watchPosition(onPosition, onError, {
            enableHighAccuracy: true,
            timeout: 10000
        });
    }

    const pause = () => {
        navigator.geolocation.clearWatch(state.watchId);
    }

    resume();

    return { pause, resume };
}