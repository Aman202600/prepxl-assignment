import React, { useEffect, useRef } from 'react';

const CircularVisualizer = ({ analyser }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Config
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const CENTER_RADIUS = 30; // 0-100 placeholder relative to size

        // Resize handler
        const handleResize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        const render = () => {
            // Get frequency data
            analyser.getByteFrequencyData(dataArray);

            // Clear canvas
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            ctx.clearRect(0, 0, width, height);

            // --- Draw Visuals ---

            // Calculate average volume for pulse effect
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const pulseScale = 1 + (average / 255) * 0.3; // 1.0 to 1.3 scale

            // 1. Draw Inner Glow
            const gradient = ctx.createRadialGradient(centerX, centerY, CENTER_RADIUS * pulseScale, centerX, centerY, width / 2);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)'); // Violet
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, width / 2, 0, 2 * Math.PI);
            ctx.fill();

            // 2. Draw Center Circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, CENTER_RADIUS * pulseScale, 0, 2 * Math.PI);
            ctx.fillStyle = '#8b5cf6';
            ctx.fill();
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#8b5cf6';

            // 3. Draw Circular Bars
            const bars = 100; // Number of bars to draw
            const step = Math.floor(bufferLength / bars);
            const radius = CENTER_RADIUS * 1.5 * pulseScale;

            ctx.shadowBlur = 0; // Reset shadow for bars to save perf

            for (let i = 0; i < bars; i++) {
                // Frequency value 0-255
                // We pick values spread across the spectrum
                const value = dataArray[i * step];
                const barHeight = (value / 255) * (Math.min(width, height) / 3);

                const angle = (Math.PI * 2 * i) / bars;

                // Start point (on circle edge)
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;

                // End point (radiating out)
                const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                const y2 = centerY + Math.sin(angle) * (radius + barHeight);

                // Color based on height/intensity
                const hue = 250 + (value / 255) * 60; // Blue to Pink range
                ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, [analyser]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
};

export default CircularVisualizer;
