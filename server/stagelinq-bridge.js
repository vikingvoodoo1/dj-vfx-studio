import { WebSocketServer } from 'ws';
import http from 'http';

// Configuration
const PORT = process.env.STAGELINQ_PORT || 8080;
const isSimulation = process.argv.includes('--sim');

console.log('='.repeat(60));
console.log('  🎛️  DENON STAGELINQ COMPANION BRIDGE FOR DJ-VFX');
console.log('='.repeat(60));

// Setup WebSocket Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'stagelinq-bridge' }));
});

const wss = new WebSocketServer({ server });

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
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        message: isSimulation ? 'Running in Simulation Mode' : 'Connected to Bridge (Searching for Prime Hardware)'
    }));
});

let stagelinqInstance = null;

async function startStageLinq() {
    if (isSimulation) {
        console.log('[StageLinq] Starting in SIMULATION mode (no physical hardware required)...');
        runSimulationLoop();
        return;
    }

    try {
        console.log('[StageLinq] Attempting to import and initialize stagelinq library...');
        const stagelinqPkg = await import('stagelinq');
        const StageLinq = stagelinqPkg.StageLinq || stagelinqPkg.default?.StageLinq || stagelinqPkg.default;

        if (!StageLinq) {
            throw new Error('StageLinq constructor not found in package export.');
        }

        stagelinqInstance = new StageLinq({
            downloadDbSources: false // keep lightweight for live telemetry
        });

        console.log('[StageLinq] Listening for Denon Prime players/mixers on local network interfaces...');

        if (stagelinqInstance.devices) {
            stagelinqInstance.devices.on('deviceDiscovered', (device) => {
                console.log(`[StageLinq] 🟢 Hardware Discovered: ${device.name || 'Denon Device'} (${device.softwareVersion || 'Prime OS'})`);
                broadcast({
                    type: 'status',
                    connected: true,
                    device: device.name,
                    message: `Hardware Discovered: ${device.name}`
                });
            });

            stagelinqInstance.devices.on('trackLoaded', (status) => {
                console.log(`[StageLinq] 🎵 Track Loaded [Deck ${status.deck}]: ${status.artist} - ${status.title} (${status.bpm} BPM)`);
                broadcast({
                    type: 'track',
                    deck: status.deck,
                    artist: status.artist || 'Unknown Artist',
                    title: status.title || 'Unknown Title',
                    bpm: status.bpm || 128.0
                });
            });

            stagelinqInstance.devices.on('bpmChanged', (deck, bpm) => {
                broadcast({
                    type: 'bpm',
                    deck: deck,
                    bpm: bpm
                });
            });

            stagelinqInstance.devices.on('beat', (deck, beatCount) => {
                broadcast({
                    type: 'beat',
                    deck: deck,
                    count: beatCount
                });
            });
        }

        await stagelinqInstance.connect();
        console.log('[StageLinq] Successfully bound to network socket.');
    } catch (err) {
        console.warn('[StageLinq] Hardware discovery warning:', err.message);
        console.log('[StageLinq] Switching to auto-simulation mode so VFX works seamlessly during testing.');
        runSimulationLoop();
    }
}

// Fallback / Development Simulation Loop (generates realistic 128 BPM beat ticks)
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

    // Send initial simulated track
    setTimeout(() => {
        const currentTrack = tracks[trackIndex];
        broadcast({
            type: 'track',
            deck: 1,
            artist: currentTrack.artist,
            title: currentTrack.title,
            bpm: currentTrack.bpm
        });
    }, 1000);

    // Beat clock ticker
    function scheduleNextBeat() {
        const intervalMs = (60.0 / simulatedBPM) * 1000.0;
        setTimeout(() => {
            beatCounter = (beatCounter % 4) + 1;
            broadcast({
                type: 'beat',
                deck: 1,
                count: beatCounter
            });
            scheduleNextBeat();
        }, intervalMs);
    }

    scheduleNextBeat();

    // Rotate simulated tracks every 45 seconds
    setInterval(() => {
        trackIndex = (trackIndex + 1) % tracks.length;
        const currentTrack = tracks[trackIndex];
        simulatedBPM = currentTrack.bpm;
        console.log(`[Simulated StageLinq] 🎵 Auto-switched demo track: ${currentTrack.artist} - ${currentTrack.title} (${currentTrack.bpm} BPM)`);
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
    console.log(`[Bridge Server] WebSocket server active on ws://localhost:${PORT}`);
    startStageLinq();
});
