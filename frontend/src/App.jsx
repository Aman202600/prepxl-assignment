import React, { useState, useRef, useEffect } from 'react';
import CircularVisualizer from './components/CircularVisualizer';
import Transcription from './components/Transcription';

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);
    const [analyser, setAnalyser] = useState(null);

    // We manage the MediaStream here and pass it down
    const [mediaStream, setMediaStream] = useState(null);
    const audioContextRef = useRef(null);

    const startRecording = async () => {
        setError(null);
        try {
            // 1. Get Microphone Access (Once for both Visualizer and Transcription)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMediaStream(stream);

            // 2. Setup Audio Visualizer (Web Audio API)
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;

            const analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 256;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyserNode);

            setAnalyser(analyserNode);
            setIsRecording(true);

        } catch (err) {
            console.error(err);
            setError('Could not access microphone. Please allow permissions.');
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setAnalyser(null);
        setMediaStream(null);

        // Stop Tracks
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }

        // Suspend Audio Context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                    PrepXL <span style={{ color: 'var(--accent-primary)', fontWeight: 300 }}>Visualizer</span>
                </h1>
                <div style={{ padding: '0.5rem 1rem', borderRadius: '20px', background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: isRecording ? '#ef4444' : '#aaa', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRecording ? '#ef4444' : '#aaa', boxShadow: isRecording ? '0 0 10px #ef4444' : 'none' }}></div>
                    {isRecording ? 'LIVE RECORDING' : 'IDLE'}
                </div>
            </header>

            {/* Main Visualizer Area */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.05) 0%, rgba(0,0,0,0) 70%)' }}>
                {error && (
                    <div style={{ position: 'absolute', top: 20, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                        {error}
                    </div>
                )}

                <div style={{ width: '400px', height: '400px' }}>
                    <CircularVisualizer analyser={analyser} />
                </div>
            </div>

            {/* Controls & Transcript */}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{
                            background: isRecording ? '#ef4444' : 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: '16px 48px',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: isRecording ? '0 0 30px rgba(239, 68, 68, 0.4)' : '0 0 30px var(--accent-glow)',
                            transition: 'all 0.3s ease',
                            transform: 'scale(1)',
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                </div>

                {/* 
          Refactored Transcription Component: 
          Now handles its own WebSocket connection/streaming logic internally, 
          receiving only the active MediaStream and recording state.
        */}
                <Transcription
                    isRecording={isRecording}
                    mediaStream={mediaStream}
                />
            </div>
        </div>
    );
}

export default App;
