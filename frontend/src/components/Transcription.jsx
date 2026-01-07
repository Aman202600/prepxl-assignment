import React, { useEffect, useRef, useState } from 'react';

const Transcription = ({ isRecording, mediaStream }) => {
    const [liveText, setLiveText] = useState('');
    const [history, setHistory] = useState([]);
    const containerRef = useRef(null);

    // Refs
    const wsRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    // VAD Refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const speechEnergyRef = useRef(0);
    const animationFrameRef = useRef(null);

    // Constants
    const MIN_SPEECH_THRESHOLD = 20; // 0-255 scale. Adjust based on mic sensitivity.

    // Auto-scroll
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [liveText, history]);

    // Main Logic
    useEffect(() => {
        if (isRecording && mediaStream) {
            startTranscription();
        } else {
            stopTranscription();
        }

        return () => {
            stopTranscription();
        };
    }, [isRecording, mediaStream]);

    const setupVAD = (stream) => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const analyze = () => {
            if (!isRecording) return;

            analyser.getByteFrequencyData(dataArray);

            // Calculate average volume (Energy)
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;

            // Update ref for the MediaRecorder loop to check
            speechEnergyRef.current = average;

            animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
    };

    const startTranscription = () => {
        try {
            if (!mediaStream) return;

            // 1. Setup VAD (Voice Activity Detection)
            setupVAD(mediaStream);

            // 2. Initialize WebSocket
            // In production, use env var
            const ws = new WebSocket('ws://localhost:8080');
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Transcription WS Connected');

                // 3. Start MediaRecorder
                const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    // STRICT CLIENT-SIDE GATING
                    // Only send if we are actively detecting speech energy above threshold
                    // OR if we are capturing the tail end of a phrase (optional, but skipping for strictness here)

                    if (
                        ws.readyState === WebSocket.OPEN &&
                        event.data.size > 0 &&
                        speechEnergyRef.current > MIN_SPEECH_THRESHOLD
                    ) {
                        ws.send(event.data);
                        console.log('Sent Chunk. Energy:', speechEnergyRef.current);
                    } else {
                        // Drop silence
                    }
                };

                // Smaller chunks for more granular VAD checking
                mediaRecorder.start(100);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'transcription' && data.text) {
                        handleTranscriptData(data);
                    }
                } catch (e) {
                    console.error(e);
                }
            };

            ws.onerror = (e) => console.error('WS Error', e);

        } catch (err) {
            console.error('Failed to start transcription', err);
        }
    };

    const stopTranscription = () => {
        // Stop VAD
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(e => console.error(e));
            audioContextRef.current = null;
        }
        speechEnergyRef.current = 0;

        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        // Close WebSocket
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
            wsRef.current = null;
        }

        // Finalize UI
        if (liveText.trim()) {
            setHistory(prev => [...prev, liveText.trim()]);
            setLiveText('');
        }
    };

    const handleTranscriptData = (data) => {
        const { text, isFinal } = data;
        if (!text) return;

        if (isFinal) {
            setHistory(prev => [...prev, liveText + text]);
            setLiveText('');
        } else {
            setLiveText(prev => prev + text);
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                padding: '24px',
                height: '300px',
                overflowY: 'auto',
                border: '1px solid #333',
                width: '100%',
                boxSizing: 'border-box',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Live Transcript
                </h3>
                {isRecording && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                        LIVE
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.6 }}>
                {history.map((segment, idx) => (
                    <div key={idx} style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                        {segment}
                    </div>
                ))}
            </div>

            <div style={{
                color: 'var(--text-primary)',
                fontSize: '1.2rem',
                lineHeight: '1.6',
                fontWeight: 500,
                minHeight: '2rem'
            }}>
                {liveText}
                {isRecording && !liveText && <span style={{ color: '#555', fontSize: '0.9rem', fontWeight: 400 }}>Listening... (Speak to transcribe)</span>}
                {isRecording && liveText && <span className="cursor" style={{ marginLeft: '2px', color: 'var(--accent-primary)' }}>|</span>}
            </div>

            <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        .cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
        </div>
    );
};

export default Transcription;
