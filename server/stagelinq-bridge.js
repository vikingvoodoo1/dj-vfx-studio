import { WebSocketServer } from 'ws';
import http from 'http';

// Configuration
const PORT = process.env.STAGELINQ_PORT || 8080;
const isForceSim = process.argv.includes('--sim');

console.log('='.repeat(60));
console.log('  🎛️  DENON STAGELINQ COMPANION BRIDGE FOR DJ-VFX');
console.log('='.repeat(60));

// Setup HTTP + WebSocket Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'stagelinq-bridge' }));
});

const wss = new WebSocketServer({ server });

let lastTrackData = null;
let lastBpm = 126.0;
let connectedDevices = new Map();

function broadcast(messageObj) {
    const payload = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(payload);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('[WebSocket] Front-end client connected');
    
    // Send immediate initial status
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        deviceCount: connectedDevices.size,
        device: connectedDevices.size > 0 ? Array.from(connectedDevices.values()).join(', ') : null,
        message: connectedDevices.size > 0 
            ? `Connected to ${Array.from(connectedDevices.values()).join(', ')}` 
            : 'Bridge Online (Listening for Prime Decks on UDP 50010)'
    }));

    if (lastTrackData) {
        ws.send(JSON.stringify({
            type: 'track',
            ...lastTrackData
        }));
    }
    if (lastBpm) {
        ws.send(JSON.stringify({
            type: 'bpm',
            bpm: lastBpm
        }));
    }
});

let stagelinqInstance = null;

async function startStageLinq() {
    if (isForceSim) {
        console.log('[StageLinq] Starting in FORCED SIMULATION mode (--sim)...');
        runSimulationLoop();
        return;
    }

    try {
        console.log('[StageLinq] Initializing Denon StageLinq protocol engine...');
        const { StageLinqInstance, ActingAsDevice } = await import('stagelinq');

        stagelinqInstance = new StageLinqInstance({
            actingAs: ActingAsDevice?.NowPlaying || 'NowPlaying',
            downloadDbSources: false, // keep lightweight for instant telemetry
            enableFileTranfer: false
        });

        console.log('[StageLinq] 🔍 Scanning local network for Denon Prime players/mixers (UDP 50010)...');

        // Device Connection / Discovery
        stagelinqInstance.on('connected', (info) => {
            const devName = info.source || info.software?.name || 'Denon Prime Player';
            const devVersion = info.software?.version || '';
            const devAddr = info.address || 'LAN';
            console.log(`[StageLinq] 🟢 Hardware Discovered: ${devName} v${devVersion} @ ${devAddr}`);
            
            connectedDevices.set(info.source || info.address, devName);

            broadcast({
                type: 'status',
                connected: true,
                device: Array.from(connectedDevices.values()).join(', '),
                message: `Hardware Discovered: ${devName}`
            });
        });

        // Track Loaded
        stagelinqInstance.on('trackLoaded', (status) => {
            if (!status) return;
            console.log(`[StageLinq] 🎵 Track Loaded [Deck ${status.deck || 1}]: ${status.artist || 'Unknown'} - ${status.title || 'Unknown'} (${status.currentBpm || status.masterTempo || '---'} BPM)`);
            
            const trackPayload = {
                deck: status.deck || 1,
                artist: status.artist || '',
                title: status.title || '',
                bpm: status.currentBpm || status.masterTempo || lastBpm,
                key: status.key || '',
                genre: status.genre || '',
                play: !!(status.play || status.playState),
                master: !!status.masterStatus
            };
            
            lastTrackData = trackPayload;
            if (trackPayload.bpm && trackPayload.bpm > 40 && trackPayload.bpm < 300) {
                lastBpm = trackPayload.bpm;
            }

            broadcast({
                type: 'track',
                ...trackPayload
            });
        });

        // Now Playing / Layer change
        stagelinqInstance.on('nowPlaying', (status) => {
            if (!status) return;
            console.log(`[StageLinq] ▶️ Now Playing [Deck ${status.deck}]: ${status.artist} - ${status.title}`);
            
            const trackPayload = {
                deck: status.deck || 1,
                artist: status.artist || '',
                title: status.title || '',
                bpm: status.currentBpm || status.masterTempo || lastBpm,
                key: status.key || '',
                play: true,
                master: !!status.masterStatus
            };

            lastTrackData = trackPayload;
            if (trackPayload.bpm && trackPayload.bpm > 40 && trackPayload.bpm < 300) {
                lastBpm = trackPayload.bpm;
            }

            broadcast({
                type: 'track',
                ...trackPayload
            });
        });

        // State Changed (BPM / Pitch / Volume / Fader)
        stagelinqInstance.on('stateChanged', (status) => {
            if (status && status.currentBpm) {
                lastBpm = status.currentBpm;
                broadcast({
                    type: 'bpm',
                    deck: status.deck || 1,
                    bpm: status.currentBpm
                });
            }
        });

        // Real-Time Beat Grid / Beat Sync Packets
        stagelinqInstance.on('beatMessage', (info, beatData) => {
            if (beatData && beatData.decks) {
                beatData.decks.forEach((deckData, idx) => {
                    const deckNum = idx + 1;
                    if (deckData.bpm && deckData.bpm > 40 && deckData.bpm < 300) {
                        lastBpm = deckData.bpm;
                        broadcast({
                            type: 'bpm',
                            deck: deckNum,
                            bpm: deckData.bpm
                        });
                    }
                    if (deckData.beat !== undefined) {
                        broadcast({
                            type: 'beat',
                            deck: deckNum,
                            count: Math.floor(deckData.beat % 4) + 1,
                            rawBeat: deckData.beat,
                            totalBeats: deckData.totalBeats
                        });
                    }
                });
            }
        });

        stagelinqInstance.on('error', (err) => {
            console.warn('[StageLinq] Network notice:', err?.message || err);
        });

        await stagelinqInstance.connect();
        console.log('[StageLinq] ✅ Bound to UDP socket. Ready and listening for live decks.');
    } catch (err) {
        console.warn('[StageLinq] Hardware discovery note:', err.message);
        console.log('[StageLinq] Starting background simulation as fallback while awaiting hardware broadcast...');
        runSimulationLoop();
    }
}

// Fallback / Standby Simulation Loop
function runSimulationLoop() {
    let simulatedBPM = 126.0;
    let beatCounter = 0;
    const tracks = [
        { artist: 'Eric Prydz', title: 'Opus (Live Intro Mix)', bpm: 126.0 },
        { artist: 'Bicep', title: 'Glue', bpm: 130.0 },
        { artist: 'Deadmau5', title: 'Strobe (Club Edit)', bpm: 128.0 },
        { artist: 'Tale of Us', title: 'Astral Echoes', bpm: 125.0 }
    ];
    let trackIndex = 0;

    // Beat clock ticker
    function scheduleNextBeat() {
        if (connectedDevices.size > 0) return; // Stop simulation if real hardware connects
        const intervalMs = (60.0 / simulatedBPM) * 1000.0;
        setTimeout(() => {
            if (connectedDevices.size === 0) {
                beatCounter = (beatCounter % 4) + 1;
                broadcast({
                    type: 'beat',
                    deck: 1,
                    count: beatCounter
                });
                scheduleNextBeat();
            }
        }, intervalMs);
    }

    scheduleNextBeat();

    setInterval(() => {
        if (connectedDevices.size > 0) return;
        trackIndex = (trackIndex + 1) % tracks.length;
        const currentTrack = tracks[trackIndex];
        simulatedBPM = currentTrack.bpm;
        broadcast({
            type: 'track',
            deck: 1,
            artist: currentTrack.artist,
            title: currentTrack.title,
            bpm: currentTrack.bpm
        });
        broadcast({
            type: 'bpm',
            deck: 1,
            bpm: currentTrack.bpm
        });
    }, 45000);
}

server.listen(PORT, () => {
    console.log(`[Bridge Server] 🚀 WebSocket server active on ws://localhost:${PORT}`);
    startStageLinq();
});
