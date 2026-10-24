/**
 * Universal DJ Hardware & Software Bridge Client for DJ VFX Studio
 * Supports Denon StageLinQ, Pioneer Pro DJ Link / Rekordbox, Traktor Pro & Philips Hue
 * Connects to local Node.js Companion Bridge via WebSocket on ws://localhost:8080
 */
export function setupStageLinqClient({ 
    onBPM, 
    onBeat, 
    onTrack, 
    onDeckLoaded, 
    onStatusChange, 
    onHueStatus, 
    onHuePairingStatus, 
    onDecksSnapshot,
    onEcosystemChange,
    onDeckWaveform,
    onDeckTelemetry,
    onCrossfader,
    onDeckUnloaded,
    onDecksOffline,
    onOBSStatus,
    onBUTTStatus,
    onConnect,
    onSync 
}) {
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
                console.log('[Universal DJ Bridge Client] Connected to Bridge on localhost:8080');
                if (onStatusChange) onStatusChange({ connected: true, message: 'Bridge Connected' });
                sendJson({ type: 'request_state' });
                if (onConnect) onConnect();
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.type) {
                        case 'bpm':
                            if (onBPM) onBPM(data.bpm, data.deck, data);
                            break;
                        case 'beat':
                            if (onBeat) onBeat(data.deck, data.count, data);
                            break;
                        case 'track':
                            if (onTrack) onTrack(data);
                            break;
                        case 'deck_loaded':
                            if (onDeckLoaded) onDeckLoaded(data);
                            break;
                        case 'deck_unloaded':
                            if (onDeckUnloaded) onDeckUnloaded(data);
                            break;
                        case 'decks_offline':
                            if (onDecksOffline) onDecksOffline(data);
                            break;
                        case 'deck_waveform':
                            if (onDeckWaveform) onDeckWaveform(data);
                            break;
                        case 'deck_telemetry':
                            if (onDeckTelemetry) onDeckTelemetry(data);
                            break;
                        case 'crossfader':
                            if (onCrossfader) onCrossfader(data.value, data);
                            break;
                        case 'decks_snapshot':
                            if (onDecksSnapshot) onDecksSnapshot(data.decks);
                            break;
                        case 'ecosystem_changed':
                            if (onEcosystemChange) onEcosystemChange(data.ecosystem);
                            break;
                        case 'status':
                            if (data.obs && onOBSStatus) onOBSStatus(data.obs);
                            if (data.butt && onBUTTStatus) onBUTTStatus(data.butt);
                            if (onStatusChange) onStatusChange(data);
                            break;
                        case 'obs_status':
                            if (onOBSStatus) onOBSStatus(data);
                            break;
                        case 'butt_status':
                            if (onBUTTStatus) onBUTTStatus(data);
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
                    console.error('[Universal DJ Bridge Client] Error parsing message:', e);
                }
            };

            socket.onerror = (err) => {
                // Bridge may not be running yet, silently handle
            };

            socket.onclose = () => {
                isConnected = false;
                if (onStatusChange) onStatusChange({ connected: false, message: 'Bridge Offline (Audio Fallback)' });
                if (onDecksOffline) onDecksOffline({ bridgeOffline: true });
                if (onOBSStatus) onOBSStatus({ connected: false, online: false });
                if (onBUTTStatus) onBUTTStatus({ connected: false, online: false });
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
        setEcosystem: (ecosystem) => sendJson({ type: 'set_ecosystem', ecosystem }),
        discoverHue: () => sendJson({ type: 'hue_discover' }),
        pairHue: (ip) => sendJson({ type: 'hue_pair', ip }),
        getHueRooms: () => sendJson({ type: 'hue_get_rooms' }),
        setHueConfig: (config) => sendJson({ type: 'hue_set_config', config }),
        turnOffHue: (groupId) => sendJson({ type: 'hue_turn_off', groupId }),
        turnOnHue: (groupId) => sendJson({ type: 'hue_turn_on', groupId }),
        resetHueWhite: (groupId) => sendJson({ type: 'hue_reset_white', groupId }),
        sendHueBeat: (data) => sendJson({ type: 'hue_beat', data })
    };
}
