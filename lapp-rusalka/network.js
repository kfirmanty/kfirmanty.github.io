function initNetworkSystem({ map, currentPlayerId }) {
    const state = {
        prevPosition: null,
        currentPosition: null,
        ws: null,
    };


    const updatePlayerPosition = (msg) => {
        const playerId = msg.id;
        const position = msg.position;
        if (playerId !== currentPlayerId) {
            map.updatePlayerPosition(playerId, position);
        }
    }

    const removePlayer = (msg) => {
        map.removePlayer(msg.id);
    }

    const restartWs = () => {
        if (
            !state.ws ||
            [WebSocket.CLOSING, WebSocket.CLOSED].includes(state.ws.readyState)
        ) {
            console.log("restarting ws");
            state.ws = new WebSocket("http://localhost:9080");
            state.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === "playerPosition") {
                    updatePlayerPosition(msg);
                } else if (msg.type === "removePlayer") {
                    removePlayer(msg);
                }
            };
        } else {
            console.log(
                "ws is already connected/trying to connect, skipping the restart",
                { readyState: state.ws.readyState }
            );
        }
    };

    restartWs();

    function sendPlayerPosition(position) {
        state.currentPosition = position;
        if (
            !state.prevPosition ||
            state.currentPosition[0] !== state.prevPosition[0] ||
            state.currentPosition[1] !== state.prevPosition[1]
        ) {
            try {
                if (
                    state.ws &&
                    state.ws.readyState === WebSocket.OPEN
                ) {
                    state.ws.send(
                        JSON.stringify({
                            type: "playerPosition",
                            id: currentPlayerId,
                            position: state.currentPosition
                        })
                    );
                } else if (
                    state.ws &&
                    [WebSocket.CLOSING, WebSocket.CLOSED].includes(state.ws.readyState)
                ) {
                    console.log("ws error, restarting");
                    restartWs();
                }
                state.prevPosition = state.currentPosition;
            } catch (e) {
                console.error("Error sending player position:", e);
            }
        }
    }

    return { sendPlayerPosition }
}