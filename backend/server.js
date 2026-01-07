import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { handleConnection } from './ws.js';

const PORT = 8080;

// Create raw HTTP server
const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PrepXL Real-time Audio Server is Running');
});

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    console.log(`New client connected from ${req.socket.remoteAddress}`);
    handleConnection(ws);
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`WebSocket endpoint available at ws://localhost:${PORT}`);
});
