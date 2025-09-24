
const audio = loadAudio('full');

function startExperience() {
    document.getElementById('startbutton').remove();

    let isPaused = false;
    const pauseButton = document.getElementById('pausebutton');
    pauseButton.style.display = 'block';
    pauseButton.onclick = () => {
        if (isPaused) {
            fadeIn(audio);
            pauseButton.innerText = "Pauza";
        } else {
            fadeOut(audio);
            pauseButton.innerText = "Wznów";
        }
        isPaused = !isPaused;
    };
    fadeIn(audio);

}