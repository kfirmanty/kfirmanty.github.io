const scenes = {
    top: {
        loop: true,
        video: "top.mp4",
        buttons: {
            toLeft: {
                onClick: "topToLeft",
                text: "",
                position: [0.1, 0.7],
                width: 0.3,
                height: 0.5
            },
            toRight: {
                onClick: "topToRight",
                text: "",
                position: [0.6, 0.7],
                width: 0.3,
                height: 0.5
            }
        }
    },
    topToLeft: {
        next: "leftToTop",
        video: "topToLeft.mp4"
    },
    topToRight: {
        next: "rightToLeft",
        video: "topToRight.mp4"
    },
    rightToLeft: {
        next: "leftToTop",
        video: "rightToLeft.mp4"
    },
    leftToTop: {
        next: "top",
        video: "leftToTop.mp4"
    }
};

let button;
let scene;
const loadScene = (scenes, sceneName) => {
    const scene = scenes[sceneName];
    const sceneObj = { buttons: {} };

    const cleanUp = () => {
        if (sceneObj) {
            sceneObj.video.remove();
            if (sceneObj.buttons) {
                Object.keys(sceneObj.buttons).forEach(bk => {
                    sceneObj.buttons[bk].remove();
                });
            }
        }
    };
    if (scene.buttons) {
        Object.keys(scene.buttons).forEach(bk => {
            const clickableDesc = scene.buttons[bk];
            const button = clickableDesc.img
                ? createImg(clickableDesc.img, clickableDesc.text)
                : createButton(clickableDesc.text);
            const elt = button.elt;
            window.document
                .getElementById("buttons-container")
                .appendChild(elt);
            elt.style["position"] = "absolute";
            elt.style["top"] = clickableDesc.position[1] * 100 + "%";
            elt.style["left"] = clickableDesc.position[0] * 100 + "%";
            elt.style["-ms-transform"] = "translateY(-50%)";
            elt.style["transform"] = "translateY(-50%)";
            elt.style["cursor"] = "pointer";
            if (clickableDesc.width && clickableDesc.height) {
                elt.style["width"] = clickableDesc.width * 100 + "%";
                elt.style["height"] = clickableDesc.height * 100 + "%";
                elt.style["display"] = "block";
                elt.style["z-index"] = 300000;
                elt.style["opacity"] = 0.0;
            } else if (clickableDesc.width) {
                elt.style["width"] = clickableDesc.width * 100 + "%";
                elt.style["height"] = "auto";
                elt.style["display"] = "block";
                elt.style["z-index"] = 300000;
                elt.style["opacity"] = 0.0;
            }
            sceneObj["buttons"][bk] = button;
            button.mousePressed(() => {
                cleanUp();
                loadScene(scenes, clickableDesc.onClick);
            });
        });
    }
    const videoName = scene.video;
    const video = createVideo(["./" + videoName]);
    video.elt.setAttribute("playsinline", "");
    sceneObj.video = video;
    video.play();
    if (!scene.loop) {
        video.onended(() => {
            cleanUp();
            loadScene(scenes, scene.next);
        });
    } else {
        video.loop();
    }
};

function setup() {
    noCanvas();
    button = createButton("Rozpocznij wideo!");
    window.document.getElementById("buttons-container").appendChild(button.elt);
    button.elt.style["position"] = "absolute";
    button.elt.style["top"] = "50%";
    button.elt.style["left"] = "50%";
    button.elt.style["-ms-transform"] = "translateY(-50%)";
    button.elt.style["transform"] = "translateY(-50%)";
    button.elt.style.cssText =
        "color: #fff !important;text-transform: uppercase;text-decoration: none;background: #ed3330;padding: 20px;border-radius: 5px;display: inline-block;border: none;transition: all 0.4s ease 0s;transform: translateY(-50%);-ms-transform: translateY(-50%); top: 50%; left: 50%; position: absolute;cursor: pointer";
    button.mousePressed(startVideo);
}

function draw() {}

function startVideo() {
    scene = loadScene(scenes, "top");
    button.remove();
}
