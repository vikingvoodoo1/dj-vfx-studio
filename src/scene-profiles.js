// =========================================================================
// SCENE PROFILES & REACTIVE ENGINE MATRIX MANAGER
// Per-scene parameter memory (Logos, Positioning, Spin, Macro Faders, Lighting & DMX)
// =========================================================================

export const REACTIVE_TAG_DEFINITIONS = {
    direct_deck: {
        id: 'direct_deck',
        label: 'Direct Deck (StageLinQ)',
        icon: '🎚️',
        color: '#ffaa00',
        bg: 'rgba(255, 170, 0, 0.15)',
        border: 'rgba(255, 170, 0, 0.45)'
    },
    audio_fft: {
        id: 'audio_fft',
        label: 'Live Audio FFT',
        icon: '🎧',
        color: '#00ffcc',
        bg: 'rgba(0, 255, 204, 0.15)',
        border: 'rgba(0, 255, 204, 0.45)'
    },
    bpm_sync: {
        id: 'bpm_sync',
        label: 'BPM / Beat Sync',
        icon: '⏱️',
        color: '#00aaff',
        bg: 'rgba(0, 170, 255, 0.15)',
        border: 'rgba(0, 170, 255, 0.45)'
    },
    transients: {
        id: 'transients',
        label: 'Kick Transients',
        icon: '💥',
        color: '#ff3366',
        bg: 'rgba(255, 51, 102, 0.15)',
        border: 'rgba(255, 51, 102, 0.45)'
    },
    physical_rig: {
        id: 'physical_rig',
        label: 'Physical Rig Simulation',
        icon: '🪩',
        color: '#bb88ff',
        bg: 'rgba(187, 136, 255, 0.15)',
        border: 'rgba(187, 136, 255, 0.45)'
    }
};

export const REQUIREMENT_DEFINITIONS = {
    audio: {
        id: 'audio',
        label: 'Audio Input',
        shortLabel: 'AUDIO',
        icon: '🎤',
        metText: '✓ 🎤 AUDIO',
        unmetText: '✗ 🎤 AUDIO',
        metTooltip: 'Audio Input: Connected & Active',
        unmetTooltip: 'Audio Input: Disconnected / Muted'
    },
    deck: {
        id: 'deck',
        label: 'Hardware Deck',
        shortLabel: 'DECK',
        icon: '🎛️',
        metText: '✓ 🎛️ DECK',
        unmetText: '✗ 🎛️ DECK',
        metTooltip: 'Hardware DJ Deck: Streaming Live Telemetry (StageLinQ / Pro DJ Link)',
        unmetTooltip: 'Hardware DJ Deck: Disconnected / Unplugged'
    },
    internet: {
        id: 'internet',
        label: 'Internet Connection',
        shortLabel: 'NET',
        icon: '🌐',
        metText: '✓ 🌐 NET',
        unmetText: '✗ 🌐 NET',
        metTooltip: 'Internet: Online & Connected',
        unmetTooltip: 'Internet: Offline / Disconnected'
    }
};

export const SCENE_METADATA = [
    {
        id: 0,
        name: '3D Studio EQ',
        hotkey: '1',
        category: 'eq',
        categoryLabel: 'Equalizers & Decks',
        icon: '📊',
        reactiveTags: ['audio_fft'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Multi-band studio frequency equalizer bars',
        description: 'Directly driven by the live audio FFT spectrum engine. Separates incoming sound into 5 discrete frequency bands (Sub-Bass, Bass, Low-Mid, High-Mid, Treble) and stereo levels to modulate 3D bar height and color gradients.'
    },
    {
        id: 1,
        name: 'Circular Spectrum',
        hotkey: '2',
        category: 'eq',
        categoryLabel: 'Equalizers & Decks',
        icon: '🎯',
        reactiveTags: ['audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Radial circular audio spectrum analyzer',
        description: 'Reacts to live multi-band audio frequencies: sub-bass pulses expand the core radial ring, mid frequencies deform orbital arcs, and treble spikes trigger outward particle bursts.'
    },
    {
        id: 2,
        name: 'Fluid Wave Matrix',
        hotkey: '3',
        category: 'eq',
        categoryLabel: 'Equalizers & Decks',
        icon: '🌊',
        reactiveTags: ['audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Interactive 3D fluid surface grid',
        description: 'Time-domain audio oscilloscope waveforms and low-end bass ripples displace vertices across a high-resolution 3D fluid matrix with smooth wave propagation.'
    },
    {
        id: 3,
        name: 'Hellfire Waveforms',
        hotkey: '4',
        category: 'spooky',
        categoryLabel: 'Halloween Spooky',
        icon: '🔥',
        reactiveTags: ['direct_deck', 'audio_fft', 'transients', 'bpm_sync'],
        requirements: { audio: false, deck: true, internet: false, strictDeck: true },
        summary: 'Direct player telemetry, roaring inferno fire waveforms & smoke dissolution',
        description: 'Halloween dual-deck inferno engine: Reads direct Denon StageLinQ telemetry (track position, platter motion, BPM, fader weights, cue points). Decks realign dynamically on crossfades with billowing smoke plumes pouring off outgoing tracks. Central baseline roars into Hellfire flame with 520 tumbling embers and flickering candlelight on kick drums.'
    },
    {
        id: 4,
        name: 'Spinning Disco Ball',
        hotkey: '5',
        category: 'disco',
        categoryLabel: 'Disco & Stage Lights',
        icon: '🪩',
        reactiveTags: ['physical_rig'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Authentic nightclub mirror ball with suspension sway',
        description: 'Deliberately decoupled from audio twitching to deliver an authentic, high-end nightclub centerpiece: features continuous motorized rotation, realistic catenary chain sag, and subtle multi-frequency suspension pendulum wobble with crystal pinspots.'
    },
    {
        id: 5,
        name: 'Dual-Bank Lasers',
        hotkey: '6',
        category: 'laser',
        categoryLabel: 'Lasers & Beams',
        icon: '⚡',
        reactiveTags: ['audio_fft', 'bpm_sync', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Concert motorized dual-bank laser array',
        description: 'Motorized pan/tilt mirrors track the musical grid (1/2, 1, 2, or 4 beats), while laser intensities, fan spreads, and flash strobes pulse to audio transient peaks and sub-bass impact.'
    },
    {
        id: 6,
        name: 'Saber Multi-Beams',
        hotkey: '7',
        category: 'laser',
        categoryLabel: 'Lasers & Beams',
        icon: '💥',
        reactiveTags: ['audio_fft', 'bpm_sync', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Rotating aerial saber fan and color chasers',
        description: 'Rotating saber fan, beam angles, and color swaps synchronized with musical beat triggers and mid/treble transients with volumetric haze scattering.'
    },
    {
        id: 7,
        name: 'Strobe Rings',
        hotkey: '8',
        category: 'laser',
        categoryLabel: 'Lasers & Beams',
        icon: '💫',
        reactiveTags: ['audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'High-intensity concentric xenon strobe bursts',
        description: 'Concentric expanding rings fire intensely on kick drum drops, high transient spikes, and manual strobe triggers, creating a dramatic arena drop effect.'
    },
    {
        id: 8,
        name: 'Synthwave Grid',
        hotkey: '9',
        category: 'wire',
        categoryLabel: 'Cyber, Retro & Matrix',
        icon: '🌅',
        reactiveTags: ['audio_fft'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Infinite 80s neon perspective wireframe terrain',
        description: 'Infinite neon wireframe perspective grid whose undulating terrain hills deform to bass frequencies, with forward flight speed reactive to overall audio loudness.'
    },
    {
        id: 9,
        name: 'Synthwave River & Sun',
        hotkey: '0',
        category: 'wire',
        categoryLabel: 'Cyber, Retro & Matrix',
        icon: '🌄',
        reactiveTags: ['audio_fft'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Neon digital sunset canyon and undulating river',
        description: 'Glowing digital sunset scanlines and undulating canyon river valleys deforming dynamically to track bass and mid-range rhythms.'
    },
    {
        id: 10,
        name: 'Matrix Code Rain',
        hotkey: 'Q',
        category: 'wire',
        categoryLabel: 'Cyber, Retro & Matrix',
        icon: '💻',
        reactiveTags: ['audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Falling digital green glyph rain with glitch spikes',
        description: 'Falling digital green glyph cascades accelerate and flare in brightness on high-frequency hi-hats and snares, with full CRT glitch degaussing on heavy drops.'
    },
    {
        id: 11,
        name: 'Retro Arcade 80s',
        hotkey: 'W',
        category: 'wire',
        categoryLabel: 'Cyber, Retro & Matrix',
        icon: '👾',
        reactiveTags: ['audio_fft'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Pixelated arcade vectors and nostalgic geometry',
        description: 'Geometric arcade vectors and 80s wireframe shapes pulsing and bouncing to low-end audio impulses.'
    },
    {
        id: 12,
        name: 'Warp Starfield',
        hotkey: 'E',
        category: 'space',
        categoryLabel: 'Space & Galaxy',
        icon: '🚀',
        reactiveTags: ['audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Hyperdrive warp-speed star streaks',
        description: 'Sub-bass impact and kick transients drive warp-drive acceleration, stretching thousands of stars into relativistic streaks during high-energy segments.'
    },
    {
        id: 13,
        name: 'Spiral Galaxy Vortex',
        hotkey: 'R',
        category: 'space',
        categoryLabel: 'Space & Galaxy',
        icon: '🌌',
        reactiveTags: ['audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Celestial spiral galaxy with multi-band suction',
        description: 'Multi-band audio frequency mapping: core black hole suction reacts to sub-bass, galactic arms expand with mid frequencies, and peripheral cosmic dust sparkles on treble.'
    },
    {
        id: 14,
        name: 'Hyper Particle Stream',
        hotkey: 'T',
        category: 'space',
        categoryLabel: 'Space & Galaxy',
        icon: '✨',
        reactiveTags: ['audio_fft'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Continuous multi-strand spline particle stream',
        description: 'Smooth Bass/Mid/Treble continuous multi-strand spline curves and orbiting pulsar flares flowing gracefully without abrupt jumps or twitching.'
    },
    {
        id: 15,
        name: 'Time.is Clock',
        hotkey: 'Y',
        category: 'wire',
        categoryLabel: 'Cyber, Retro & Matrix',
        icon: '⏱️',
        reactiveTags: ['direct_deck'],
        requirements: { audio: false, deck: false, optionalDeck: true, internet: true, strictDeck: false },
        summary: 'Precision studio clock & live track bar counters',
        description: 'Displays precision local time & UTC clock, integrated with direct StageLinQ track time elapsed, time remaining, current deck BPM, and breakdown bar countdowns.'
    },
    {
        id: 16,
        name: 'Sweeping Godrays',
        hotkey: 'U',
        category: 'disco',
        categoryLabel: 'Disco & Stage Lights',
        icon: '🔦',
        reactiveTags: ['bpm_sync', 'audio_fft', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Moving-head concert beams with musical bar chase',
        description: 'Moving-head godray fixtures sweep across the arena on synchronized musical bar divisions (4-beat and 8-beat chase patterns), with beam core intensity pulsing to bass and beat timing.'
    },
    {
        id: 17,
        name: 'White Godrays & Fog',
        hotkey: 'I',
        category: 'disco',
        categoryLabel: 'Disco & Stage Lights',
        icon: '☁️',
        reactiveTags: ['bpm_sync', 'audio_fft'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Cathedral volumetric white beams and rolling fog',
        description: 'Volumetric stadium white godrays and heavy ground fog wisps, sweeping in sync with bar divisions and surging on beat drops.'
    },
    {
        id: 18,
        name: 'Disco Floor & Godrays',
        hotkey: 'O',
        category: 'disco',
        categoryLabel: 'Disco & Stage Lights',
        icon: '🪩',
        reactiveTags: ['audio_fft', 'bpm_sync'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Illuminated 70s dance floor tiles & overhead beams',
        description: 'Illuminated retro disco dance floor tiles light up with audio spectrum and beat waves, combined with sweeping overhead volumetric pinspots.'
    },
    {
        id: 19,
        name: 'VHS Dreamlover',
        hotkey: 'P',
        category: 'wire',
        categoryLabel: 'Cyber, Retro & Matrix',
        icon: '📼',
        reactiveTags: ['audio_fft', 'bpm_sync', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Retro CRT tape glitch, 16-beat text & godrays',
        description: 'Text phrases alternate every 16 beats based on current deck BPM; CRT magnetic tape tracking lines, chromatic aberration, and degauss glitch shaders spike on heavy kick hits.'
    },
    {
        id: 20,
        name: 'Pumpkin Disco',
        hotkey: '[',
        category: 'spooky',
        categoryLabel: 'Halloween Spooky',
        icon: '🎃',
        reactiveTags: ['audio_fft', 'bpm_sync', 'transients', 'physical_rig'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: '10-lobe squashed pumpkin mirror ball & lens beams',
        description: 'Motorized 10-lobe squashed pumpkin mirror ball with natural chain wobble and steady disco spin. Two moving heads and 5 bottom fixtures shoot volumetric beams originating bang from the center of their lenses, tracking front facets in musical figures while mirror facet sparkles and hearth embers respond to treble and sub-bass.'
    },
    {
        id: 21,
        name: 'Haunted Manor',
        hotkey: ']',
        category: 'spooky',
        categoryLabel: 'Halloween Spooky',
        icon: '🏚️',
        reactiveTags: ['audio_fft', 'bpm_sync', 'transients'],
        requirements: { audio: true, deck: false, internet: false, strictDeck: false },
        summary: 'Gothic Victorian manor, rave windows & lightning',
        description: 'Gothic Victorian manor with upstairs windows pulsing like rave mini-lights to musical beats; bass drops trigger volumetric lightning flashes illuminating rain, cemetery headstones, and dead trees.'
    },
    {
        id: 22,
        name: 'Direct Video Player',
        hotkey: 'V',
        category: 'video',
        categoryLabel: 'Video Loops & Media',
        icon: '🎬',
        reactiveTags: ['bpm_sync'],
        requirements: { audio: false, deck: false, internet: false, strictDeck: false },
        summary: 'Direct full-screen video playback with seamless clip transitions',
        description: 'Clean, full-screen direct video playback for music videos and visual loops with seamless real-time transitions (Crossfade, Cut, Glitch, Zoom, Strobe).'
    }
];

// Factory Default Parameters for Every Scene
export const DEFAULT_SCENE_PROFILE = {
    djLogo: {
        enabled: true,
        url: '/images/logo/jkmclaren_shock.mp4',
        title: 'jkmclaren Shock',
        isVideo: true,
        layerMode: 'hologram',
        blend: 0,
        position: 'center',
        spin: 'off',
        spinSpeed: 1.0,
        scale: 1.0,
        edgeMargin: 4,
        offsetX: 0,
        offsetY: 0,
        pulse: 35,
        contrast: 1.35,
        bright: 1.05,
        shield: true
    },
    stationLogo: {
        enabled: false,
        url: '/images/station_logos/4TM Primary Logo.png',
        title: '4TM Radio',
        isVideo: false,
        layerMode: 'overlay',
        blend: 0,
        position: 'top-right',
        spin: 'off',
        spinSpeed: 1.0,
        scale: 1.0,
        edgeMargin: 4,
        offsetX: 0,
        offsetY: 0,
        pulse: 20,
        contrast: 1.2,
        bright: 1.0,
        shield: true
    },
    flyer: {
        enabled: false,
        url: '/images/flyers/neon_odyssey_flyer.jpg',
        title: 'Neon Odyssey Live',
        isVideo: false,
        layerMode: 'overlay',
        blend: 0,
        position: 'bottom-right',
        spin: 'off',
        spinSpeed: 1.0,
        scale: 0.85,
        edgeMargin: 4,
        offsetX: 0,
        offsetY: 0,
        pulse: 0,
        contrast: 1.0,
        bright: 1.0,
        shield: false
    },
    macro: {
        gain: 1.0,
        sens: 1.0,
        bloom: 0.35
    },
    fx: {
        speed: 1.0,
        handoverThreshold: 85
    },
    lighting: {
        hueSync: true,
        hueMode: 'screen_colors',
        hueIntensity: 100,
        hueMinBri: 5,
        hueKickStrobe: false,
        dmxEnabled: false,
        dmxProtocol: 'artnet',
        dmxProfile: 'default',
        dmxUniverse: 1,
        dmxStartChannel: 1,
        dmxMaster: 100,
        dmxStrobe: 0,
        dmxSpeed: 100
    }
};

const STORAGE_KEY = 'dj_vfx_scene_profiles_v2';

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (source && typeof source === 'object' && !Array.isArray(source)) {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

export const SceneProfileManager = {
    _profiles: {},
    _listeners: [],

    init() {
        this.load();
    },

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this._profiles = JSON.parse(raw);
            } else {
                this._profiles = {};
            }
        } catch (e) {
            console.warn('[SceneProfileManager] Failed to load profiles from localStorage:', e);
            this._profiles = {};
        }
    },

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._profiles));
            this._notifyListeners();
        } catch (e) {
            console.warn('[SceneProfileManager] Failed to save profiles to localStorage:', e);
        }
    },

    addListener(fn) {
        if (typeof fn === 'function' && !this._listeners.includes(fn)) {
            this._listeners.push(fn);
        }
    },

    removeListener(fn) {
        this._listeners = this._listeners.filter(l => l !== fn);
    },

    _notifyListeners() {
        this._listeners.forEach(fn => {
            try { fn(); } catch (err) { console.error(err); }
        });
    },

    getProfile(sceneIndex) {
        const stored = this._profiles[sceneIndex];
        if (!stored) {
            return deepClone(DEFAULT_SCENE_PROFILE);
        }
        return deepMerge(DEFAULT_SCENE_PROFILE, stored);
    },

    setProfile(sceneIndex, profileData) {
        this._profiles[sceneIndex] = deepClone(profileData);
        this.save();
    },

    updateParam(sceneIndex, category, key, value) {
        if (!this._profiles[sceneIndex]) {
            this._profiles[sceneIndex] = deepClone(DEFAULT_SCENE_PROFILE);
        }
        if (!this._profiles[sceneIndex][category]) {
            this._profiles[sceneIndex][category] = deepClone(DEFAULT_SCENE_PROFILE[category] || {});
        }
        this._profiles[sceneIndex][category][key] = value;
        this.save();
    },

    resetScene(sceneIndex) {
        if (this._profiles[sceneIndex]) {
            delete this._profiles[sceneIndex];
            this.save();
        }
    },

    resetAll() {
        this._profiles = {};
        this.save();
    },

    // Detailed Diff Detection against Default
    getDiff(sceneIndex) {
        const current = this.getProfile(sceneIndex);
        const def = DEFAULT_SCENE_PROFILE;
        const diffs = [];

        // DJ Logo diffs
        if (current.djLogo.enabled !== def.djLogo.enabled) {
            diffs.push({ cat: 'DJ Logo', param: 'Power', current: current.djLogo.enabled ? 'ON' : 'OFF', def: def.djLogo.enabled ? 'ON' : 'OFF' });
        }
        if (current.djLogo.url !== def.djLogo.url) {
            diffs.push({ cat: 'DJ Logo', param: 'Media', current: current.djLogo.title, def: def.djLogo.title });
        }
        if (current.djLogo.position !== def.djLogo.position) {
            diffs.push({ cat: 'DJ Logo', param: 'Position', current: current.djLogo.position.toUpperCase(), def: def.djLogo.position.toUpperCase() });
        }
        if (current.djLogo.spin !== def.djLogo.spin) {
            diffs.push({ cat: 'DJ Logo', param: 'Spin Mode', current: current.djLogo.spin.toUpperCase(), def: def.djLogo.spin.toUpperCase() });
        }
        if (Math.abs(current.djLogo.spinSpeed - def.djLogo.spinSpeed) > 0.05) {
            diffs.push({ cat: 'DJ Logo', param: 'Spin Speed', current: `${current.djLogo.spinSpeed.toFixed(1)}x`, def: `${def.djLogo.spinSpeed.toFixed(1)}x` });
        }
        if (Math.abs(current.djLogo.scale - def.djLogo.scale) > 0.04) {
            diffs.push({ cat: 'DJ Logo', param: 'Scale', current: `${current.djLogo.scale.toFixed(2)}x`, def: `${def.djLogo.scale.toFixed(2)}x` });
        }
        if (current.djLogo.offsetX !== def.djLogo.offsetX) {
            diffs.push({ cat: 'DJ Logo', param: 'Nudge X', current: `${current.djLogo.offsetX}%`, def: `${def.djLogo.offsetX}%` });
        }
        if (current.djLogo.offsetY !== def.djLogo.offsetY) {
            diffs.push({ cat: 'DJ Logo', param: 'Nudge Y', current: `${current.djLogo.offsetY}%`, def: `${def.djLogo.offsetY}%` });
        }

        // Station Logo diffs
        if (current.stationLogo.enabled !== def.stationLogo.enabled) {
            diffs.push({ cat: 'Station', param: 'Power', current: current.stationLogo.enabled ? 'ON' : 'OFF', def: def.stationLogo.enabled ? 'ON' : 'OFF' });
        }
        if (current.stationLogo.position !== def.stationLogo.position) {
            diffs.push({ cat: 'Station', param: 'Position', current: current.stationLogo.position.toUpperCase(), def: def.stationLogo.position.toUpperCase() });
        }
        if (current.stationLogo.spin !== def.stationLogo.spin) {
            diffs.push({ cat: 'Station', param: 'Spin Mode', current: String(current.stationLogo.spin).toUpperCase(), def: String(def.stationLogo.spin).toUpperCase() });
        }
        if (Math.abs((current.stationLogo.spinSpeed ?? 1.0) - def.stationLogo.spinSpeed) > 0.05) {
            diffs.push({ cat: 'Station', param: 'Spin Speed', current: `${Number(current.stationLogo.spinSpeed).toFixed(1)}x`, def: `${def.stationLogo.spinSpeed.toFixed(1)}x` });
        }
        if (Math.abs((current.stationLogo.scale ?? 1.0) - def.stationLogo.scale) > 0.04) {
            diffs.push({ cat: 'Station', param: 'Scale', current: `${Number(current.stationLogo.scale).toFixed(2)}x`, def: `${def.stationLogo.scale.toFixed(2)}x` });
        }

        // Event Flyer diffs
        if (current.flyer.enabled !== def.flyer.enabled) {
            diffs.push({ cat: 'Flyer', param: 'Power', current: current.flyer.enabled ? 'ON' : 'OFF', def: def.flyer.enabled ? 'ON' : 'OFF' });
        }
        if (current.flyer.position !== def.flyer.position) {
            diffs.push({ cat: 'Flyer', param: 'Position', current: current.flyer.position.toUpperCase(), def: def.flyer.position.toUpperCase() });
        }
        if (current.flyer.spin !== def.flyer.spin) {
            diffs.push({ cat: 'Flyer', param: 'Spin Mode', current: String(current.flyer.spin).toUpperCase(), def: String(def.flyer.spin).toUpperCase() });
        }
        if (Math.abs((current.flyer.spinSpeed ?? 1.0) - def.flyer.spinSpeed) > 0.05) {
            diffs.push({ cat: 'Flyer', param: 'Spin Speed', current: `${Number(current.flyer.spinSpeed).toFixed(1)}x`, def: `${def.flyer.spinSpeed.toFixed(1)}x` });
        }
        if (Math.abs((current.flyer.scale ?? 0.85) - def.flyer.scale) > 0.04) {
            diffs.push({ cat: 'Flyer', param: 'Scale', current: `${Number(current.flyer.scale).toFixed(2)}x`, def: `${def.flyer.scale.toFixed(2)}x` });
        }

        // Scene FX Speed & Handover diffs
        const curSpeed = current.fx?.speed ?? 1.0;
        if (Math.abs(curSpeed - (def.fx?.speed ?? 1.0)) > 0.04) {
            diffs.push({ cat: 'Scene FX', param: 'Effect Speed', current: `${Number(curSpeed).toFixed(2)}x`, def: '1.00x' });
        }
        if (Number(sceneIndex) === 3) {
            const curHandover = current.fx?.handoverThreshold ?? 85;
            if (Math.abs(curHandover - (def.fx?.handoverThreshold ?? 85)) >= 1) {
                diffs.push({ cat: 'Scene FX', param: 'Handover', current: `${curHandover}%`, def: '85%' });
            }
        }

        // Macro Faders diffs
        if (Math.abs(current.macro.gain - def.macro.gain) > 0.05) {
            diffs.push({ cat: 'Macro', param: 'Bass Gain', current: `${current.macro.gain.toFixed(1)}x`, def: `${def.macro.gain.toFixed(1)}x` });
        }
        if (Math.abs(current.macro.sens - def.macro.sens) > 0.05) {
            diffs.push({ cat: 'Macro', param: 'Sensitivity', current: `${current.macro.sens.toFixed(1)}x`, def: `${def.macro.sens.toFixed(1)}x` });
        }
        if (Math.abs(current.macro.bloom - def.macro.bloom) > 0.04) {
            diffs.push({ cat: 'Macro', param: 'Bloom Glow', current: `${current.macro.bloom.toFixed(2)}x`, def: `${def.macro.bloom.toFixed(2)}x` });
        }

        // Lighting / Hue & DMX diffs
        if (current.lighting.hueSync !== def.lighting.hueSync) {
            diffs.push({ cat: 'Lighting', param: 'Hue Sync', current: current.lighting.hueSync ? 'ON' : 'OFF', def: def.lighting.hueSync ? 'ON' : 'OFF' });
        }
        if (current.lighting.hueMode !== def.lighting.hueMode) {
            diffs.push({ cat: 'Lighting', param: 'Hue Mode', current: current.lighting.hueMode, def: def.lighting.hueMode });
        }
        if (Math.abs((current.lighting.hueIntensity ?? 100) - def.lighting.hueIntensity) >= 5) {
            diffs.push({ cat: 'Lighting', param: 'Hue Intensity', current: `${current.lighting.hueIntensity}%`, def: `${def.lighting.hueIntensity}%` });
        }
        if (Math.abs((current.lighting.dmxMaster ?? 100) - def.lighting.dmxMaster) >= 5) {
            diffs.push({ cat: 'Lighting', param: 'DMX Master', current: `${current.lighting.dmxMaster}%`, def: `${def.lighting.dmxMaster}%` });
        }

        return {
            isCustom: diffs.length > 0,
            diffCount: diffs.length,
            diffs
        };
    },

    isCustomized(sceneIndex) {
        return this.getDiff(sceneIndex).isCustom;
    }
};

SceneProfileManager.init();
