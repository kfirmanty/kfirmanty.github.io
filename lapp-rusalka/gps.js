//0.01 == 1KM
//0.0001 == 10m
const MIN_DISTANCE = 0.0001; // 10m in degrees

function isNear(target, crd) {
    const dist = target.minDistance || MIN_DISTANCE;
    return (
        Math.abs(target.lat - crd.latitude) <= dist &&
        Math.abs(target.lng - crd.longitude) <= dist
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

        for (const target of targets) {
            if (isNear(target, crd)) {
                logDebug(`🎯 Blisko: ${target.name}`);
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
        logDebug(`ERROR(${err.code}): ${err.message}`);
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