import { streamToGemini } from './gemini.js';

/**
 * Handles individual WebSocket connections.
 * @param {import('ws').WebSocket} ws 
 */
export function handleConnection(ws) {
    let isSessionActive = true;

    // Create a session with the Gemini service (Mock)
    const geminiSession = streamToGemini((data) => {
        // STRICT FILTER: Only send if session is active AND data has content
        if (ws.readyState === ws.OPEN && isSessionActive && data && data.text) {
            ws.send(JSON.stringify({
                type: 'transcription',
                text: data.text,
                isFinal: data.isFinal
            }));
        }
    });

    ws.on('message', (data, isBinary) => {
        if (!isSessionActive) return;

        if (isBinary) {
            // Forward audio chunk to mock service
            // The service will handle buffering/silence detection
            geminiSession.write(data);
        } else {
            // Control messages
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'stop') {
                    isSessionActive = false;
                    geminiSession.end();
                }
            } catch (e) {
                // Ignore invalid JSON
            }
        }
    });

    ws.on('close', () => {
        isSessionActive = false;
        geminiSession.end();
    });

    ws.on('error', (err) => {
        // console.error('WebSocket Error:', err.message);
        isSessionActive = false;
        geminiSession.end();
    });
}
