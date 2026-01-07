/**
 * Simulates the Gemini Real-time Streaming API.
 * MOCK Implementation with STRICT INPUT-DRIVEN Logic.
 * 
 * @param {Function} onData Callback to receive text chunks {text, isFinal}
 * @returns {Object} An object with write(chunk) and end() methods
 */
export function streamToGemini(onData) {
    let isActive = true;
    let wordIndex = 0;

    // Script: One meaningful word per "chunk" of speech detected
    const MOCK_SCRIPT = [
        "React", " components", " render", " declaratively", ".",
        " The", " virtual", " DOM", " optimizes", " updates", ".",
        " Hooks", " manage", " state", " and", " side-effects", ".",
        " Streaming", " requires", " low", " latency", " handling", "."
    ];

    const processChunk = (buffer) => {
        if (!isActive) return;

        // At this point, the Frontend ALREADY filtered for VAD/Energy.
        // But for double safety in the "Backend", we still apply a small gate
        // to filter out headers or empty containers.
        if (buffer.length < 100) return;

        // INPUT-DRIVEN GENERATION
        // We received valid audio data. We advance the mock script.
        // We add a small realistic delay.

        const latency = 80; // Fixed realistic latency

        setTimeout(() => {
            if (!isActive) return;

            // Only generate if we haven't exhausted the script (looping for demo)
            const text = MOCK_SCRIPT[wordIndex % MOCK_SCRIPT.length];
            wordIndex++;

            const isFinal = text.endsWith('.') || wordIndex % 5 === 0;

            onData({
                text: text + " ",
                isFinal: isFinal
            });

        }, latency);
    };

    return {
        write: (audioBuffer) => {
            if (isActive && audioBuffer) {
                processChunk(audioBuffer);
            }
        },
        end: () => {
            isActive = false;
        }
    };
}
