import { WebSocketServer } from "ws";
import { startWssServer, startWsServer } from "./server.js";

let webClients = [];
let players = {};
let playerIdToWs = {};

const removeClient = (ws) => {
    const index = webClients.indexOf(ws);
    if (index > -1) {
        webClients.splice(index, 1);
        const playerIdToWsEntries = Object.entries(playerIdToWs);
        for (const [id, client] of playerIdToWsEntries) {
            if (client === ws) {
                delete players[id];
                delete playerIdToWs[id];
                for (const clientsToInform of webClients) {
                    clientsToInform.send(
                        JSON.stringify({ type: "removePlayer", id }),
                    );
                }
                break;
            }
        }
    }
};

const wss = startWsServer(9080);

function updateState(data, ws) {
    if (data.type === "playerPosition") {
        players[data.id] = data;
        playerIdToWs[data.id] = ws;
    }
}

function sendMessage(client, data) {
    try {
        client.send(JSON.stringify(data));
    } catch (e) {
        console.error("Error sending message to client:", e);
        removeClient(client);
    }
}

function broadcastMessage(data, sender) {
    for (const client of webClients) {
        if (client !== sender) {
            sendMessage(client, data);
        }
    }
}

wss.on("connection", function connection(ws) {
    webClients.push(ws);

    Object.values(players).forEach((player) => {
        sendMessage(ws, {
            ...player,
            type: "playerPosition"
        });
    });

    ws.on("message", function message(data) {
        try {
            const parsedData = JSON.parse(data);
            updateState(parsedData, ws);

            broadcastMessage(parsedData, ws);
        } catch (e) {
            console.error("ws error", e);
        }
    });

    ws.on("close", function close() {
        console.log("Client disconnected");
        removeClient(ws);
    });
});
