# Architecture & Implementation Explanation

## 1. Architecture Overview

The system is built as a **Real-time Event-Driven Application** using the MERN stack (MongoDB, Express, React, Node.js - though MongoDB/Express are minimal/optional here in favor of pure Node.js/WebSockets).

### Data Flow Pipeline
1.  **Audio Capture (Frontend)**: The browser's `MediaStream` API captures raw audio.
2.  **Streaming (Network)**: Data is sliced into chunks and streamed via `WebSocket` to the Node.js backend. This bypasses the overhead of HTTP/REST for a persistent, low-latency connection.
3.  **Processing (Backend)**: 
    - The Node.js server receives binary blobs.
    - `gemini.js` (Mock Service) acts as a stream processor, accepting buffers and emitting text events.
    - In a real implementation, this would pipe data directly to Google's GenAI streaming endpoint.
4.  **Feedback (Frontend)**: Transcription results are pushed back down the WebSocket to the client, where React updates the UI optimistically.

## 2. Node.js (WebSockets) vs. Spring WebFlux

The requirements asked for a comparison to Spring WebFlux. Both are excellent choices for reactive systems, but they differ fundamentally:

| Feature | Node.js (Event Loop) | Spring WebFlux (Project Reactor) |
| :--- | :--- | :--- |
| **Concurrency** | **Single-threaded Non-blocking**. Node.js handles thousands of concurrent WebSocket connections on a single thread by offloading I/O. This is ideal for lightweight streaming where CPU usage is low but I/O is high. | **Multi-threaded Event Loop**. Uses Netty under the hood. It can utilize multiple cores more easily for CPU-heavy tasks but introduces thread management complexity. |
| **Streaming** | Native support via `Stream` API and libraries like `ws`. Extremely lightweight. | Uses `Flux<T>` and `Mono<T>` types. Very powerful abstraction but steep learning curve. |
| **Latency** | Minimal overhead. JavaScript buffers map directly to C++ memory in V8. | Slight JVM overhead, though negligible in long-running processes. |

**Why Node.js for this project?**
For a startup MVP or pre-interview assignment, Node.js offers the fastest velocity. The `ws` library is "bare metal" compliant, meaning we control exactly what bytes go over the wire, optimizing for the lowest possible latency without framework bloat.

## 3. Mock Implementation Strategy

The `gemini.js` service is designed as a **Dependency Injection** candidate.
-   **Current State**: It uses `setTimeout` and a predefined script to simulate network latency (50-150ms) and partial text generation.
-   **Future State**: To go to production, one would simply replace the contents of `streamToGemini` with the `@google/generative-ai` streaming implementation. The function signature `(onData) => { write(), end() }` remains identical, meaning **zero code changes** would be required in `ws.js` or `server.js`.

## 4. Scalability & Performance

-   **Binary Transport**: We send raw `ArrayBuffer` data. We do NOT base64 encode audio on the client, saving ~33% bandwidth.
-   **Visualizer Performance**: The circular visualizer uses the Canvas API with `requestAnimationFrame`. This ensures the rendering logic is decoupled from React's commit phase, maintaining a steady 60 FPS even if the React tree re-renders due to incoming transcription updates.
-   **Stateless Backend**: The backend does not store audio state between chunks (in this specific mock configuration), keeping memory footprint small per connection.

## 5. Silence Detection & Realism

To ensure a production-grade user experience, the system implements strict signal processing logic:
-   **Audio Energy Analysis**: Incoming audio buffers are analyzed for RMS (Root Mean Square) energy.
-   **Silence Filtering**: Frames falling below a calibrated threshold are discarded immediately.
-   **Output Logic**: "No speech → No text". Usage of the mock service ensures that text is only generated when high-energy audio packets are detected, preventing hallucination during silence.

---
*Prepared for PrepXL Engineering Team*
