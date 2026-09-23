/**
 * StageLinq Client for DJ-VFX
 * Connects to local Node.js StageLinq Companion Bridge via WebSocket
 */
export function setupStageLinqClient({ onBPM, onBeat, onTrack, onStatusChange }) {
    const WS_URL = 'ws://localhost:8080';
    let socket = null;
    let isConnected = false;
    let reconnectTimeout = null;

    function connect() {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            socket = new WebSocket(WS_URL);

            socket.onopen = () => {
                isConnected = true;
                console.log('[StageLinq Client] Connected to StageLinq bridge on localhost:8080');
                if (onStatusChange) onStatusChange({ connected: true, message: 'Bridge Connected' });
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.type) {
                        case 'bpm':
                            if (onBPM) onBPM(data.bpm, data.deck);
                            break;
                        case 'beat':
                            if (onBeat) onBeat(data.deck, data.count);
                            break;
                        case 'track':
                            if (onTrack) onTrack(data);
                            break;
                        case 'status':
                            if (onStatusChange) onStatusChange(data);
                            break;
                        default:
                            break;
                    }
                } catch (e) {
                    console.error('[StageLinq Client] Error parsing message:', e);
                }
            };

            socket.onerror = (err) => {
                // Bridge may not be running yet, silently handle
            };

            socket.onclose = () => {
                isConnected = false;
                if (onStatusChange) onStatusChange({ connected: false, message: 'Bridge Offline (Audio Fallback)' });
                // Reconnect attempt every 3 seconds
                clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(connect, 3000);
            };
        } catch (err) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, 3000);
        }
    }

    connect();

    return {
        isConnected: () => isConnected,
        disconnect: () => {
            clearTimeout(reconnectTimeout);
            if (socket) socket.close();
        }
    };
}
