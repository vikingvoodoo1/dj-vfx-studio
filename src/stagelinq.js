/**
 * StageLinq & Philips Hue Client for DJ-VFX
 * Connects to local Node.js Companion Bridge via WebSocket on localhost:8080
 */
export function setupStageLinqClient({ onBPM, onBeat, onTrack, onDeckLoaded, onStatusChange, onHueStatus, onHuePairingStatus, onSync }) {
    const WS_URL = 'ws://localhost:8080';
    let socket = null;
    let isConnected = false;
    let reconnectTimeout = null;

    function sendJson(obj) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(obj));
        }
    }

    function connect() {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            socket = new WebSocket(WS_URL);

            socket.onopen = () => {
                isConnected = true;
                console.log('[StageLinq / Hue Client] Connected to Bridge on localhost:8080');
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
                        case 'deck_loaded':
                            if (onDeckLoaded) onDeckLoaded(data);
                            break;
                        case 'status':
                            if (onStatusChange) onStatusChange(data);
                            break;
                        case 'hue_status':
                            if (onHueStatus) onHueStatus(data);
                            break;
                        case 'hue_pairing_status':
                            if (onHuePairingStatus) onHuePairingStatus(data);
                            break;
                        default:
                            if (onSync) onSync(data);
                            break;
                    }
                } catch (e) {
                    console.error('[StageLinq / Hue Client] Error parsing message:', e);
                }
            };

            socket.onerror = (err) => {
                // Bridge may not be running yet, silently handle
            };

            socket.onclose = () => {
                isConnected = false;
                if (onStatusChange) onStatusChange({ connected: false, message: 'Bridge Offline (Audio Fallback)' });
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
        },
        sendSync: (msg) => sendJson(msg),
        discoverHue: () => sendJson({ type: 'hue_discover' }),
        pairHue: (ip) => sendJson({ type: 'hue_pair', ip }),
        getHueRooms: () => sendJson({ type: 'hue_get_rooms' }),
        setHueConfig: (config) => sendJson({ type: 'hue_set_config', config }),
        sendHueBeat: (data) => sendJson({ type: 'hue_beat', data })
    };
}


