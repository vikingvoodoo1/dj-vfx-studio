import { WebSocketServer } from 'ws';
import http from 'http';
import { PhilipsHueService } from './hue-service.js';

// Configuration
const PORT = process.env.STAGELINQ_PORT || 8080;
const isForceSim = process.argv.includes('--sim');

console.log('='.repeat(60));
console.log('  🎛️  DENON STAGELINQ & PHILIPS HUE COMPANION BRIDGE');
console.log('='.repeat(60));

// Setup HTTP + WebSocket Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'dj-vfx-bridge' }));
});

const wss = new WebSocketServer({ server });

let lastTrackData = null;
let lastBpm = 126.0;
let lastActiveFX = 0;
const globalSyncState = new Map();
let connectedDevices = new Map();

// Initialize Philips Hue Lighting Service
const hueService = new PhilipsHueService();
hueService.init().catch(err => console.error('[Philips Hue] Init error:', err));

function broadcast(messageObj) {
    const payload = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.bufferedAmount < 65536) { // OPEN & not overwhelmed
            client.send(payload);
        }
    });
}

function relayToOthers(senderWs, messageObj) {
    const payload = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
        if (client !== senderWs && client.readyState === 1 && client.bufferedAmount < 65536) { // OPEN & not overwhelmed
            client.send(payload);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('[WebSocket] Front-end client connected (OBS / Browser)');
    
    // Send immediate initial status for StageLinq & Hue
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        deviceCount: connectedDevices.size,
        device: connectedDevices.size > 0 ? Array.from(connectedDevices.values()).join(', ') : null,
        message: connectedDevices.size > 0 
            ? `Connected to ${Array.from(connectedDevices.values()).join(', ')}` 
            : 'Bridge Online (Listening for Prime Decks on UDP 50010)'
    }));

    // Send immediate Philips Hue Status & Room List
    ws.send(JSON.stringify({
        type: 'hue_status',
        ...hueService.getStatus()
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
    if (lastActiveFX !== undefined) {
        ws.send(JSON.stringify({
            type: 'set_fx',
            fx: lastActiveFX
        }));
    }

    // Replay full active state snapshot to the connecting client (e.g. OBS / 2nd screen)
    globalSyncState.forEach((cachedMsg) => {
        try {
            ws.send(JSON.stringify(cachedMsg));
        } catch (e) {}
    });

    // Handle Client Messages (Hue Configuration, Pairing, Beat Sync, Multi-Window/OBS Sync Relay)
    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw);
            if (msg.type === 'hue_discover') {
                const res = await hueService.discoverBridge();
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus(),
                    discoveryMessage: res.success ? `Discovered Bridge @ ${res.ip}` : 'No bridge discovered'
                });
            } else if (msg.type === 'hue_pair') {
                const pairRes = await hueService.pairBridge(msg.ip);
                ws.send(JSON.stringify({
                    type: 'hue_pairing_status',
                    ...pairRes
                }));
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_get_rooms') {
                await hueService.fetchRooms();
                broadcast({
                    type: 'hue_status',
                    ...hueService.getStatus()
                });
            } else if (msg.type === 'hue_set_config') {
                if (msg.config) {
                    hueService.updateConfig(msg.config);
                    broadcast({
                        type: 'hue_status',
                        ...hueService.getStatus()
                    });
                }
            } else if (msg.type === 'hue_beat') {
                if (msg.data) {
                    hueService.processAudioBeat(msg.data);
                }
            }
            // Multi-Window & OBS Studio Real-Time Sync Relay (Audio frames, Scenes, BPM, Flash, Logo, Track Banners)
            else if (msg.type === 'audio_frame') {
                relayToOthers(ws, msg);
            } else if (msg.type === 'set_fx') {
                lastActiveFX = msg.fx;
                relayToOthers(ws, msg);
            } else if (msg.type === 'set_bpm') {
                lastBpm = msg.bpm;
                relayToOthers(ws, msg);
            } else if (msg.type === 'track') {
                lastTrackData = msg;
                relayToOthers(ws, msg);
            } else if (msg.type === 'request_state') {
                // Client explicitly requested full active state snapshot
                if (lastTrackData) ws.send(JSON.stringify({ type: 'track', ...lastTrackData }));
                if (lastBpm) ws.send(JSON.stringify({ type: 'bpm', bpm: lastBpm }));
                if (lastActiveFX !== undefined) ws.send(JSON.stringify({ type: 'set_fx', fx: lastActiveFX }));
                globalSyncState.forEach((cachedMsg) => {
                    try { ws.send(JSON.stringify(cachedMsg)); } catch (e) {}
                });
            } else if (msg.type === 'sync_relay' && msg.payload) {
                if (msg.payload.type?.startsWith('set_')) {
                    globalSyncState.set(msg.payload.type, msg.payload);
                }
                relayToOthers(ws, msg.payload);
            } else if (
                msg.type === 'beat_pulse' || 
                msg.type === 'flash' || 
                msg.type === 'reset_all' ||
                msg.type?.startsWith('set_') || 
                msg.type?.startsWith('pop_') || 
                msg.type?.startsWith('hide_') || 
                msg.type?.startsWith('trigger_')
            ) {
                if (msg.type?.startsWith('set_')) {
                    globalSyncState.set(msg.type, msg);
                }
                relayToOthers(ws, msg);
            }
        } catch (e) {
            console.error('[WebSocket] Error processing client message:', e);
        }
    });
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

        const lastDeckLoadedTracks = new Map();
        let lastActiveNowPlayingKey = '';
        let lastActiveNowPlayingTrack = null;

        // Track Loaded (Background cued / loaded onto a deck)
        stagelinqInstance.on('trackLoaded', (status) => {
            if (!status || !status.title) return;
            const deckKey = String(status.deck || 1);
            const artist = status.artist || '';
            const title = status.title || '';
            const trackSignature = `${artist} - ${title}`;
            
            const prevSignature = lastDeckLoadedTracks.get(deckKey);
            if (prevSignature === trackSignature) return;
            lastDeckLoadedTracks.set(deckKey, trackSignature);

            console.log(`[StageLinq] 🎵 Track Loaded [Deck ${status.deck || 1}]: ${artist || 'Unknown'} - ${title || 'Unknown'} (${status.currentBpm || status.masterTempo || '---'} BPM)`);
            
            const deckPayload = {
                deck: status.deck || 1,
                artist: artist,
                title: title,
                bpm: status.currentBpm || status.masterTempo || lastBpm,
                key: status.key || '',
                genre: status.genre || ''
            };

            // Broadcast deck_loaded so HUD deck indicators update without popping stream overlay
            broadcast({
                type: 'deck_loaded',
                ...deckPayload
            });
        });

        // Now Playing / Layer change (Live on Air track transition via Fader / Play / Crossfader)
        stagelinqInstance.on('nowPlaying', (status) => {
            if (!status || !status.title) return;
            const deckKey = String(status.deck || 1);
            const artist = status.artist || '';
            const title = status.title || '';
            const activeSignature = `${deckKey}::${artist} - ${title}`;
            
            if (lastActiveNowPlayingKey === activeSignature) return;
            lastActiveNowPlayingKey = activeSignature;

            console.log(`[StageLinq] ▶️ Now Playing [Deck ${status.deck}]: ${artist} - ${title}`);
            
            const trackPayload = {
                deck: status.deck || 1,
                artist: artist,
                title: title,
                bpm: status.currentBpm || status.masterTempo || lastBpm,
                key: status.key || '',
                play: true,
                master: !!status.masterStatus
            };

            lastActiveNowPlayingTrack = trackPayload;
            lastTrackData = trackPayload;
            if (trackPayload.bpm && trackPayload.bpm > 40 && trackPayload.bpm < 300) {
                lastBpm = trackPayload.bpm;
            }

            // Broadcast live on-air track to stream banner & HUD
            broadcast({
                type: 'track',
                ...trackPayload
            });
        });

        const lastDeckBeats = new Map();
        const lastDeckBpms = new Map();
        const lastDeckBpmTime = new Map();

        // State Changed (BPM / Pitch / Volume / Fader)
        stagelinqInstance.on('stateChanged', (status) => {
            if (status && status.currentBpm) {
                const deckNum = status.deck || 1;
                const prevBpm = lastDeckBpms.get(deckNum) || 0;
                if (Math.abs(status.currentBpm - prevBpm) >= 0.05) {
                    lastDeckBpms.set(deckNum, status.currentBpm);
                    lastBpm = status.currentBpm;
                    broadcast({
                        type: 'bpm',
                        deck: deckNum,
                        bpm: status.currentBpm
                    });
                }
            }
        });

        // Real-Time Beat Grid / Beat Sync Packets (Throttled to beat transitions)
        stagelinqInstance.on('beatMessage', (info, beatData) => {
            if (!beatData || !beatData.decks) return;
            const now = Date.now();

            beatData.decks.forEach((deckData, idx) => {
                const deckNum = idx + 1;
                if (deckData.bpm && deckData.bpm > 40 && deckData.bpm < 300) {
                    const prevBpm = lastDeckBpms.get(deckNum) || 0;
                    const prevTime = lastDeckBpmTime.get(deckNum) || 0;
                    if (Math.abs(deckData.bpm - prevBpm) >= 0.05 || (now - prevTime > 500)) {
                        lastDeckBpms.set(deckNum, deckData.bpm);
                        lastDeckBpmTime.set(deckNum, now);
                        lastBpm = deckData.bpm;
                        broadcast({
                            type: 'bpm',
                            deck: deckNum,
                            bpm: deckData.bpm
                        });
                    }
                }
                if (deckData.beat !== undefined) {
                    const beatCount = Math.floor(deckData.beat % 4) + 1;
                    const prevBeat = lastDeckBeats.get(deckNum);
                    if (beatCount !== prevBeat) {
                        lastDeckBeats.set(deckNum, beatCount);
                        broadcast({
                            type: 'beat',
                            deck: deckNum,
                            count: beatCount,
                            rawBeat: deckData.beat,
                            totalBeats: deckData.totalBeats
                        });
                    }
                }
            });
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
