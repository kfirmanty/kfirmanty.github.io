import fs from "fs";
import https from "https";
import { WebSocketServer } from "ws";

export function startWssServer(port) {
    let certPath = '';
    let keyPath = '';
    const cert = fs.readFileSync('/etc/letsencrypt/live/firmanty.com/fullchain.pem', "utf8");
    const key = fs.readFileSync('/etc/letsencrypt/live/firmanty.com/privkey.pem', "utf8");
    const server = https.createServer({ key, cert });
    const wss = new WebSocketServer({ server });

    server.listen(port, () => {
        console.log(`Secure WebSocket server running at https://localhost:${port}`);
    });

    return wss;
}

export function startWsServer(port) {
    return new WebSocketServer({ port });
}