const urlParams = new URLSearchParams(window.location.search);
let DEV_MODE = urlParams.get('dev') === 'true';

const logDebug = (msg) => {
    //if (!DEV_MODE) return;
    const logBox = document.getElementById('debugLog');
    const newLine = document.createElement('div');
    newLine.textContent = msg;
    logBox.appendChild(newLine);
    logBox.scrollTop = logBox.scrollHeight;
};

const updateDebug = (coords, audio, targetName) => {
    if (!DEV_MODE) return;
    document.getElementById('debugCoords').innerText = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    document.getElementById('debugAudio').innerText = audio || "-";
    document.getElementById('debugTarget').innerText = targetName || "-";
};

function toggleDebugOverlay() {
    DEV_MODE = !DEV_MODE;
    if (DEV_MODE) {
        document.getElementById('debugOverlay').style.display = 'block';
    } else {
        document.getElementById('debugOverlay').style.display = 'none';
    }
}